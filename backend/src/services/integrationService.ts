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
): Promise<{ inserted: number; totalAfterSync: number }> {
  const submissions = await fetchSubmissions(platform, handle);
  if (submissions.length === 0) {
    const total = await ExtractedSubmission.countDocuments({ integrationId });
    return { inserted: 0, totalAfterSync: total };
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

  const total = await ExtractedSubmission.countDocuments({ integrationId });
  return { inserted, totalAfterSync: total };
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
        extra: { byDifficulty: p.byDifficulty, totalSolved: p.totalSolved },
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
        extra: { maxRating: p.maxRating, stars: p.stars },
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
        extra: {},
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
      // 5000 covers the deepest active CF careers (most users have <2000
      // submissions; the fetcher pages internally and stops on first short
      // page). Bumped from 200 so users with long histories sync fully.
      return fetchCodeforcesSubmissions(handle, 5000);
    case 'codechef':
      // 100 pages × ~10 rows = ~1000 most recent submissions. Internal early-
      // stop on dup ids / empty page kicks in well before the cap for most
      // users.
      return fetchCodeChefRecent(handle, 100);
    case 'hackerrank':
      return fetchHackerRankRecent(handle, 50);
    case 'atcoder':
      // AtCoder via Kenkoooo returns one row per submission; bump for users
      // with deep histories.
      return fetchAtCoderSubmissions(handle, 5000);
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
