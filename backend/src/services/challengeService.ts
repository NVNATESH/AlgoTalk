import { Types } from 'mongoose';
import { GroupChallenge, challengeToJSON } from '../models/GroupChallenge.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
import { Integration, type Platform } from '../models/Integration.js';
import { ApiError } from '../utils/ApiError.js';
import { assertMember } from './groupService.js';
import { emitNotification, emitNotifications } from './notificationService.js';
import { parseExternalUrl, isExtractablePlatform } from '../extractors/urlParser.js';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PostCodingInput {
  type: 'coding';
  title: string;
  description?: string;
  points: number;
  deadlineHours?: number;
  problemSlug?: string;
  externalUrl?: string;
  externalPlatform?:
    | 'leetcode'
    | 'codeforces'
    | 'codechef'
    | 'hackerrank'
    | 'gfg'
    | 'atcoder'
    | 'hackerearth'
    | 'custom';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
}

interface PostAptitudeInput {
  type: 'aptitude';
  title: string;
  description?: string;
  points: number;
  deadlineHours?: number;
  questionImageUrl?: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export type PostInput = PostCodingInput | PostAptitudeInput;

export async function postChallenge(userId: string, groupId: string, input: PostInput) {
  await assertMember(userId, groupId);

  // Parse external URL if provided so we can auto-verify later
  let externalProblemId: string | null = null;
  let externalVerifiable = false;
  let resolvedExternalPlatform: string | null = null;
  if (input.type === 'coding' && input.externalUrl) {
    const parsed = parseExternalUrl(input.externalUrl);
    if (parsed) {
      externalProblemId = parsed.problemId;
      externalVerifiable = parsed.verifiable;
      resolvedExternalPlatform = parsed.platform;
    } else {
      // Allow custom URLs but require explicit platform
      if (!input.externalPlatform || input.externalPlatform === 'custom') {
        resolvedExternalPlatform = 'custom';
      } else {
        resolvedExternalPlatform = input.externalPlatform;
      }
    }
  } else if (input.type === 'coding') {
    resolvedExternalPlatform = null;
  }

  if (input.type === 'coding') {
    if (!input.problemSlug && !input.externalUrl) {
      throw ApiError.badRequest('Provide a problem slug or an external URL');
    }
    if (input.problemSlug) {
      const problem = await Problem.findOne({ slug: input.problemSlug }).select('_id').lean();
      if (!problem) throw ApiError.badRequest('Internal problem slug not found');
    }
  } else {
    if (!input.options?.A || !input.options?.B || !input.options?.C || !input.options?.D) {
      throw ApiError.badRequest('All four options A–D are required');
    }
    if (!['A', 'B', 'C', 'D'].includes(input.correctAnswer)) {
      throw ApiError.badRequest('correctAnswer must be A, B, C, or D');
    }
  }

  const hours = Math.min(Math.max(input.deadlineHours ?? 24, 1), 168); // 1h to 7 days
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const doc = await GroupChallenge.create({
    groupId,
    createdBy: userId,
    type: input.type,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    points: input.points,
    problemSlug: input.type === 'coding' ? input.problemSlug ?? null : null,
    externalUrl: input.type === 'coding' ? input.externalUrl ?? null : null,
    externalPlatform: input.type === 'coding' ? resolvedExternalPlatform : null,
    externalProblemId: input.type === 'coding' ? externalProblemId : null,
    externalVerifiable: input.type === 'coding' ? externalVerifiable : false,
    difficulty: input.type === 'coding' ? input.difficulty ?? null : null,
    tags: input.type === 'coding' ? input.tags ?? [] : [],
    questionImageUrl: input.type === 'aptitude' ? input.questionImageUrl ?? null : null,
    options: input.type === 'aptitude' ? input.options : undefined,
    correctAnswer: input.type === 'aptitude' ? input.correctAnswer : null,
    expiresAt,
    responses: [],
  });

  // Notify everyone in the group EXCEPT the creator
  try {
    const { Group } = await import('../models/Group.js');
    const group = await Group.findById(groupId).select('members name icon').lean();
    if (group) {
      const recipients = (group.members ?? [])
        .map((m: any) => String(m.userId))
        .filter((id: string) => id !== userId);
      if (recipients.length > 0) {
        const typeLabel = input.type === 'coding' ? 'coding' : 'aptitude';
        const deadlineLabel = hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`;
        void emitNotifications(recipients, {
          type: 'challenge_posted',
          title: `New ${typeLabel} challenge in ${group.icon ?? '👥'} ${group.name}`,
          message: `"${input.title.trim()}" · ${input.points} pts · ${deadlineLabel} to win`,
          icon: '📢',
          link: `/groups/${groupId}`,
          priority: 'medium',
          metadata: { groupId, challengeId: String(doc._id), points: input.points },
        });
      }
    }
  } catch {
    // ignore — notification fan-out failure must not break the post
  }

  const creator = await User.findById(userId).select('username').lean();
  const enriched = { ...doc.toObject(), _createdByUsername: creator?.username ?? 'unknown' };
  return challengeToJSON(enriched, userId);
}

async function hydrateCreatorUsernames(docs: any[]): Promise<any[]> {
  const creatorIds = [...new Set(docs.map((d) => String(d.createdBy)))];
  const users = await User.find({ _id: { $in: creatorIds } }).select('username').lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.username]));
  return docs.map((d) => ({ ...d, _createdByUsername: nameMap.get(String(d.createdBy)) ?? 'unknown' }));
}

export async function listChallenges(userId: string, groupId: string) {
  await assertMember(userId, groupId);

  const docs = await GroupChallenge.find({ groupId }).sort({ createdAt: -1 }).lean();

  // Lazy-resolve any expired-but-unresolved
  const resolvedDocs = await Promise.all(
    docs.map(async (d) => {
      if (!d.resolvedAt && new Date(d.expiresAt) <= new Date()) {
        await resolveChallenge(d._id);
        const reloaded = await GroupChallenge.findById(d._id).lean();
        return reloaded ?? d;
      }
      return d;
    })
  );

  const hydratedDocs = await hydrateCreatorUsernames(resolvedDocs);

  return hydratedDocs.map((d) => challengeToJSON(d, userId));
}

export async function getChallenge(userId: string, challengeId: string) {
  if (!Types.ObjectId.isValid(challengeId)) throw ApiError.notFound('Challenge not found');
  let doc = await GroupChallenge.findById(challengeId).lean();
  if (!doc) throw ApiError.notFound('Challenge not found');
  await assertMember(userId, String(doc.groupId));

  if (!doc.resolvedAt && new Date(doc.expiresAt) <= new Date()) {
    await resolveChallenge(doc._id);
    doc = (await GroupChallenge.findById(challengeId).lean()) ?? doc;
  }
  return challengeToJSON(doc, userId);
}

export async function respondAptitude(
  userId: string,
  challengeId: string,
  selectedOption: 'A' | 'B' | 'C' | 'D'
) {
  if (!Types.ObjectId.isValid(challengeId)) throw ApiError.notFound('Challenge not found');
  const challenge = await GroupChallenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound('Challenge not found');
  await assertMember(userId, String(challenge.groupId));

  if (challenge.type !== 'aptitude') throw ApiError.badRequest('Not an aptitude challenge');
  if (new Date(challenge.expiresAt) <= new Date()) {
    throw ApiError.badRequest('This challenge has expired');
  }

  const already = challenge.responses.find((r: any) => String(r.userId) === userId);
  if (already) throw ApiError.badRequest('You have already submitted an answer (no edits allowed)');

  challenge.responses.push({
    userId: new Types.ObjectId(userId) as any,
    submittedAt: new Date(),
    selectedOption,
    solved: false,
    pointsAwarded: 0,
    isCorrect: false,
  } as any);
  await challenge.save();

  return challengeToJSON(challenge.toObject(), userId);
}

/**
 * For external coding challenges with a parseable URL on a platform we extract
 * from (LeetCode / Codeforces): scan ExtractedSubmission for each group member's
 * accepted-in-window solves of this problem. Award points to anyone who matches.
 *
 * Mutates `challenge.responses` in place — caller must save.
 */
async function applyExternalVerification(challenge: any): Promise<void> {
  if (!challenge.externalProblemId || !challenge.externalPlatform) return;
  const platform = challenge.externalPlatform as Platform;

  const { Group } = await import('../models/Group.js');
  const group = await Group.findById(challenge.groupId).select('members').lean();
  const memberIds = (group?.members ?? []).map((m: any) => new Types.ObjectId(m.userId));
  if (memberIds.length === 0) return;

  // Find all extracted submissions that match this problem from any group member
  // in the challenge window. Match on (userId, platform, problemId, status, submittedAt).
  const matches = await ExtractedSubmission.find({
    userId: { $in: memberIds },
    platform,
    problemId: challenge.externalProblemId,
    status: 'accepted',
    submittedAt: {
      $gte: challenge.createdAt as any,
      $lte: challenge.expiresAt as any,
    },
  })
    .select('userId submittedAt')
    .lean();

  if (matches.length === 0) return;

  // Per-user — first matching solve wins
  const winnerByUser = new Map<string, Date>();
  for (const m of matches) {
    const k = String(m.userId);
    const t = new Date(m.submittedAt as Date);
    const existing = winnerByUser.get(k);
    if (!existing || t < existing) winnerByUser.set(k, t);
  }

  const existingByUser = new Map<string, any>();
  for (const r of challenge.responses as any[]) {
    existingByUser.set(String(r.userId), r);
  }
  for (const [uid, when] of winnerByUser) {
    let entry = existingByUser.get(uid);
    if (!entry) {
      entry = {
        userId: new Types.ObjectId(uid),
        submittedAt: when,
        selectedOption: null,
        solved: true,
        pointsAwarded: challenge.points,
        isCorrect: true,
      };
      (challenge.responses as any[]).push(entry);
      existingByUser.set(uid, entry);
    } else {
      entry.solved = true;
      entry.isCorrect = true;
      entry.pointsAwarded = challenge.points;
      entry.submittedAt = when;
    }
  }
}

/**
 * Lazy resolution. Walks the responses and computes points/correctness once expired.
 * For aptitude: compares submitted choice to correctAnswer.
 * For coding (internal slug): scans accepted submissions for each member of the group
 *   between createdAt and expiresAt. If found, awards points; if any submission attempted
 *   (even WA) the user counts toward "problem count" for accuracy.
 * For coding (external URL): scans ExtractedSubmission for matching accepted solves.
 */
async function resolveChallenge(challengeId: Types.ObjectId): Promise<void> {
  const challenge = await GroupChallenge.findById(challengeId);
  if (!challenge) return;
  if (challenge.resolvedAt) return;
  if (new Date(challenge.expiresAt) > new Date()) return;

  if (challenge.type === 'aptitude') {
    for (const r of challenge.responses as any[]) {
      const correct = r.selectedOption && r.selectedOption === challenge.correctAnswer;
      r.isCorrect = !!correct;
      r.pointsAwarded = correct ? challenge.points : 0;
    }
  } else {
    // Coding — internal problem only for slice 1
    if (challenge.problemSlug) {
      const problem = await Problem.findOne({ slug: challenge.problemSlug }).select('_id').lean();
      if (problem) {
        // For each member of the group, check if they had ANY submission in window
        const { Group } = await import('../models/Group.js');
        const group = await Group.findById(challenge.groupId).select('members').lean();
        const memberIds = (group?.members ?? []).map((m: any) => m.userId);

        const allSubs = await Submission.find({
          userId: { $in: memberIds },
          problemId: problem._id,
          createdAt: { $gte: challenge.createdAt as any, $lte: challenge.expiresAt as any },
        })
          .select('userId status')
          .lean();

        // bucket: per user → { attempted, accepted }
        const stat = new Map<string, { attempted: boolean; accepted: boolean }>();
        for (const s of allSubs) {
          const k = String(s.userId);
          const cur = stat.get(k) ?? { attempted: false, accepted: false };
          cur.attempted = true;
          if (s.status === 'accepted') cur.accepted = true;
          stat.set(k, cur);
        }

        // Build response objects per member who has any activity (or already had a response slot)
        const existingByUser = new Map<string, any>();
        for (const r of challenge.responses as any[]) {
          existingByUser.set(String(r.userId), r);
        }
        for (const [uid, s] of stat) {
          let entry = existingByUser.get(uid);
          if (!entry) {
            entry = {
              userId: new Types.ObjectId(uid),
              submittedAt: new Date(),
              selectedOption: null,
              solved: false,
              pointsAwarded: 0,
              isCorrect: false,
            };
            (challenge.responses as any[]).push(entry);
            existingByUser.set(uid, entry);
          }
          entry.solved = s.accepted;
          entry.isCorrect = s.accepted; // for accuracy calc
          entry.pointsAwarded = s.accepted ? challenge.points : 0;
        }
      }
    }
    // External coding — auto-verify via ExtractedSubmission scan
    if (
      challenge.externalUrl &&
      challenge.externalProblemId &&
      challenge.externalVerifiable &&
      challenge.externalPlatform &&
      isExtractablePlatform(challenge.externalPlatform as Platform)
    ) {
      await applyExternalVerification(challenge);
    }
    // For non-verifiable external platforms (e.g. GFG/HackerEarth — anything we
    // don't have an extractor for), responses remain whatever was manually
    // recorded — no auto-resolution.
  }

  challenge.resolvedAt = new Date();
  await challenge.save();

  // Award XP to the user model for points earned (capped at 50 XP per challenge)
  for (const r of challenge.responses as any[]) {
    if (r.pointsAwarded > 0) {
      const xp = Math.min(50, Math.floor(r.pointsAwarded * 5));
      await User.updateOne({ _id: r.userId }, { $inc: { xp } }).catch(() => {});
    }
  }

  // Notify winners
  for (const r of challenge.responses as any[]) {
    if (r.pointsAwarded > 0) {
      void emitNotification({
        userId: String(r.userId),
        type: 'challenge_won',
        title: `🏅 You won "${challenge.title}"`,
        message: `Earned ${r.pointsAwarded} pts in your group challenge`,
        icon: '🏅',
        link: `/groups/${challenge.groupId}`,
        priority: 'medium',
        metadata: {
          groupId: String(challenge.groupId),
          challengeId: String(challenge._id),
          points: r.pointsAwarded,
        },
      });
    }
  }
}

export async function getLeaderboard(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');

  // Lazy-resolve all expired challenges in this group first
  const expired = await GroupChallenge.find({
    groupId,
    resolvedAt: null,
    expiresAt: { $lte: new Date() },
  })
    .select('_id')
    .lean();
  await Promise.all(expired.map((c) => resolveChallenge(c._id)));

  const challenges = await GroupChallenge.find({ groupId, resolvedAt: { $ne: null } })
    .select('responses points')
    .lean();

  // Per-user aggregation
  const stat = new Map<
    string,
    { points: number; problems: number; correct: number }
  >();
  for (const c of challenges) {
    for (const r of (c.responses ?? []) as any[]) {
      const k = String(r.userId);
      const s = stat.get(k) ?? { points: 0, problems: 0, correct: 0 };
      s.points += r.pointsAwarded ?? 0;
      s.problems += 1;
      if (r.isCorrect) s.correct += 1;
      stat.set(k, s);
    }
  }

  const userIds = Array.from(stat.keys());
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select('username name profilePic level')
        .lean()
    : [];
  const userMap = new Map(users.map((u) => [String(u._id), u] as const));

  const rows = userIds.map((uid) => {
    const s = stat.get(uid)!;
    const u = userMap.get(uid);
    return {
      userId: uid,
      username: u?.username ?? '(unknown)',
      name: u?.name ?? '(unknown)',
      profilePic: u?.profilePic ?? '',
      level: u?.level ?? 'Beginner',
      points: s.points,
      problemsAttempted: s.problems,
      correct: s.correct,
      accuracy: s.problems === 0 ? 0 : Math.round((s.correct / s.problems) * 100),
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.accuracy - a.accuracy;
  });

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export async function deleteChallenge(userId: string, challengeId: string) {
  if (!Types.ObjectId.isValid(challengeId)) throw ApiError.notFound('Challenge not found');
  const challenge = await GroupChallenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound('Challenge not found');
  if (String(challenge.createdBy) !== userId) {
    // also allow group admin
    const { Group } = await import('../models/Group.js');
    const group = await Group.findById(challenge.groupId).select('admin').lean();
    if (!group || String(group.admin) !== userId) {
      throw ApiError.forbidden('Only the creator or group admin can delete a challenge');
    }
  }
  await GroupChallenge.deleteOne({ _id: challengeId });
}

/**
 * On-demand verification of an external coding challenge solve for the calling user.
 *
 * Flow:
 *  1. Force-sync the user's connected integration on that platform (so very-recent
 *     solves are picked up — no waiting for the 6h background scheduler).
 *  2. Scan ExtractedSubmission for an accepted match in the challenge window.
 *  3. If found, write a response on the challenge marking the user as solved and
 *     awarding points. (Resolution still happens on expiry — points may be locked
 *     in earlier this way, but won't be doubled.)
 *
 * Returns the (possibly-updated) challenge plus the verification outcome.
 */
export async function verifyExternalSolve(userId: string, challengeId: string) {
  if (!Types.ObjectId.isValid(challengeId)) throw ApiError.notFound('Challenge not found');
  const challenge = await GroupChallenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound('Challenge not found');
  await assertMember(userId, String(challenge.groupId));

  if (challenge.type !== 'coding' || !challenge.externalUrl) {
    throw ApiError.badRequest('This challenge is not an external coding challenge');
  }
  if (!challenge.externalProblemId || !challenge.externalVerifiable) {
    throw ApiError.badRequest(
      "We can't auto-verify this platform yet — connect a supported handle (LeetCode/Codeforces/CodeChef/HackerRank/AtCoder) and ask the poster to use a parseable URL."
    );
  }

  const platform = challenge.externalPlatform as Platform;
  const integration = await Integration.findOne({ userId, platform, isActive: true }).lean();
  if (!integration) {
    throw ApiError.badRequest(
      `Connect your ${platform} handle in /integrations first so we can verify your solves.`
    );
  }

  // Force-sync — bypasses the 5-minute cooldown by calling runSync directly via manualSync.
  // We swallow the cooldown error gracefully, then scan whatever we have.
  try {
    const { manualSync } = await import('./integrationService.js');
    await manualSync(userId, platform).catch((err: any) => {
      if (err?.message?.includes('Synced recently')) return;
      throw err;
    });
  } catch {
    // Sync may fail (network, rate limit) — proceed with whatever data we already have
  }

  const match = await ExtractedSubmission.findOne({
    userId: new Types.ObjectId(userId),
    platform,
    problemId: challenge.externalProblemId,
    status: 'accepted',
    submittedAt: {
      $gte: challenge.createdAt as any,
      $lte: challenge.expiresAt as any,
    },
  })
    .select('submittedAt')
    .sort({ submittedAt: 1 })
    .lean();

  if (!match) {
    const integ = await Integration.findOne({ userId, platform })
      .select('lastSyncAt lastSyncStatus')
      .lean();
    return {
      verified: false,
      message:
        'No accepted submission found for this problem in the challenge window yet. Solve it on the platform, then try again.',
      challenge: challengeToJSON(challenge.toObject(), userId),
      sync: {
        platform,
        lastSyncAt: integ?.lastSyncAt ? new Date(integ.lastSyncAt).toISOString() : null,
        lastSyncStatus: integ?.lastSyncStatus ?? null,
      },
    };
  }

  // Mark this user as solved on the challenge response list
  const existingByUser = new Map<string, any>();
  for (const r of challenge.responses as any[]) {
    existingByUser.set(String(r.userId), r);
  }
  let entry = existingByUser.get(userId);
  const alreadyAwarded = entry?.pointsAwarded > 0;
  if (!entry) {
    entry = {
      userId: new Types.ObjectId(userId),
      submittedAt: new Date(match.submittedAt as Date),
      selectedOption: null,
      solved: true,
      pointsAwarded: challenge.points,
      isCorrect: true,
    };
    (challenge.responses as any[]).push(entry);
  } else {
    entry.solved = true;
    entry.isCorrect = true;
    entry.pointsAwarded = challenge.points;
    entry.submittedAt = new Date(match.submittedAt as Date);
  }
  await challenge.save();

  // Award XP + send notification (only on first verification — avoid double-firing)
  if (!alreadyAwarded) {
    const xp = Math.min(50, Math.floor(challenge.points * 5));
    await User.updateOne({ _id: userId }, { $inc: { xp } }).catch(() => {});
    void emitNotification({
      userId,
      type: 'challenge_won',
      title: `🏅 Verified — you solved "${challenge.title}"`,
      message: `Picked up your solve from ${platform}. +${challenge.points} pts locked in.`,
      icon: '🏅',
      link: `/groups/${challenge.groupId}`,
      priority: 'medium',
      metadata: {
        groupId: String(challenge.groupId),
        challengeId: String(challenge._id),
        platform,
        externalProblemId: challenge.externalProblemId,
      },
    });
  }

  // Fresh integration row to surface `lastSyncAt` to the UI alongside the verify result.
  const updatedIntegration = await Integration.findOne({ userId, platform })
    .select('lastSyncAt lastSyncStatus')
    .lean();

  return {
    verified: true,
    message: `Found an accepted submission on ${platform} from ${new Date(match.submittedAt as Date).toLocaleString()}.`,
    challenge: challengeToJSON(challenge.toObject(), userId),
    sync: {
      platform,
      lastSyncAt: updatedIntegration?.lastSyncAt
        ? new Date(updatedIntegration.lastSyncAt).toISOString()
        : null,
      lastSyncStatus: updatedIntegration?.lastSyncStatus ?? null,
    },
  };
}
