import { Types } from 'mongoose';
import { Badge } from '../models/Badge.js';
import { Goal } from '../models/Goal.js';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { Group } from '../models/Group.js';
import { Integration } from '../models/Integration.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
import { LearningContent } from '../models/LearningContent.js';
import { GroupChallenge } from '../models/GroupChallenge.js';
import { logger } from '../config/logger.js';
import {
  BADGES,
  BADGE_BY_KEY,
  TIER_RANK,
  type BadgeContext,
  type BadgeDef,
} from './badgeCatalog.js';
import { emitNotification } from './notificationService.js';

export interface BadgeJSON {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number; // 0..1
}

export async function buildBadgeContext(userId: string): Promise<BadgeContext> {
  const userObjId = new Types.ObjectId(userId);

  const [
    goals,
    distinctAcceptedIds,
    submissionStats,
    languagesArr,
    integrationsCount,
    extractedAgg,
    groupsOwned,
    contents,
    challenges,
  ] = await Promise.all([
    Goal.find({ userId: userObjId }).select('status streak actualMinutes').lean(),
    Submission.distinct('problemId', { userId: userObjId, status: 'accepted' }),
    Submission.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
          },
        },
      },
    ]),
    Submission.distinct('language', { userId: userObjId }),
    Integration.countDocuments({ userId: userObjId, isActive: true }),
    ExtractedSubmission.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: {
            $addToSet: { $cond: [{ $eq: ['$status', 'accepted'] }, '$problemId', '$$REMOVE'] },
          },
        },
      },
    ]),
    Group.find({ admin: userObjId }).select('members').lean(),
    LearningContent.find({ userId: userObjId }).select('bestPercentage').lean(),
    GroupChallenge.find({
      'responses.userId': userObjId,
      resolvedAt: { $ne: null },
    })
      .select('responses')
      .lean(),
  ]);

  // Goal aggregates
  const goalCount = goals.length;
  const goalsCompleted = goals.filter((g) => g.status === 'completed').length;
  const bestGoalStreak = goals.reduce((m, g) => Math.max(m, g.streak ?? 0), 0);
  const totalActualMinutes = goals.reduce((s, g) => s + (g.actualMinutes ?? 0), 0);

  // Solving aggregates
  const distinctSolved = distinctAcceptedIds.length;
  const totalSubmissions = submissionStats[0]?.total ?? 0;
  const acceptedSubmissions = submissionStats[0]?.accepted ?? 0;
  const languagesUsed = languagesArr.length;

  // Hard solved — join with Problem.difficulty
  let hardSolved = 0;
  if (distinctAcceptedIds.length > 0) {
    const ids = distinctAcceptedIds
      .filter((id) => id != null)
      .map((id) => new Types.ObjectId(id as any));
    const hardCount = await Problem.countDocuments({
      _id: { $in: ids },
      difficulty: 'Hard',
    });
    hardSolved = hardCount;
  }

  // Quizzes passed
  const quizzesPassed = contents.filter((c) => (c.bestPercentage ?? 0) >= 70).length;

  // Largest owned group
  const largestOwnedGroupSize = groupsOwned.reduce(
    (m, g: any) => Math.max(m, g.members?.length ?? 0),
    0
  );

  // Challenges won — count responses where this user got points
  let challengesWon = 0;
  for (const c of challenges) {
    const r = (c.responses as any[]).find((r) => String(r.userId) === userId);
    if (r?.isCorrect && (r.pointsAwarded ?? 0) > 0) challengesWon++;
  }

  // Extracted (external) solved — distinct problemIds with status=accepted
  const externalSolved =
    (extractedAgg[0]?.accepted ?? []).filter((x: string | null) => x != null).length;
  const extractedSubmissions = extractedAgg[0]?.total ?? 0;

  return {
    goalCount,
    goalsCompleted,
    bestGoalStreak,
    totalActualMinutes,
    distinctSolved,
    totalSubmissions,
    acceptedSubmissions,
    languagesUsed,
    hardSolved,
    quizzesPassed,
    integrationsConnected: integrationsCount,
    extractedSubmissions,
    externalSolved,
    groupsCreated: groupsOwned.length,
    largestOwnedGroupSize,
    challengesWon,
  };
}

interface CheckResult {
  badges: BadgeJSON[];
  newlyAwarded: BadgeJSON[];
  context: BadgeContext;
}

export async function checkAndAwardBadges(userId: string): Promise<CheckResult> {
  const context = await buildBadgeContext(userId);
  const earned = await Badge.find({ userId }).lean();
  const earnedMap = new Map(earned.map((b) => [b.key, b.earnedAt as Date]));

  const newlyAwarded: string[] = [];

  for (const def of BADGES) {
    if (earnedMap.has(def.key)) continue;
    let met = false;
    try {
      met = def.criteria(context);
    } catch (err) {
      logger.warn({ err, key: def.key }, 'badge criteria threw');
      continue;
    }
    if (met) newlyAwarded.push(def.key);
  }

  if (newlyAwarded.length > 0) {
    const now = new Date();
    try {
      await Badge.insertMany(
        newlyAwarded.map((key) => ({ userId, key, earnedAt: now })),
        { ordered: false }
      );
      for (const k of newlyAwarded) earnedMap.set(k, now);
    } catch (err) {
      // Likely duplicate-key races — ignore
      logger.debug({ err: (err as Error).message }, 'badge insert (some may have raced)');
      const refreshed = await Badge.find({ userId }).lean();
      earnedMap.clear();
      for (const b of refreshed) earnedMap.set(b.key, b.earnedAt as Date);
    }

    // Emit a notification per newly-awarded badge (fire-and-forget).
    for (const key of newlyAwarded) {
      const def = BADGE_BY_KEY.get(key);
      if (!def) continue;
      void emitNotification({
        userId,
        type: 'badge_earned',
        title: `${def.icon} Achievement unlocked: ${def.name}`,
        message: def.description,
        icon: def.icon,
        link: `/profile/me`,
        priority: def.tier === 'platinum' ? 'high' : 'medium',
        metadata: { badgeKey: def.key, tier: def.tier },
      });
    }
  }

  const badges = BADGES.map((def) => toJson(def, context, earnedMap.get(def.key) ?? null));
  badges.sort((a, b) => sortBadge(a, b));

  return {
    badges,
    newlyAwarded: badges.filter((b) => newlyAwarded.includes(b.key)),
    context,
  };
}

/** Read-only — used for viewing someone else's profile (no mutation). */
export async function listEarnedBadges(userId: string): Promise<BadgeJSON[]> {
  const [context, earned] = await Promise.all([
    buildBadgeContext(userId),
    Badge.find({ userId }).lean(),
  ]);
  const earnedMap = new Map(earned.map((b) => [b.key, b.earnedAt as Date]));
  const out = BADGES.map((def) => toJson(def, context, earnedMap.get(def.key) ?? null));
  out.sort((a, b) => sortBadge(a, b));
  return out;
}

function toJson(def: BadgeDef, ctx: BadgeContext, earnedAt: Date | null): BadgeJSON {
  return {
    key: def.key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    tier: def.tier,
    category: def.category,
    earned: !!earnedAt,
    earnedAt: earnedAt ? earnedAt.toISOString() : null,
    progress: earnedAt ? 1 : def.progress ? def.progress(ctx) : def.criteria(ctx) ? 1 : 0,
  };
}

function sortBadge(a: BadgeJSON, b: BadgeJSON): number {
  // Earned first, then by tier desc, then by progress desc
  if (a.earned !== b.earned) return a.earned ? -1 : 1;
  if (a.earned && b.earned) {
    return new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime();
  }
  // both unearned — show closest-to-earning first
  return b.progress - a.progress;
}

export const BADGE_TIER_RANK = TIER_RANK;
export { BADGE_BY_KEY };
