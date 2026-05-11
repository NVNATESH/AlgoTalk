import { Types } from 'mongoose';
import {
  Integration,
  integrationToJSON,
  PLATFORM_LABELS,
  type Platform,
} from '../models/Integration.js';
import { ExtractedSubmission, extractedToJSON } from '../models/ExtractedSubmission.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { invalidateAnalyzerCache } from './analyzerService.js';
import {
  fetchLeetCodeProfile,
  fetchLeetCodeRecentSubmissions,
} from '../extractors/leetcode.js';
import {
  fetchCodeforcesProfile,
  fetchCodeforcesSubmissions,
} from '../extractors/codeforces.js';
import {
  fetchCodeChefProfile,
  fetchCodeChefRecent,
} from '../extractors/codechef.js';
import {
  fetchHackerRankProfile,
  fetchHackerRankRecent,
} from '../extractors/hackerrank.js';
import {
  fetchAtCoderProfile,
  fetchAtCoderSubmissions,
} from '../extractors/atcoder.js';
import { fetchGfgProfile, fetchGfgRecent } from '../extractors/gfg.js';
import {
  fetchHackerEarthProfile,
  fetchHackerEarthRecent,
} from '../extractors/hackerearth.js';
import { emitNotification } from './notificationService.js';

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 1 manual sync per platform every 5 minutes per user

export async function listIntegrations(userId: string) {
  const docs = await Integration.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(integrationToJSON);
}

export async function connect(
  userId: string,
  platform: Platform,
  handle: string
) {
  const trimmed = handle.trim();
  if (!trimmed) throw ApiError.badRequest('Handle is required');

  // Verify the handle exists by fetching profile (errors if user not found)
  const profile = await fetchProfile(platform, trimmed);

  const now = new Date();

  // Upsert integration (one per platform per user) and immediately do an initial sync
  const integration = await Integration.findOneAndUpdate(
    { userId, platform },
    {
      $set: {
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        rating: profile.rating,
        rank: profile.rank,
        extra: profile.extra ?? {},
        isActive: true,
      },
      $setOnInsert: { userId, platform, syncCount: 0, submissionCount: 0 },
    },
    { upsert: true, new: true }
  );

  // Initial sync — wrap in try so connect still succeeds if sync fails (we'll surface the error)
  try {
    const result = await runSync(integration._id, platform, profile.handle, userId);
    integration.lastSyncAt = now;
    integration.lastSyncStatus = 'ok';
    integration.lastSyncError = '';
    integration.syncCount = (integration.syncCount ?? 0) + 1;
    integration.submissionCount = result.totalAfterSync;
    integration.solvedCount = result.solvedCount;
    await integration.save();
  } catch (err) {
    integration.lastSyncStatus = 'failed';
    integration.lastSyncError = (err as Error).message ?? 'sync failed';
    await integration.save();
  }

  return integrationToJSON(integration.toObject());
}

export async function disconnect(userId: string, platform: Platform) {
  const integration = await Integration.findOne({ userId, platform });
  if (!integration) throw ApiError.notFound('Integration not found');
  await ExtractedSubmission.deleteMany({ integrationId: integration._id });
  await Integration.deleteOne({ _id: integration._id });
}

export async function manualSync(userId: string, platform: Platform) {
  const integration = await Integration.findOne({ userId, platform });
  if (!integration) throw ApiError.notFound('Integration not found');

  if (integration.lastSyncAt) {
    const elapsed = Date.now() - new Date(integration.lastSyncAt).getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      const wait = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
      throw ApiError.tooMany(
        `Synced recently — wait ${wait}s before syncing this platform again`
      );
    }
  }

  try {
    const result = await runSync(integration._id, platform, integration.handle, userId);
    integration.lastSyncAt = new Date();
    integration.lastSyncStatus = 'ok';
    integration.lastSyncError = '';
    integration.syncCount = (integration.syncCount ?? 0) + 1;
    integration.submissionCount = result.totalAfterSync;
    integration.solvedCount = result.solvedCount;
    await integration.save();

    // Notify only when there's actually something new
    if (result.inserted > 0) {
      void emitNotification({
        userId,
        type: 'sync_complete',
        title: `${platformDisplayName(platform)} sync — +${result.inserted} new`,
        message: `${result.totalAfterSync} submissions cached for @${integration.handle}`,
        icon: '🌐',
        link: `/integrations`,
        priority: 'low',
        metadata: { platform, handle: integration.handle, newSubmissions: result.inserted },
      });
    }

    return {
      integration: integrationToJSON(integration.toObject()),
      newSubmissions: result.inserted,
      total: result.totalAfterSync,
      solvedCount: result.solvedCount,
    };
  } catch (err) {
    integration.lastSyncAt = new Date();
    integration.lastSyncStatus = 'failed';
    integration.lastSyncError = (err as Error).message ?? 'sync failed';
    await integration.save();
    void emitNotification({
      userId,
      type: 'sync_failed',
      title: `${platformDisplayName(platform)} sync failed`,
      message: integration.lastSyncError.slice(0, 200),
      icon: '⚠️',
      link: `/integrations`,
      priority: 'high',
      metadata: { platform, handle: integration.handle },
    });
    throw err;
  }
}

function platformDisplayName(p: Platform): string {
  return PLATFORM_LABELS[p] ?? p;
}

async function runSync(
  integrationId: Types.ObjectId,
  platform: Platform,
  handle: string,
  userId: string
): Promise<{ inserted: number; totalAfterSync: number; solvedCount: number }> {
  const submissions = await fetchSubmissions(platform, handle);
  if (submissions.length === 0) {
    const total = await ExtractedSubmission.countDocuments({ integrationId });
    const solvedCount = await computeSolvedCount(integrationId, platform, handle);
    return { inserted: 0, totalAfterSync: total, solvedCount };
  }

  // Bulk upsert by (userId, platform, externalId)
  const userObjId = new Types.ObjectId(userId);
  const ops = submissions.map((s) => ({
    updateOne: {
      filter: { userId: userObjId, platform, externalId: s.externalId },
      update: {
        $set: {
          userId: userObjId,
          integrationId,
          platform,
          externalId: s.externalId,
          problemId: s.problemId,
          problemTitle: s.problemTitle,
          problemUrl: s.problemUrl,
          topics: s.topics,
          difficulty: s.difficulty,
          rating: 'rating' in s ? (s as any).rating : null,
          status: s.status,
          language: s.language,
          submittedAt: s.submittedAt,
          // Per-day aggregate rows (e.g. LeetCode calendar fallback) carry a
          // submission count > 1; default to 1 for normal per-problem rows.
          count: typeof (s as any).count === 'number' ? (s as any).count : 1,
        },
      },
      upsert: true,
    },
  }));

  let inserted = 0;
  try {
    const result = await ExtractedSubmission.bulkWrite(ops as any, { ordered: false });
    inserted = result.upsertedCount ?? 0;
  } catch (err) {
    logger.error({ err, platform, handle }, 'bulk upsert failed');
    throw new ApiError(500, 'Failed to persist extracted submissions');
  }

  if (inserted > 0) invalidateAnalyzerCache(userId);

  const total = await ExtractedSubmission.countDocuments({ integrationId });
  const solvedCount = await computeSolvedCount(integrationId, platform, handle);
  return { inserted, totalAfterSync: total, solvedCount };
}

/**
 * Authoritative count of distinct *solved* problems for an integration.
 *
 * Why two paths:
 *   - Codeforces / CodeChef / AtCoder / HackerEarth expose their full
 *     submission history publicly, so the local cache (count of unique
 *     problemId where status='accepted') is exact and we trust it.
 *   - LeetCode / GFG / HackerRank gate per-problem enumeration behind login
 *     (LC) or have a partial public surface (HR/GFG). Their *profile pages*
 *     however expose the headline "X problems solved" number — we treat that
 *     as the source of truth and use the local distinct count only as a
 *     lower-bound fallback if the profile read failed.
 *
 * Both are computed and we keep the larger — so an integration that has a
 * full local cache AND a profile total will never report less than either.
 */
async function computeSolvedCount(
  integrationId: Types.ObjectId,
  platform: Platform,
  handle: string
): Promise<number> {
  // Local: distinct accepted problemIds in the cache. Aggregation runs in Mongo
  // so we don't pull thousands of docs into Node just to count.
  const localAgg = await ExtractedSubmission.aggregate<{ _id: null; n: number }>([
    { $match: { integrationId, status: 'accepted' } },
    { $group: { _id: '$problemId' } },
    { $count: 'n' },
  ]);
  const localDistinct = localAgg[0]?.n ?? 0;

  // Profile-reported total (best-effort; failures fall through to local).
  let profileTotal = 0;
  try {
    profileTotal = await fetchProfileSolvedTotal(platform, handle);
  } catch (err) {
    logger.debug(
      { err: (err as Error).message, platform, handle },
      'profile-total fetch failed; falling back to local distinct count',
    );
  }

  return Math.max(localDistinct, profileTotal);
}

async function fetchProfileSolvedTotal(platform: Platform, handle: string): Promise<number> {
  switch (platform) {
    case 'leetcode': {
      // `acSubmissionNum.All` (totalSolved) is the headline number on the LC
      // profile — authoritative even when recentAcSubmissionList is hidden.
      const p = await fetchLeetCodeProfile(handle);
      return p.totalSolved ?? 0;
    }
    case 'gfg': {
      // GFG's Next.js JSON exposes total_problems_solved directly.
      const p = await fetchGfgProfile(handle);
      return p.totalSolved ?? 0;
    }
    case 'hackerrank': {
      // HR doesn't expose a single "solved" total — sum per-track solved
      // counts from the scores endpoint (already fetched on profile read).
      const p = await fetchHackerRankProfile(handle);
      return (p.scores ?? []).reduce(
        (sum, s) => sum + (typeof s.solvedCount === 'number' ? s.solvedCount : 0),
        0,
      );
    }
    case 'hackerearth': {
      const p = await fetchHackerEarthProfile(handle);
      return p.totalSolved ?? 0;
    }
    // For platforms with full enumerable history, the local distinct count IS
    // the authoritative number — return 0 so Math.max picks local.
    case 'codeforces':
    case 'codechef':
    case 'atcoder':
    default:
      return 0;
  }
}

async function fetchProfile(platform: Platform, handle: string) {
  switch (platform) {
    case 'leetcode': {
      const p = await fetchLeetCodeProfile(handle);
      return {
        handle: p.username,
        displayName: p.realName || p.username,
        avatarUrl: p.avatar,
        rating: p.ranking,
        rank: p.ranking ? `Rank #${p.ranking.toLocaleString()}` : '',
        extra: {
          byDifficulty: p.byDifficulty,
          totalSolved: p.totalSolved,
          tagCounts: p.tagCounts,
          activeYears: p.activeYears,
          streak: p.streak,
          totalActiveDays: p.totalActiveDays,
        },
      };
    }
    case 'codeforces': {
      const p = await fetchCodeforcesProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank,
        extra: { maxRating: p.maxRating },
      };
    }
    case 'codechef': {
      const p = await fetchCodeChefProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank || p.stars,
        extra: {
          maxRating: p.maxRating,
          stars: p.stars,
          countryRank: p.countryRank,
          globalRank: p.globalRank,
        },
      };
    }
    case 'hackerrank': {
      const p = await fetchHackerRankProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank,
        extra: {
          totalStars: p.totalStars,
          badges: p.badges,
          scores: p.scores,
          certificationCount: p.certificationCount,
          certifications: p.certifications,
        },
      };
    }
    case 'atcoder': {
      const p = await fetchAtCoderProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank,
        extra: {},
      };
    }
    case 'gfg': {
      const p = await fetchGfgProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank,
        extra: { totalSolved: p.totalSolved },
      };
    }
    case 'hackerearth': {
      const p = await fetchHackerEarthProfile(handle);
      return {
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        rating: p.rating,
        rank: p.rank,
        extra: { totalSolved: p.totalSolved },
      };
    }
    default: {
      const _exhaustive: never = platform;
      throw ApiError.badRequest(`Unsupported platform: ${_exhaustive}`);
    }
  }
}

async function fetchSubmissions(platform: Platform, handle: string) {
  switch (platform) {
    case 'leetcode':
      // The recent-AC list caps at 15 entries; the calendar fallback returns
      // every active day. Either way the per-call limit isn't the bottleneck.
      return fetchLeetCodeRecentSubmissions(handle, 50);
    case 'codeforces':
      // CF API permits ~10k entries per call; we page internally in 1000s and
      // early-stop on a short page. 50000 covers anyone alive — only the very
      // top of the rating curve has more than that, and the loop terminates
      // long before the cap for everyone else.
      return fetchCodeforcesSubmissions(handle, 50000);
    case 'codechef':
      // 1000 pages × ~10 rows each. CodeChef self-reports `max_page` and the
      // loop early-stops there, so this is a high safety ceiling rather than
      // an actual fetch volume — typical users finish in 10–30 pages.
      return fetchCodeChefRecent(handle, 1000);
    case 'hackerrank':
      // 5000 paginated via offset; HR deprecated the deep submission feed
      // for many handles, so the loop usually terminates well before the cap.
      // Per-track scores + badges still populate via fetchProfile regardless.
      return fetchHackerRankRecent(handle, 5000);
    case 'atcoder':
      // AtCoder via Kenkoooo returns one row per submission. 50k beats the
      // deepest known competitive-programmer histories.
      return fetchAtCoderSubmissions(handle, 50000);
    case 'gfg':
      return fetchGfgRecent(handle);
    case 'hackerearth':
      return fetchHackerEarthRecent(handle);
    default: {
      const _exhaustive: never = platform;
      throw ApiError.badRequest(`Unsupported platform: ${_exhaustive}`);
    }
  }
}

/**
 * One row per connected platform showing the most recent submission. Drives
 * the "what's the latest pulse on each site?" widget on the recommendations
 * page — distinct from `listIntegrations` (which only knows when we last
 * *synced* the account, not when the user last *did* anything).
 */
export async function getLastSubmissionPerPlatform(userId: string) {
  const integrations = await Integration.find({ userId }).lean();
  if (integrations.length === 0) return [];

  const userObjId = new Types.ObjectId(userId);
  const rows = await ExtractedSubmission.aggregate([
    { $match: { userId: userObjId } },
    { $sort: { submittedAt: -1 } },
    {
      $group: {
        _id: '$platform',
        last: { $first: '$$ROOT' },
        totalCount: { $sum: 1 },
        acceptedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
        },
      },
    },
  ]);

  const lastByPlatform = new Map(rows.map((r: any) => [r._id, r]));

  return integrations.map((i: any) => {
    const row = lastByPlatform.get(i.platform);
    const last = row?.last;
    const daysSince = last
      ? Math.floor((Date.now() - new Date(last.submittedAt).getTime()) / 86_400_000)
      : null;
    return {
      platform: i.platform,
      handle: i.handle,
      displayName: i.displayName,
      avatarUrl: i.avatarUrl,
      rating: i.rating,
      rank: i.rank,
      isActive: i.isActive,
      lastSyncAt: i.lastSyncAt ? new Date(i.lastSyncAt).toISOString() : null,
      submissionCount: row?.totalCount ?? 0,
      acceptedCount: row?.acceptedCount ?? 0,
      // Headline stat for the integration card. Distinct accepted problems —
      // matches what each platform displays as the user's "solved" total.
      solvedCount: i.solvedCount ?? 0,
      lastSubmission: last
        ? {
            problemId: last.problemId,
            problemTitle: last.problemTitle,
            problemUrl: last.problemUrl,
            status: last.status,
            difficulty: last.difficulty,
            language: last.language,
            submittedAt: new Date(last.submittedAt).toISOString(),
            daysSince,
          }
        : null,
    };
  });
}

/**
 * Daily activity counts across ALL platforms for the trailing N days.
 * Returns a sparse map keyed by `YYYY-MM-DD` — frontend fills the gaps
 * when rendering the heatmap grid.
 */
export async function getCrossPlatformHeatmap(
  userId: string,
  days = 365
): Promise<{
  days: Array<{
    date: string;
    total: number;
    accepted: number;
    byPlatform: Record<string, number>;
  }>;
  totalSubmissions: number;
  totalAccepted: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
}> {
  const userObjId = new Types.ObjectId(userId);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const docs = await ExtractedSubmission.find({
    userId: userObjId,
    submittedAt: { $gte: since },
  })
    .select('platform status submittedAt count')
    .lean();

  const dayMap = new Map<
    string,
    { total: number; accepted: number; byPlatform: Record<string, number> }
  >();
  for (const d of docs) {
    const dt = new Date(d.submittedAt);
    const ymd = dt.toISOString().slice(0, 10);
    let entry = dayMap.get(ymd);
    if (!entry) {
      entry = { total: 0, accepted: 0, byPlatform: {} };
      dayMap.set(ymd, entry);
    }
    // Calendar-fallback rows (LeetCode hidden submissions) carry `count >= 1`
    // representing the day's actual submission count. Treat per-row count as
    // the number of submissions, not 1.
    const n = typeof (d as any).count === 'number' && (d as any).count > 0
      ? (d as any).count
      : 1;
    entry.total += n;
    if (d.status === 'accepted') entry.accepted += n;
    entry.byPlatform[d.platform] = (entry.byPlatform[d.platform] ?? 0) + n;
  }

  // Also include internal (in-platform) accepted submissions so the heatmap
  // is genuinely "everything the user has done", not just external scrapes.
  // We do this with a second aggregation against Submission to keep both
  // collections in one heatmap surface.
  const { Submission } = await import('../models/Submission.js');
  const internal = await Submission.find({
    userId: userObjId,
    createdAt: { $gte: since },
  })
    .select('status createdAt')
    .lean();
  for (const s of internal) {
    const ymd = new Date((s as any).createdAt).toISOString().slice(0, 10);
    let entry = dayMap.get(ymd);
    if (!entry) {
      entry = { total: 0, accepted: 0, byPlatform: {} };
      dayMap.set(ymd, entry);
    }
    entry.total++;
    if (s.status === 'accepted') entry.accepted++;
    entry.byPlatform.learnhub = (entry.byPlatform.learnhub ?? 0) + 1;
  }

  // Streak math — walk back from today over consecutive active days.
  const todayYmd = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  for (let i = 0; ; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const ymd = d.toISOString().slice(0, 10);
    if (i === 0 && !dayMap.has(ymd)) {
      // Today inactive — try yesterday before zeroing the streak so a fresh
      // morning before solving doesn't look like a broken streak.
      continue;
    }
    if (dayMap.has(ymd)) currentStreak++;
    else break;
    if (i > days) break;
  }

  // Longest streak — sweep all known active days, sorted ascending.
  const sortedDays = Array.from(dayMap.keys()).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ymd of sortedDays) {
    const d = new Date(`${ymd}T00:00:00Z`);
    if (prev && (d.getTime() - prev.getTime()) === 86_400_000) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  let totalSubmissions = 0;
  let totalAccepted = 0;
  for (const v of dayMap.values()) {
    totalSubmissions += v.total;
    totalAccepted += v.accepted;
  }

  // Build a dense range so the frontend doesn't have to fill gaps.
  const out: Array<{
    date: string;
    total: number;
    accepted: number;
    byPlatform: Record<string, number>;
  }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const ymd = d.toISOString().slice(0, 10);
    const entry = dayMap.get(ymd) ?? { total: 0, accepted: 0, byPlatform: {} };
    out.push({ date: ymd, ...entry });
  }

  return {
    days: out,
    totalSubmissions,
    totalAccepted,
    activeDays: dayMap.size,
    longestStreak,
    currentStreak,
  };
  // todayYmd retained for future use (e.g. highlighting "today" in the grid).
  void todayYmd;
}

export async function listSubmissions(
  userId: string,
  opts: { platform?: Platform; limit?: number; status?: string } = {}
) {
  const filter: Record<string, unknown> = { userId };
  if (opts.platform) filter.platform = opts.platform;
  if (opts.status) filter.status = opts.status;
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const docs = await ExtractedSubmission.find(filter)
    .sort({ submittedAt: -1 })
    .limit(limit)
    .lean();
  return docs.map(extractedToJSON);
}

export interface ExtractionStats {
  byPlatform: Record<string, { submissions: number; accepted: number; distinctSolved: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  byLanguage: Array<{ language: string; count: number }>;
  total: number;
}

/**
 * Platform-level summary used by the centralized Rewind dashboard. For each
 * connected platform we surface:
 *   - integration handle + last sync timestamp + active flag
 *   - distinct accepted count
 *   - difficulty distribution (Easy/Medium/Hard) — handles platforms where the
 *     extractor labels difficulty (LC) and those where rating buckets stand in (CF)
 *   - last-active timestamp (most recent accepted submission)
 *   - top 5 topics from accepted submissions
 *   - rating progression for CF (snapshot of recent solves)
 */
export interface PlatformDashboardEntry {
  platform: Platform;
  handle: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSolvedAt: string | null;
  distinctSolved: number;
  submissions: number;
  difficulty: { easy: number; medium: number; hard: number; unknown: number };
  topTopics: Array<{ topic: string; count: number }>;
  recentRatings: Array<{ submittedAt: string; rating: number; problemId: string }>;
  currentStreakDays: number;
}

export async function getPlatformDashboard(userId: string): Promise<PlatformDashboardEntry[]> {
  const integrations = await Integration.find({ userId }).lean();
  if (integrations.length === 0) return [];

  const docs = await ExtractedSubmission.find({ userId })
    .select('platform status difficulty topics submittedAt problemId rating')
    .lean();

  // Group docs by platform first so we don't scan O(n*p) times.
  const byPlatform = new Map<string, typeof docs>();
  for (const d of docs) {
    const arr = byPlatform.get(d.platform) ?? [];
    arr.push(d);
    byPlatform.set(d.platform, arr);
  }

  const out: PlatformDashboardEntry[] = [];
  for (const integ of integrations as any[]) {
    const platform = integ.platform as Platform;
    const list = byPlatform.get(platform) ?? [];
    const distinctAccepted = new Set<string>();
    const difficulty = { easy: 0, medium: 0, hard: 0, unknown: 0 };
    const topicAccepted = new Map<string, number>();
    let lastSolvedAt: Date | null = null;
    const recentRatings: Array<{ submittedAt: string; rating: number; problemId: string }> = [];
    let submissions = 0;

    for (const d of list as any[]) {
      const n = typeof d.count === 'number' && d.count > 0 ? d.count : 1;
      submissions += n;
      if (d.status === 'accepted') {
        if (!distinctAccepted.has(d.problemId)) {
          distinctAccepted.add(d.problemId);
          const key = (d.difficulty as 'easy' | 'medium' | 'hard' | 'unknown') ?? 'unknown';
          difficulty[key] += 1;
        }
        const t = new Date(d.submittedAt);
        if (!lastSolvedAt || t > lastSolvedAt) lastSolvedAt = t;
        for (const tp of d.topics ?? []) {
          topicAccepted.set(tp, (topicAccepted.get(tp) ?? 0) + 1);
        }
        if (typeof d.rating === 'number') {
          recentRatings.push({
            submittedAt: t.toISOString(),
            rating: d.rating,
            problemId: d.problemId,
          });
        }
      }
    }

    // Compute current streak — consecutive UTC days ending today with ≥1 accepted submission
    const acceptedDays = new Set<string>();
    for (const d of list as any[]) {
      if (d.status !== 'accepted') continue;
      const t = new Date(d.submittedAt);
      acceptedDays.add(
        `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(
          t.getUTCDate()
        ).padStart(2, '0')}`
      );
    }
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const ymd = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(
        cursor.getUTCDate()
      ).padStart(2, '0')}`;
      if (acceptedDays.has(ymd)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
      // Safety bound — never look back more than 1 year
      if (streak > 366) break;
    }

    out.push({
      platform,
      handle: integ.handle,
      isActive: !!integ.isActive,
      lastSyncAt: integ.lastSyncAt ? new Date(integ.lastSyncAt).toISOString() : null,
      lastSyncStatus: integ.lastSyncStatus ?? null,
      lastSolvedAt: lastSolvedAt ? lastSolvedAt.toISOString() : null,
      distinctSolved: distinctAccepted.size,
      submissions,
      difficulty,
      topTopics: Array.from(topicAccepted.entries())
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recentRatings: recentRatings.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)).slice(0, 50),
      currentStreakDays: streak,
    });
  }
  return out.sort((a, b) => b.distinctSolved - a.distinctSolved);
}

export async function getExtractionStats(userId: string): Promise<ExtractionStats> {
  const docs = await ExtractedSubmission.find({ userId })
    .select('platform status topics language problemId count')
    .lean();

  const byPlatform: ExtractionStats['byPlatform'] = {};
  const distinctByPlatform = new Map<string, Set<string>>();
  const topicCount = new Map<string, number>();
  const langCount = new Map<string, number>();

  for (const d of docs) {
    if (!byPlatform[d.platform]) {
      byPlatform[d.platform] = { submissions: 0, accepted: 0, distinctSolved: 0 };
      distinctByPlatform.set(d.platform, new Set());
    }
    // For platforms that store per-day aggregate rows (e.g. LeetCode calendar
    // fallback), `count` represents the number of submissions on that day —
    // so a single row with count=11 is 11 submissions, not 1. Defaults to 1.
    const n = typeof (d as any).count === 'number' && (d as any).count > 0
      ? (d as any).count
      : 1;
    byPlatform[d.platform].submissions += n;
    if (d.status === 'accepted') {
      byPlatform[d.platform].accepted += n;
      distinctByPlatform.get(d.platform)!.add(d.problemId);
    }
    for (const t of d.topics ?? []) {
      topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
    }
    if (d.language) langCount.set(d.language, (langCount.get(d.language) ?? 0) + 1);
  }

  for (const [p, set] of distinctByPlatform) {
    byPlatform[p].distinctSolved = set.size;
  }

  return {
    byPlatform,
    topTopics: Array.from(topicCount.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    byLanguage: Array.from(langCount.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count),
    total: docs.length,
  };
}
