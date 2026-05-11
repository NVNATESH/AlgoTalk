import { Types } from 'mongoose';
import { Contest, contestToJSON } from '../models/Contest.js';
import { UserContest } from '../models/UserContest.js';
import { ContestReport, contestReportToJSON } from '../models/ContestReport.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { geminiJSON } from './gemini.js';
import { contestAnalysisPrompt } from '../prompts/contestAnalysis.js';
import { sanitizeResources } from './learningResourceService.js';
import { syncUpcomingContests } from './contestAggregator.js';
import { computeOverview } from './analyzerService.js';

export async function listUpcoming(opts: { platform?: string; limit?: number } = {}) {
  const filter: Record<string, unknown> = { startTime: { $gt: new Date() } };
  if (opts.platform) filter.platform = opts.platform;
  const limit = Math.min(50, Math.max(1, opts.limit ?? 30));
  const contests = await Contest.find(filter).sort({ startTime: 1 }).limit(limit).lean();
  return contests.map(contestToJSON);
}

export async function listLive(opts: { platform?: string } = {}) {
  const now = new Date();
  const filter: Record<string, unknown> = {
    startTime: { $lte: now },
    endTime: { $gte: now },
  };
  if (opts.platform) filter.platform = opts.platform;
  const contests = await Contest.find(filter).sort({ startTime: -1 }).limit(20).lean();
  return contests.map(contestToJSON);
}

export async function listMyRegistrations(userId: string) {
  const userObjId = new Types.ObjectId(userId);
  const regs = await UserContest.find({ userId: userObjId }).sort({ createdAt: -1 }).lean();
  if (regs.length === 0) return [];
  const contestIds = regs.map((r: any) => r.contestId);
  const contests = await Contest.find({ _id: { $in: contestIds } }).lean();
  const byId = new Map(contests.map((c: any) => [String(c._id), c]));
  return regs
    .map((r: any) => {
      const c = byId.get(String(r.contestId));
      if (!c) return null;
      return {
        registration: {
          id: String(r._id),
          status: r.status,
          rank: r.rank,
          score: r.score,
          ratingChange: r.ratingChange,
          reportId: r.reportId ? String(r.reportId) : null,
          createdAt: r.createdAt,
        },
        contest: contestToJSON(c),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function registerForContest(userId: string, contestId: string) {
  if (!Types.ObjectId.isValid(contestId)) throw ApiError.notFound('Contest not found');
  const contest = await Contest.findById(contestId);
  if (!contest) throw ApiError.notFound('Contest not found');
  const userObjId = new Types.ObjectId(userId);
  const status = (contest.endTime as Date) < new Date() ? 'ended' : 'registered';
  const reg = await UserContest.findOneAndUpdate(
    { userId: userObjId, contestId: contest._id },
    { $setOnInsert: { userId: userObjId, contestId: contest._id, status } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return {
    registration: {
      id: String(reg!._id),
      status: reg!.status,
      rank: reg!.rank,
      score: reg!.score,
      ratingChange: reg!.ratingChange,
      reportId: reg!.reportId ? String(reg!.reportId) : null,
      createdAt: (reg as any).createdAt,
    },
    contest: contestToJSON(contest.toObject()),
  };
}

export async function unregisterFromContest(userId: string, contestId: string) {
  if (!Types.ObjectId.isValid(contestId)) throw ApiError.notFound('Contest not found');
  await UserContest.deleteOne({
    userId: new Types.ObjectId(userId),
    contestId: new Types.ObjectId(contestId),
  });
}

/**
 * Generate the AI contest report. Pulls the user's current submissions from
 * `UserContest`, the contest metadata, and the user's recent analyzer signals
 * to give the prompt enough context to be specific.
 */
export async function generateContestReport(userId: string, contestId: string, opts: { force?: boolean } = {}) {
  if (!Types.ObjectId.isValid(contestId)) throw ApiError.notFound('Contest not found');
  const userObjId = new Types.ObjectId(userId);
  const contestObjId = new Types.ObjectId(contestId);

  const [contest, reg] = await Promise.all([
    Contest.findById(contestObjId).lean(),
    UserContest.findOne({ userId: userObjId, contestId: contestObjId }),
  ]);
  if (!contest) throw ApiError.notFound('Contest not found');
  if (!reg) throw ApiError.badRequest('Not registered for this contest');

  if (!opts.force) {
    const existing = await ContestReport.findOne({
      userId: userObjId,
      contestId: contestObjId,
    }).lean();
    if (existing) return { report: contestReportToJSON(existing), cached: true };
  }

  // Build problem-by-problem context from the user's recorded submissions.
  const submissions = (reg.submissions ?? []) as Array<{
    problemIndex: string;
    verdict: string;
    timeFromStartSec: number;
    code?: string;
    language?: string;
  }>;
  const subsByProblem = new Map<string, typeof submissions>();
  for (const s of submissions) {
    const key = s.problemIndex;
    if (!subsByProblem.has(key)) subsByProblem.set(key, []);
    subsByProblem.get(key)!.push(s);
  }

  const problemsForPrompt = (contest.problems ?? []).map((p: any) => {
    const subs = subsByProblem.get(p.index) ?? [];
    const acSub = subs.find((s) => s.verdict === 'AC' || s.verdict === 'OK' || s.verdict === 'accepted');
    const wrongSub = subs.find((s) => s.verdict !== 'AC' && s.verdict !== 'OK' && s.verdict !== 'accepted');
    const userCode = acSub?.code ?? wrongSub?.code ?? null;
    return {
      index: p.index,
      title: p.title ?? p.index,
      difficulty: p.difficulty ?? '',
      tags: p.tags ?? [],
      status: (acSub
        ? 'AC'
        : subs.length > 0
          ? 'attempted'
          : 'not_attempted') as 'AC' | 'attempted' | 'not_attempted',
      attempts: subs.length,
      acTimeFromStartSec: acSub ? acSub.timeFromStartSec ?? null : null,
      firstWrongVerdict: wrongSub ? wrongSub.verdict : null,
      userCode: userCode ? userCode.slice(0, 2000) : null,
      language: acSub?.language ?? wrongSub?.language ?? null,
    };
  });

  // Pull recent analyzer signals for historical context.
  let strongTopics: string[] = [];
  let weakTopics: string[] = [];
  try {
    const overview = await computeOverview(userId);
    const tm = overview.topicMastery ?? [];
    strongTopics = tm
      .filter((t) => t.mastery >= 75 && t.attempted >= 3)
      .slice(0, 5)
      .map((t) => t.topic);
    weakTopics = tm
      .filter((t) => t.mastery < 50 && t.attempted >= 2)
      .slice(0, 5)
      .map((t) => t.topic);
  } catch (err) {
    logger.debug({ err: (err as Error).message }, 'analyzer overview unavailable for contest report');
  }

  // Recent rank history from prior UserContest records.
  const priors = await UserContest.find({
    userId: userObjId,
    rank: { $ne: null },
    contestId: { $ne: contestObjId },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('rank')
    .lean();
  const recentContestRanks = priors
    .map((p: any) => p.rank as number)
    .filter((n): n is number => typeof n === 'number');

  const prompt = contestAnalysisPrompt({
    platform: contest.platform,
    contestName: contest.name,
    durationMinutes: contest.durationMinutes ?? 0,
    rank: reg.rank ?? null,
    totalParticipants: null,
    score: reg.score ?? 0,
    problems: problemsForPrompt,
    recentContestRanks,
    strongTopics,
    weakTopics,
    rating: null,
  });

  let aiOut: any;
  try {
    // Flash, not Pro — the free-tier Pro quota is exhausted by other paths
    // and this prompt fits comfortably in flash's window.
    aiOut = await geminiJSON<any>(prompt);
  } catch (err) {
    logger.warn({ err: (err as Error).message, contestId }, 'contest report Gemini call failed');
    throw new ApiError(502, 'AI service unavailable — try again in a minute');
  }

  // Sanitize / clamp lengths defensively.
  const sanitized = {
    summary: typeof aiOut.summary === 'string' ? aiOut.summary.slice(0, 400) : '',
    whatHappened: typeof aiOut.whatHappened === 'string' ? aiOut.whatHappened.slice(0, 1200) : '',
    whatYouDidWell: Array.isArray(aiOut.whatYouDidWell) ? aiOut.whatYouDidWell.slice(0, 4) : [],
    whereYouStruggled: Array.isArray(aiOut.whereYouStruggled)
      ? aiOut.whereYouStruggled.slice(0, 5)
      : [],
    codeQualityNotes: Array.isArray(aiOut.codeQualityNotes)
      ? aiOut.codeQualityNotes.slice(0, 5)
      : [],
    howToImprove: Array.isArray(aiOut.howToImprove) ? aiOut.howToImprove.slice(0, 5) : [],
    whatToLearnNext: Array.isArray(aiOut.whatToLearnNext) ? aiOut.whatToLearnNext.slice(0, 4) : [],
    practicePlan7Days: Array.isArray(aiOut.practicePlan7Days)
      ? aiOut.practicePlan7Days.slice(0, 7)
      : [],
    predictedRatingChange:
      typeof aiOut.predictedRatingChange === 'string' ? aiOut.predictedRatingChange.slice(0, 80) : '',
    nextContestRecommendation:
      typeof aiOut.nextContestRecommendation === 'string'
        ? aiOut.nextContestRecommendation.slice(0, 200)
        : '',
    // Learning resources go through the same allowlist + dedupe used by code
    // review so a hallucinated link in one place can never leak into another.
    resources: sanitizeResources(aiOut.resources, { max: 6 }),
  };

  const saved = await ContestReport.findOneAndUpdate(
    { userId: userObjId, contestId: contestObjId },
    {
      $set: {
        userId: userObjId,
        contestId: contestObjId,
        userContestId: reg._id,
        ...sanitized,
        generatedBy: 'gemini-2.5-flash',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Mark the registration as analyzed and link the report.
  reg.status = 'analyzed';
  reg.reportId = saved!._id;
  await reg.save();

  return { report: contestReportToJSON(saved!.toObject()), cached: false };
}

export async function getReport(userId: string, contestId: string) {
  if (!Types.ObjectId.isValid(contestId)) return null;
  const userObjId = new Types.ObjectId(userId);
  const contestObjId = new Types.ObjectId(contestId);
  const [r, reg] = await Promise.all([
    ContestReport.findOne({ userId: userObjId, contestId: contestObjId }).lean(),
    UserContest.findOne({ userId: userObjId, contestId: contestObjId })
      .select('ratingChange rank score')
      .lean(),
  ]);
  if (!r) return null;
  return {
    ...contestReportToJSON(r),
    actualRatingChange: reg?.ratingChange ?? null,
    actualRank: reg?.rank ?? null,
    actualScore: reg?.score ?? null,
  };
}

export async function refreshUpcoming() {
  return syncUpcomingContests();
}
