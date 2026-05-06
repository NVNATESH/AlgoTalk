import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

/**
 * HackerRank extractor — uses HackerRank's public REST endpoints (no auth):
 *   - Profile:    GET /rest/contests/master/hackers/<handle>/profile
 *   - Recent:     GET /rest/hackers/<handle>/recent_challenges?limit=N
 *
 * `recent_challenges` returns at most ~30 items even when limit is higher;
 * HackerRank doesn't expose deep submission history publicly.
 *
 * Status: HackerRank's recent feed only surfaces solved challenges (the items
 * are the challenges the user has finished). We treat all of them as accepted.
 */

const BASE = 'https://www.hackerrank.com';

interface HackerRankProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
}

export interface HackerRankSubmission {
  externalId: string;
  problemId: string;
  problemTitle: string;
  problemUrl: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  status: 'accepted';
  language: string;
  submittedAt: Date;
}

async function hrGet<T>(path: string, handle?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      // HackerRank's edge gates simple Node UAs; mirror a real browser.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: handle
        ? `${BASE}/profile/${encodeURIComponent(handle)}`
        : 'https://www.hackerrank.com/',
    },
  });
  if (res.status === 404) {
    throw ApiError.notFound('HackerRank user not found');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ status: res.status, text: text.slice(0, 200) }, 'hackerrank non-2xx');
    throw new ApiError(502, `HackerRank returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchHackerRankProfile(handle: string): Promise<HackerRankProfile> {
  interface ProfileResp {
    model?: {
      username?: string;
      name?: string;
      avatar?: string;
      level?: number;
      country?: string;
      school?: string;
      company?: string;
      short_bio?: string;
    };
  }
  const data = await hrGet<ProfileResp>(
    `/rest/contests/master/hackers/${encodeURIComponent(handle)}/profile`,
    handle
  );
  if (!data.model || !data.model.username) {
    throw ApiError.notFound(`HackerRank user "${handle}" not found`);
  }
  const m = data.model;
  return {
    handle: m.username!,
    displayName: m.name ?? m.username!,
    avatarUrl: m.avatar ?? '',
    rating: null, // HR profile API doesn't expose a single global rating
    rank: m.level ? `Level ${m.level}` : '',
  };
}

interface HrRecentEntry {
  id?: number | string;
  ch_id?: number | string;
  slug?: string;
  name?: string;
  track_name?: string | null;
  track_slug?: string | null;
  contest_slug?: string | null;
  url?: string;
  language?: string;
  created_at?: string; // ISO
}

export async function fetchHackerRankRecent(
  handle: string,
  limit = 50
): Promise<HackerRankSubmission[]> {
  interface RecentResp {
    models?: HrRecentEntry[];
  }
  // HackerRank's recent_challenges endpoint is heavily rate-limited and frequently
  // returns 500 to public callers. We try both common path prefixes; if both fail,
  // we return [] rather than killing the sync — the profile portion still succeeds.
  const PATHS = [
    `/rest/hackers/${encodeURIComponent(handle)}/recent_challenges?limit=${limit}&offset=0`,
    `/rest/contests/master/hackers/${encodeURIComponent(handle)}/recent_challenges?limit=${limit}&offset=0`,
  ];
  let list: HrRecentEntry[] = [];
  let lastErr: Error | null = null;
  for (const path of PATHS) {
    try {
      const data = await hrGet<RecentResp>(path, handle);
      list = data.models ?? [];
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err as Error;
      logger.debug(
        { err: lastErr.message, path },
        'hackerrank recent endpoint failed, trying next'
      );
    }
  }
  // HackerRank deprecated their public submission feed; the endpoint now
  // returns 500 (DynamoDB BadRequest) for most users. We still try, but if
  // both paths fail with non-404 errors we log clearly so the user sees this
  // is HR's problem, not a bad handle.
  if (list.length === 0 && lastErr && !/not found/i.test(lastErr.message)) {
    logger.info(
      { handle, lastErr: lastErr.message },
      'hackerrank: public submission feed unavailable — returning empty (HR has been deprecating these endpoints)'
    );
  }
  return list
    .filter((e) => e.slug)
    .map((e) => {
      const problemId = String(e.slug);
      const url = e.url
        ? e.url.startsWith('http')
          ? e.url
          : `${BASE}${e.url}`
        : `${BASE}/challenges/${problemId}/problem`;
      const topics: string[] = e.track_slug ? normalizeTopics([e.track_slug]) : [];
      const submittedAt = e.created_at ? new Date(e.created_at) : new Date();
      return {
        externalId: String(e.id ?? e.ch_id ?? `${problemId}-${submittedAt.getTime()}`),
        problemId,
        problemTitle: e.name ?? problemId,
        problemUrl: url,
        topics,
        difficulty: 'unknown' as const,
        status: 'accepted' as const,
        language: e.language ?? '',
        submittedAt,
      };
    });
}
