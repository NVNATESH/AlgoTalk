import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

const GRAPHQL_URL = 'https://leetcode.com/graphql/';

interface LeetCodeProfile {
  username: string;
  realName: string;
  avatar: string;
  ranking: number | null;
  totalSolved: number;
  byDifficulty: { Easy: number; Medium: number; Hard: number };
  // Per-tag solved counts across the three LC tag categories. Useful to drive
  // weak-topic detection on the integration card without needing per-problem
  // enumeration (which LC's public API forbids for third-party users).
  tagCounts: { advanced: TagCount[]; intermediate: TagCount[]; fundamental: TagCount[] };
  // Active days in the trailing year + current streak (LC userCalendar).
  activeYears: number[];
  streak: number;
  totalActiveDays: number;
}

export interface TagCount {
  name: string;
  slug: string;
  problemsSolved: number;
}

interface LeetCodeSubmission {
  externalId: string;
  problemId: string; // titleSlug
  problemTitle: string;
  problemUrl: string;
  topics: string[]; // empty in this endpoint — LC doesn't include tags in recent submissions
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  status: 'accepted'; // public endpoint only returns AC
  language: string;
  submittedAt: Date;
  // For calendar-fallback rows this is the number of submissions made on that
  // day (1+). Per-problem rows leave it 1.
  count?: number;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // LeetCode rejects requests without a Referer or with a Node UA
      'User-Agent':
        'Mozilla/5.0 (compatible; LearnHub/0.1; +https://learnhub.example)',
      Referer: 'https://leetcode.com',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ status: res.status, text: text.slice(0, 200) }, 'leetcode gql non-2xx');
    throw new ApiError(502, `LeetCode returned ${res.status}`);
  }
  const body = (await res.json()) as { data?: T; errors?: any };
  if (body.errors) {
    logger.warn({ errors: body.errors }, 'leetcode gql errors');
    const msg = Array.isArray(body.errors) ? body.errors[0]?.message : 'GraphQL error';
    throw new ApiError(502, msg ?? 'LeetCode error');
  }
  if (!body.data) throw new ApiError(502, 'LeetCode returned no data');
  return body.data;
}

export async function fetchLeetCodeProfile(handle: string): Promise<LeetCodeProfile> {
  interface Resp {
    matchedUser:
      | {
          username: string;
          profile: { realName: string | null; ranking: number | null; userAvatar: string | null };
          submitStatsGlobal: {
            acSubmissionNum: Array<{ difficulty: string; count: number }>;
          };
          tagProblemCounts: {
            advanced: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
            intermediate: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
            fundamental: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
          } | null;
        }
      | null;
  }
  // Single combined query so we don't pay multiple round-trips. Calendar
  // (active years / streak) is fetched in a follow-up because requesting it
  // inline frequently triggers LC's anti-scrape rate limiter when the same
  // handle is re-synced; if the calendar query 429s we still return the rest.
  const data = await gql<Resp>(
    `
    query lhUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { realName ranking userAvatar }
        submitStatsGlobal { acSubmissionNum { difficulty count } }
        tagProblemCounts {
          advanced { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental { tagName tagSlug problemsSolved }
        }
      }
    }`,
    { username: handle }
  );
  if (!data.matchedUser) {
    throw ApiError.notFound(`LeetCode user "${handle}" not found`);
  }
  const stats = { Easy: 0, Medium: 0, Hard: 0 };
  let totalSolved = 0;
  for (const row of data.matchedUser.submitStatsGlobal.acSubmissionNum ?? []) {
    if (row.difficulty === 'All') totalSolved = row.count;
    else if (row.difficulty in stats) (stats as any)[row.difficulty] = row.count;
  }

  const tc = data.matchedUser.tagProblemCounts;
  const mapTags = (arr?: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>) =>
    (arr ?? [])
      .filter((t) => (t.problemsSolved ?? 0) > 0)
      .map((t) => ({
        name: t.tagName,
        slug: t.tagSlug,
        problemsSolved: t.problemsSolved,
      }));

  // Calendar (active years + streak). Failure here is non-fatal — same handle
  // already returned a 200 above, so an empty calendar means we just skip the
  // streak block.
  let activeYears: number[] = [];
  let streak = 0;
  let totalActiveDays = 0;
  try {
    const cal = await fetchLeetCodeCalendarStats(handle);
    activeYears = cal.activeYears;
    streak = cal.streak;
    totalActiveDays = cal.totalActiveDays;
  } catch (err) {
    logger.debug(
      { err: (err as Error).message, handle },
      'leetcode calendar stats unavailable'
    );
  }

  return {
    username: data.matchedUser.username,
    realName: data.matchedUser.profile.realName ?? '',
    avatar: data.matchedUser.profile.userAvatar ?? '',
    ranking: data.matchedUser.profile.ranking,
    totalSolved,
    byDifficulty: stats,
    tagCounts: {
      advanced: mapTags(tc?.advanced),
      intermediate: mapTags(tc?.intermediate),
      fundamental: mapTags(tc?.fundamental),
    },
    activeYears,
    streak,
    totalActiveDays,
  };
}

async function fetchLeetCodeCalendarStats(
  handle: string
): Promise<{ activeYears: number[]; streak: number; totalActiveDays: number }> {
  interface Resp {
    matchedUser: {
      userCalendar: {
        activeYears: number[];
        streak: number;
        totalActiveDays: number;
      } | null;
    } | null;
  }
  const data = await gql<Resp>(
    `
    query lhCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar { activeYears streak totalActiveDays }
      }
    }`,
    { username: handle }
  );
  const c = data?.matchedUser?.userCalendar;
  return {
    activeYears: c?.activeYears ?? [],
    streak: c?.streak ?? 0,
    totalActiveDays: c?.totalActiveDays ?? 0,
  };
}

// In-memory cache for per-problem metadata so we don't re-fetch on every sync.
// Keyed by titleSlug. 24h TTL is plenty — LC problem tags rarely change.
const META_TTL_MS = 24 * 60 * 60 * 1000;
const META_CACHE = new Map<
  string,
  { difficulty: 'easy' | 'medium' | 'hard' | 'unknown'; topics: string[]; fetchedAt: number }
>();
const META_FETCH_CONCURRENCY = 3;

async function withConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = META_FETCH_CONCURRENCY
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) break;
        results[i] = await worker(items[i]);
      }
    })
  );
  return results;
}

// LeetCode's `recentAcSubmissionList` is hard-capped at ~15 server-side; values
// above 20 are silently truncated. The full per-problem solved list is NOT
// publicly enumerable for arbitrary users — that data sits behind a session
// cookie. Use the LearnHub browser extension (frontend/extensions) to import
// the authoritative list when full coverage is required; everything below is
// the best the public GraphQL surface exposes.
export async function fetchLeetCodeRecentSubmissions(
  handle: string,
  limit = 20
): Promise<LeetCodeSubmission[]> {
  interface Resp {
    recentAcSubmissionList: Array<{
      id: string;
      title: string;
      titleSlug: string;
      timestamp: string;
      lang: string;
    }>;
  }
  const data = await gql<Resp>(
    `
    query lhRecentAc($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id title titleSlug timestamp lang
      }
    }`,
    { username: handle, limit }
  );
  const list = data.recentAcSubmissionList ?? [];

  // LeetCode privacy setting: many users have "Show submissions" disabled, in
  // which case `recentAcSubmissionList` returns [] even though their profile
  // shows hundreds of solved problems. Fall back to the public submission
  // calendar (`userCalendar.submissionCalendar`) so we can still populate the
  // heatmap and totals — one synthesized row per active day, marked accepted.
  if (list.length === 0) {
    try {
      const calendar = await fetchLeetCodeCalendarFallback(handle);
      if (calendar.length > 0) {
        logger.info(
          { handle, days: calendar.length },
          'leetcode: using calendar fallback (recent submissions hidden by privacy setting)'
        );
        return calendar;
      }
    } catch (err) {
      logger.debug({ err: (err as Error).message }, 'leetcode calendar fallback failed');
    }
  }

  // Enrich with per-problem difficulty + topic tags. Use cache for repeat slugs;
  // only fetch the ones we don't have (or whose entry has expired).
  const uniqueSlugs = Array.from(new Set(list.map((s) => s.titleSlug)));
  const now = Date.now();
  const slugsToFetch = uniqueSlugs.filter((slug) => {
    const cached = META_CACHE.get(slug);
    return !cached || now - cached.fetchedAt > META_TTL_MS;
  });

  if (slugsToFetch.length > 0) {
    await withConcurrency(slugsToFetch, async (slug) => {
      const meta = await fetchLeetCodeProblemMeta(slug);
      META_CACHE.set(slug, {
        difficulty: meta?.difficulty ?? 'unknown',
        topics: meta?.topics ?? [],
        fetchedAt: now,
      });
    });
  }

  return list.map((s) => {
    const meta = META_CACHE.get(s.titleSlug);
    return {
      externalId: s.id,
      problemId: s.titleSlug,
      problemTitle: s.title,
      problemUrl: `https://leetcode.com/problems/${s.titleSlug}/`,
      topics: meta?.topics ?? [],
      difficulty: meta?.difficulty ?? 'unknown',
      status: 'accepted' as const,
      language: s.lang,
      submittedAt: new Date(Number(s.timestamp) * 1000),
    };
  });
}

// Lightweight per-problem details (difficulty + tags). Optional batch — use sparingly.
export async function fetchLeetCodeProblemMeta(
  titleSlug: string
): Promise<{ difficulty: 'easy' | 'medium' | 'hard' | 'unknown'; topics: string[] } | null> {
  interface Resp {
    question: { difficulty: string | null; topicTags: Array<{ name: string }> } | null;
  }
  try {
    const data = await gql<Resp>(
      `
      query lhQuestion($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          difficulty
          topicTags { name }
        }
      }`,
      { titleSlug }
    );
    if (!data.question) return null;
    const diff = (data.question.difficulty ?? '').toLowerCase();
    return {
      difficulty:
        diff === 'easy' || diff === 'medium' || diff === 'hard'
          ? (diff as 'easy' | 'medium' | 'hard')
          : 'unknown',
      topics: normalizeTopics(data.question.topicTags?.map((t) => t.name) ?? []),
    };
  } catch {
    return null;
  }
}

/**
 * Calendar-based fallback for LeetCode users who have hidden their submissions
 * via the "Show submissions" privacy toggle. We can still pull the daily
 * activity calendar from the matchedUser query — it gives us a `{epoch: count}`
 * map of every day they submitted on, which lets us populate the unified
 * heatmap and the running submission count even though we can't enumerate
 * individual problems.
 *
 * Each day becomes a single synthesized row labeled "LeetCode activity (N
 * submissions)" so it's clear in the recent-submissions list that these are
 * aggregates rather than per-problem entries.
 */
async function fetchLeetCodeCalendarFallback(
  handle: string
): Promise<LeetCodeSubmission[]> {
  interface Resp {
    matchedUser: {
      userCalendar: {
        submissionCalendar: string;
      } | null;
    } | null;
  }
  const data = await gql<Resp>(
    `
    query lhUserCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar { submissionCalendar }
      }
    }`,
    { username: handle }
  );
  const raw = data?.matchedUser?.userCalendar?.submissionCalendar;
  if (!raw) return [];
  let parsed: Record<string, number>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const out: LeetCodeSubmission[] = [];
  for (const [epochStr, countStr] of Object.entries(parsed)) {
    const epoch = Number(epochStr);
    const count = Number(countStr);
    if (!Number.isFinite(epoch) || !Number.isFinite(count) || count <= 0) continue;
    const submittedAt = new Date(epoch * 1000);
    const dayKey = submittedAt.toISOString().slice(0, 10);
    out.push({
      // Stable id keeps re-syncs idempotent (one row per user per day).
      externalId: `lc-day:${handle}:${dayKey}`,
      problemId: `lc-day:${dayKey}`,
      problemTitle: `LeetCode activity (${count} submission${count === 1 ? '' : 's'})`,
      problemUrl: `https://leetcode.com/u/${handle}/`,
      topics: [],
      difficulty: 'unknown',
      // Calendar only counts submissions, not verdicts. Mark them accepted so
      // they count toward "active days" and don't poison the WA/TLE bucket.
      status: 'accepted',
      language: '',
      submittedAt,
      // The calendar gives us N submissions for this day — record it so
      // downstream aggregators show the correct total instead of counting one
      // submission per active day.
      count,
    });
  }
  // Sort newest first so the recent-submissions feed shows latest day on top.
  out.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  return out;
}
