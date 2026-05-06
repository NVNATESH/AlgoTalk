import { Types } from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { Goal } from '../models/Goal.js';
import { LearningContent } from '../models/LearningContent.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';

export interface TopicMastery {
  topic: string;
  solved: number;
  attempted: number;
  acceptanceRate: number; // %
  mastery: number; // 0-100
  recentTrend: 'improving' | 'stable' | 'declining' | 'new';
}

export interface FailurePattern {
  status: string;
  count: number;
  pct: number;
}

export interface RatingBucket {
  /** Lower bound of the 100-point bucket, inclusive (e.g. 1500 means 1500-1599). */
  bucket: number;
  total: number;
  accepted: number;
}

export interface RatingDistribution {
  platform: 'codeforces';
  buckets: RatingBucket[]; // ordered ascending, only includes buckets with data
  maxAcceptedRating: number | null;
  ceiling: number | null; // user's hardest accepted rating (best estimate of skill ceiling)
  totalRated: number; // submissions with a numeric rating
  totalSolved: number; // distinct accepted problems with rating
}

export interface AnalyzerOverview {
  totals: {
    submissions: number;
    accepted: number;
    distinctSolved: number;
    acceptanceRate: number;
    avgAttemptsBeforeAccept: number | null;
    bestRuntimeMs: number | null;
    avgRuntimeMs: number | null;
  };
  topicMastery: TopicMastery[];
  peakHours: number[][]; // [day0..day6][hour0..hour23] = submission count
  peakHourMax: number;
  bestHourBucket: { day: number; hour: number; count: number } | null;
  failurePatterns: FailurePattern[];
  byLanguage: Array<{ language: string; count: number; accepted: number; acceptanceRate: number }>;
  attemptedProblems: number;
  unattempted: Array<{ slug: string; title: string; difficulty: string; tags: string[]; cfEquivRating: number | null }>;
  ratingDistribution: RatingDistribution | null;
}

export async function computeOverview(userId: string): Promise<AnalyzerOverview> {
  const userObjId = new Types.ObjectId(userId);

  const [allSubs, problems, learningContents, extracted] = await Promise.all([
    Submission.find({ userId: userObjId })
      .select('problemId status language runtimeMs createdAt')
      .sort({ createdAt: 1 })
      .lean(),
    Problem.find({}).select('_id slug title difficulty tags cfEquivRating').lean(),
    LearningContent.find({ userId: userObjId })
      .select('moduleId quiz bestPercentage')
      .lean(),
    ExtractedSubmission.find({ userId: userObjId })
      .select('platform problemId status language topics submittedAt rating')
      .sort({ submittedAt: 1 })
      .lean(),
  ]);

  const problemById = new Map<string, { slug: string; title: string; difficulty: string; tags: string[] }>();
  for (const p of problems) {
    problemById.set(String(p._id), {
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags ?? [],
    });
  }

  // Track: per-problem attempt count + first-accept-index
  const attemptCount = new Map<string, number>();
  const acceptedAt = new Map<string, number>(); // # of attempts before first accept
  const attemptedSet = new Set<string>();
  const failureByStatus = new Map<string, number>();
  const langStats = new Map<string, { count: number; accepted: number }>();
  const peakHours: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  let totalRuntimeMs = 0;
  let runtimeCount = 0;
  let bestRuntimeMs: number | null = null;

  for (const s of allSubs) {
    const pid = String(s.problemId);
    attemptedSet.add(pid);
    attemptCount.set(pid, (attemptCount.get(pid) ?? 0) + 1);

    const ls = langStats.get(s.language) ?? { count: 0, accepted: 0 };
    ls.count++;
    if (s.status === 'accepted') ls.accepted++;
    langStats.set(s.language, ls);

    if (s.status === 'accepted') {
      if (!acceptedAt.has(pid)) acceptedAt.set(pid, attemptCount.get(pid)!);
      if (typeof s.runtimeMs === 'number' && s.runtimeMs > 0) {
        totalRuntimeMs += s.runtimeMs;
        runtimeCount++;
        if (bestRuntimeMs === null || s.runtimeMs < bestRuntimeMs) bestRuntimeMs = s.runtimeMs;
      }
    } else {
      failureByStatus.set(s.status, (failureByStatus.get(s.status) ?? 0) + 1);
    }

    // peak hours
    const d = new Date(s.createdAt as Date);
    peakHours[d.getDay()][d.getHours()]++;
  }

  // External (extracted) submissions — keyed as `platform:problemId` so they don't
  // collide with internal Mongo ObjectIds in attemptedSet/acceptedAt.
  const externalAttemptedSet = new Set<string>();
  const externalAcceptedSet = new Set<string>();
  const externalTopicAttempted = new Map<string, Set<string>>();
  const externalTopicAccepted = new Map<string, Set<string>>();
  for (const e of extracted) {
    const pid = `${e.platform}:${e.problemId}`;
    externalAttemptedSet.add(pid);
    attemptCount.set(pid, (attemptCount.get(pid) ?? 0) + 1);

    if (e.language) {
      const ls = langStats.get(e.language) ?? { count: 0, accepted: 0 };
      ls.count++;
      if (e.status === 'accepted') ls.accepted++;
      langStats.set(e.language, ls);
    }

    if (e.status === 'accepted') {
      externalAcceptedSet.add(pid);
      if (!acceptedAt.has(pid)) acceptedAt.set(pid, attemptCount.get(pid)!);
      for (const t of e.topics ?? []) {
        if (!externalTopicAttempted.has(t)) externalTopicAttempted.set(t, new Set());
        externalTopicAttempted.get(t)!.add(pid);
        if (!externalTopicAccepted.has(t)) externalTopicAccepted.set(t, new Set());
        externalTopicAccepted.get(t)!.add(pid);
      }
    } else {
      failureByStatus.set(e.status, (failureByStatus.get(e.status) ?? 0) + 1);
      for (const t of e.topics ?? []) {
        if (!externalTopicAttempted.has(t)) externalTopicAttempted.set(t, new Set());
        externalTopicAttempted.get(t)!.add(pid);
      }
    }

    const d = new Date(e.submittedAt as Date);
    peakHours[d.getDay()][d.getHours()]++;
  }

  // Topic mastery
  const topicAttempted = new Map<string, Set<string>>(); // topic → set of problem ids attempted
  const topicAccepted = new Map<string, Set<string>>(); // topic → set of accepted problem ids
  for (const pid of attemptedSet) {
    const info = problemById.get(pid);
    if (!info) continue;
    for (const t of info.tags) {
      if (!topicAttempted.has(t)) topicAttempted.set(t, new Set());
      topicAttempted.get(t)!.add(pid);
      if (acceptedAt.has(pid)) {
        if (!topicAccepted.has(t)) topicAccepted.set(t, new Set());
        topicAccepted.get(t)!.add(pid);
      }
    }
  }
  // Merge in external topic stats — external topics use normalized strings from
  // the extractor topic map, so they share the same namespace as Problem.tags.
  for (const [topic, pids] of externalTopicAttempted.entries()) {
    if (!topicAttempted.has(topic)) topicAttempted.set(topic, new Set());
    const dest = topicAttempted.get(topic)!;
    for (const pid of pids) dest.add(pid);
  }
  for (const [topic, pids] of externalTopicAccepted.entries()) {
    if (!topicAccepted.has(topic)) topicAccepted.set(topic, new Set());
    const dest = topicAccepted.get(topic)!;
    for (const pid of pids) dest.add(pid);
  }
  // Augment with quiz scores per topic from LearningContent — boost mastery if user passed related quizzes
  // (For now we just use code submission data — quiz integration can come later.)
  void learningContents;

  // Topic-level totals from Problem collection
  const topicTotal = new Map<string, number>();
  for (const p of problems) {
    for (const t of p.tags ?? []) {
      topicTotal.set(t, (topicTotal.get(t) ?? 0) + 1);
    }
  }

  // Recent trend: split submissions per topic into "first half" vs "second half" by date — improving if more accepts in second
  const halfMs = (() => {
    const totalActivity = allSubs.length + extracted.length;
    if (totalActivity < 4) return null;
    const firstInternal = allSubs[0]?.createdAt as Date | undefined;
    const lastInternal = allSubs[allSubs.length - 1]?.createdAt as Date | undefined;
    const firstExternal = extracted[0]?.submittedAt as Date | undefined;
    const lastExternal = extracted[extracted.length - 1]?.submittedAt as Date | undefined;
    const firstCandidates = [firstInternal, firstExternal].filter(Boolean) as Date[];
    const lastCandidates = [lastInternal, lastExternal].filter(Boolean) as Date[];
    if (firstCandidates.length === 0 || lastCandidates.length === 0) return null;
    const first = Math.min(...firstCandidates.map((d) => d.getTime()));
    const last = Math.max(...lastCandidates.map((d) => d.getTime()));
    if (last === first) return null;
    return first + (last - first) / 2;
  })();
  const topicAcceptedFirstHalf = new Map<string, number>();
  const topicAcceptedSecondHalf = new Map<string, number>();
  if (halfMs !== null) {
    const seenAccepted = new Set<string>();
    for (const s of allSubs) {
      if (s.status !== 'accepted') continue;
      const pid = String(s.problemId);
      if (seenAccepted.has(pid)) continue;
      seenAccepted.add(pid);
      const info = problemById.get(pid);
      if (!info) continue;
      const t = new Date(s.createdAt as Date).getTime();
      const which = t < halfMs ? topicAcceptedFirstHalf : topicAcceptedSecondHalf;
      for (const tag of info.tags) {
        which.set(tag, (which.get(tag) ?? 0) + 1);
      }
    }
    for (const e of extracted) {
      if (e.status !== 'accepted') continue;
      const pid = `${e.platform}:${e.problemId}`;
      if (seenAccepted.has(pid)) continue;
      seenAccepted.add(pid);
      const t = new Date(e.submittedAt as Date).getTime();
      const which = t < halfMs ? topicAcceptedFirstHalf : topicAcceptedSecondHalf;
      for (const tag of e.topics ?? []) {
        which.set(tag, (which.get(tag) ?? 0) + 1);
      }
    }
  }

  const topicMastery: TopicMastery[] = Array.from(topicAttempted.entries())
    .map(([topic, attemptedSet2]) => {
      const accepted = topicAccepted.get(topic)?.size ?? 0;
      const attempted = attemptedSet2.size;
      // Bump total to at least `attempted` so external solves can't push coverage
      // past 1 when a topic has more external solves than internal catalog problems.
      const total = Math.max(topicTotal.get(topic) ?? 0, attempted);
      const acceptanceRate = attempted === 0 ? 0 : Math.round((accepted / attempted) * 100);
      const coverage = total === 0 ? 0 : Math.min(accepted / total, 1);
      // Mastery: 70% from coverage of available problems, 30% from acceptance rate
      const mastery = Math.round((coverage * 0.7 + (acceptanceRate / 100) * 0.3) * 100);

      const firstAcc = topicAcceptedFirstHalf.get(topic) ?? 0;
      const secondAcc = topicAcceptedSecondHalf.get(topic) ?? 0;
      let trend: TopicMastery['recentTrend'] = 'stable';
      if (firstAcc === 0 && secondAcc === 0) trend = 'new';
      else if (secondAcc > firstAcc) trend = 'improving';
      else if (secondAcc < firstAcc) trend = 'declining';

      return {
        topic,
        solved: accepted,
        attempted,
        acceptanceRate,
        mastery,
        recentTrend: trend,
      };
    })
    .sort((a, b) => b.mastery - a.mastery);

  // Attempts before accept — average across all accepted problems
  const attemptsBefore = Array.from(acceptedAt.values());
  const avgAttemptsBeforeAccept =
    attemptsBefore.length === 0
      ? null
      : Number((attemptsBefore.reduce((s, x) => s + x, 0) / attemptsBefore.length).toFixed(2));

  // Failure patterns
  const totalFailures = Array.from(failureByStatus.values()).reduce((s, x) => s + x, 0);
  const failurePatterns: FailurePattern[] = Array.from(failureByStatus.entries())
    .map(([status, count]) => ({
      status,
      count,
      pct: totalFailures === 0 ? 0 : Math.round((count / totalFailures) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // By language
  const byLanguage = Array.from(langStats.entries())
    .map(([language, s]) => ({
      language,
      count: s.count,
      accepted: s.accepted,
      acceptanceRate: s.count === 0 ? 0 : Math.round((s.accepted / s.count) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Best hour bucket
  let bestHourBucket: AnalyzerOverview['bestHourBucket'] = null;
  let peakHourMax = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const c = peakHours[d][h];
      if (c > peakHourMax) {
        peakHourMax = c;
        bestHourBucket = { day: d, hour: h, count: c };
      }
    }
  }

  // Unattempted problems (suggestions)
  const unattempted = problems
    .filter((p) => !attemptedSet.has(String(p._id)))
    .map((p: any) => ({
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags ?? [],
      cfEquivRating: typeof p.cfEquivRating === 'number' ? p.cfEquivRating : null,
    }));

  // Totals — fold internal + external
  const acceptedCount = acceptedAt.size; // distinct (already merged)
  const internalAccepted = allSubs.filter((s) => s.status === 'accepted').length;
  const externalAccepted = extracted.filter((e) => e.status === 'accepted').length;
  const acceptedSubs = internalAccepted + externalAccepted;
  const totalSubs = allSubs.length + extracted.length;

  // Codeforces rating distribution (CF is the only platform with a numeric
  // problem rating). Bucketed by 100 points, e.g. 1500 → bucket "1500-1599".
  const ratingDistribution: RatingDistribution | null = (() => {
    const cfRated = extracted.filter(
      (e: any) => e.platform === 'codeforces' && typeof e.rating === 'number'
    );
    if (cfRated.length === 0) return null;
    const bucketTotal = new Map<number, number>();
    const bucketAcceptedProblems = new Map<number, Set<string>>();
    let maxAcceptedRating: number | null = null;
    const acceptedProblemKeys = new Set<string>();
    for (const e of cfRated as Array<any>) {
      const bucket = Math.floor(e.rating / 100) * 100;
      bucketTotal.set(bucket, (bucketTotal.get(bucket) ?? 0) + 1);
      if (e.status === 'accepted') {
        const key = `${e.platform}:${e.problemId}`;
        if (!bucketAcceptedProblems.has(bucket)) {
          bucketAcceptedProblems.set(bucket, new Set());
        }
        bucketAcceptedProblems.get(bucket)!.add(key);
        if (!acceptedProblemKeys.has(key)) {
          acceptedProblemKeys.add(key);
          if (maxAcceptedRating === null || e.rating > maxAcceptedRating) {
            maxAcceptedRating = e.rating;
          }
        }
      }
    }
    const buckets: RatingBucket[] = Array.from(bucketTotal.keys())
      .sort((a, b) => a - b)
      .map((bucket) => ({
        bucket,
        total: bucketTotal.get(bucket)!,
        accepted: bucketAcceptedProblems.get(bucket)?.size ?? 0,
      }));
    return {
      platform: 'codeforces' as const,
      buckets,
      maxAcceptedRating,
      ceiling: maxAcceptedRating,
      totalRated: cfRated.length,
      totalSolved: acceptedProblemKeys.size,
    };
  })();

  return {
    totals: {
      submissions: totalSubs,
      accepted: acceptedSubs,
      distinctSolved: acceptedCount,
      acceptanceRate: totalSubs === 0 ? 0 : Math.round((acceptedSubs / totalSubs) * 100),
      avgAttemptsBeforeAccept,
      bestRuntimeMs,
      avgRuntimeMs: runtimeCount === 0 ? null : Math.round(totalRuntimeMs / runtimeCount),
    },
    topicMastery,
    peakHours,
    peakHourMax,
    bestHourBucket,
    failurePatterns,
    byLanguage,
    attemptedProblems: attemptedSet.size + externalAttemptedSet.size,
    unattempted,
    ratingDistribution,
  };
}

export interface CfRatingZone {
  ceiling: number; // highest rating ever accepted
  comfortBand: { low: number; high: number; acceptanceRate: number } | null; // widest range with ≥70% acceptance
  growthBand: { low: number; high: number; acceptanceRate: number } | null; // first 200-pt zone above comfortBand where they're struggling
  totalSolved: number;
}

export interface ProgressContext {
  totalSolved: number;
  totalProblems: number;
  acceptanceRate: number;
  byDifficulty: { Easy: { solved: number; total: number }; Medium: { solved: number; total: number }; Hard: { solved: number; total: number } };
  topicMastery: TopicMastery[];
  byLanguage: Array<{ language: string; count: number; acceptanceRate: number }>;
  goalsActive: number;
  goalsCompleted: number;
  cfRatingZone: CfRatingZone | null;
}

/**
 * From a CF rating histogram, compute the user's comfort band (where they're
 * consistently solving) and the growth band just above it (where they should
 * be picking next problems from). Returns null when there isn't enough signal.
 */
export function deriveCfRatingZone(
  distribution: RatingDistribution | null
): CfRatingZone | null {
  if (!distribution || distribution.ceiling === null) return null;
  const buckets = distribution.buckets;
  if (buckets.length === 0) return null;

  // Comfort = widest contiguous run of buckets with ≥3 attempts and ≥70%
  // acceptance. Among ties, prefer the highest-rated run (further along).
  let bestRun: { low: number; high: number; total: number; accepted: number } | null = null;
  let curr: { low: number; high: number; total: number; accepted: number } | null = null;
  const isComfort = (b: { total: number; accepted: number }) =>
    b.total >= 3 && b.accepted / b.total >= 0.7;

  const closeRun = () => {
    if (!curr) return;
    if (
      !bestRun ||
      curr.high - curr.low > bestRun.high - bestRun.low ||
      (curr.high - curr.low === bestRun.high - bestRun.low && curr.high > bestRun.high)
    ) {
      bestRun = curr;
    }
    curr = null;
  };

  for (const b of buckets) {
    if (isComfort(b)) {
      if (!curr) curr = { low: b.bucket, high: b.bucket, total: b.total, accepted: b.accepted };
      else {
        curr.high = b.bucket;
        curr.total += b.total;
        curr.accepted += b.accepted;
      }
    } else {
      closeRun();
    }
  }
  closeRun();

  const comfortBand = bestRun
    ? {
        low: (bestRun as { low: number; high: number; total: number; accepted: number }).low,
        high: (bestRun as { low: number; high: number; total: number; accepted: number }).high,
        acceptanceRate: Math.round(
          ((bestRun as { low: number; high: number; total: number; accepted: number }).accepted /
            (bestRun as { low: number; high: number; total: number; accepted: number }).total) *
            100
        ),
      }
    : null;

  // Growth = first 200-pt window above comfort top (or above ceiling if no comfort).
  const start = comfortBand ? comfortBand.high + 100 : Math.floor(distribution.ceiling / 100) * 100;
  const growthBuckets = buckets.filter((b) => b.bucket >= start && b.bucket < start + 300);
  const growthTotal = growthBuckets.reduce((s, b) => s + b.total, 0);
  const growthAccepted = growthBuckets.reduce((s, b) => s + b.accepted, 0);
  const growthBand =
    growthBuckets.length === 0
      ? null
      : {
          low: growthBuckets[0].bucket,
          high: growthBuckets[growthBuckets.length - 1].bucket,
          acceptanceRate:
            growthTotal === 0 ? 0 : Math.round((growthAccepted / growthTotal) * 100),
        };

  return {
    ceiling: distribution.ceiling,
    comfortBand,
    growthBand,
    totalSolved: distribution.totalSolved,
  };
}

export async function buildProgressContext(userId: string): Promise<ProgressContext> {
  const overview = await computeOverview(userId);
  const userObjId = new Types.ObjectId(userId);

  const [problemsByDifficulty, goalsAgg, externalSolvedByDiff] = await Promise.all([
    Problem.aggregate([{ $group: { _id: '$difficulty', count: { $sum: 1 } } }]),
    Goal.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ExtractedSubmission.aggregate([
      { $match: { userId: userObjId, status: 'accepted' } },
      { $group: { _id: { platform: '$platform', problemId: '$problemId', difficulty: '$difficulty' } } },
      { $group: { _id: '$_id.difficulty', count: { $sum: 1 } } },
    ]),
  ]);

  const totalsByDiff: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const r of problemsByDifficulty as Array<{ _id: string; count: number }>) {
    if (r._id in totalsByDiff) totalsByDiff[r._id] = r.count;
  }
  // Fold external accepted into both solved AND total per difficulty.
  const extDiffMap: Record<string, 'Easy' | 'Medium' | 'Hard'> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };
  const externalSolvedByDiffMap: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const r of externalSolvedByDiff as Array<{ _id: string; count: number }>) {
    const mapped = extDiffMap[r._id];
    if (mapped) externalSolvedByDiffMap[mapped] += r.count;
  }
  for (const k of ['Easy', 'Medium', 'Hard'] as const) {
    totalsByDiff[k] += externalSolvedByDiffMap[k];
  }

  // Need solved-by-difficulty
  const acceptedDocs = await Submission.aggregate([
    { $match: { userId: userObjId, status: 'accepted' } },
    { $group: { _id: '$problemId' } },
    { $lookup: { from: 'problems', localField: '_id', foreignField: '_id', as: 'p' } },
    { $unwind: '$p' },
    { $group: { _id: '$p.difficulty', count: { $sum: 1 } } },
  ]);
  const solvedByDiff: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const r of acceptedDocs as Array<{ _id: string; count: number }>) {
    if (r._id in solvedByDiff) solvedByDiff[r._id] = r.count;
  }
  for (const k of ['Easy', 'Medium', 'Hard'] as const) {
    solvedByDiff[k] += externalSolvedByDiffMap[k];
  }

  const goalsByStatus = new Map<string, number>();
  for (const r of goalsAgg as Array<{ _id: string; count: number }>) {
    goalsByStatus.set(r._id, r.count);
  }

  return {
    totalSolved: overview.totals.distinctSolved,
    totalProblems: (overview.totals.distinctSolved + overview.unattempted.length),
    acceptanceRate: overview.totals.acceptanceRate,
    byDifficulty: {
      Easy: { solved: solvedByDiff.Easy, total: totalsByDiff.Easy },
      Medium: { solved: solvedByDiff.Medium, total: totalsByDiff.Medium },
      Hard: { solved: solvedByDiff.Hard, total: totalsByDiff.Hard },
    },
    topicMastery: overview.topicMastery,
    byLanguage: overview.byLanguage.map((l) => ({
      language: l.language,
      count: l.count,
      acceptanceRate: l.acceptanceRate,
    })),
    goalsActive: goalsByStatus.get('active') ?? 0,
    goalsCompleted: goalsByStatus.get('completed') ?? 0,
    cfRatingZone: deriveCfRatingZone(overview.ratingDistribution),
  };
}
