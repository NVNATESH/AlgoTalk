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
  // Aggregate stars across all badges (sum). HackerRank shows per-track stars
  // (1–5 per badge) — this is the headline number a recruiter glances at.
  totalStars: number;
  // Per-track badge listing: `[{ badge: 'Problem Solving', stars: 5, level: 'gold' }]`.
  badges: HackerRankBadge[];
  // Per-domain solved counts derived from the public scores endpoint.
  // Used to populate "all solved" totals when the deprecated submission feed
  // returns an empty list.
  scores: HackerRankScore[];
  // Number of certifications passed (Problem Solving, SQL, etc.).
  certificationCount: number;
  certifications: HackerRankCertification[];
}

export interface HackerRankBadge {
  name: string;
  stars: number; // 0–5
  level: string; // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | ''
  category: string;
}

export interface HackerRankScore {
  track: string; // e.g. "Algorithms", "Data Structures", "SQL"
  practiceScore: number;
  contestScore: number;
  solvedCount: number; // best-effort — HR doesn't always expose this
}

export interface HackerRankCertification {
  name: string;
  certifiedAt: Date | null;
  url: string;
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

  // Fetch badges/scores/certifications in parallel; failures are tolerated —
  // each block falls back to an empty list so the profile still saves.
  const [badges, scores, certifications] = await Promise.all([
    fetchHackerRankBadges(m.username!).catch((err) => {
      logger.debug({ err: (err as Error).message, handle }, 'hackerrank badges fetch failed');
      return [] as HackerRankBadge[];
    }),
    fetchHackerRankScores(m.username!).catch((err) => {
      logger.debug({ err: (err as Error).message, handle }, 'hackerrank scores fetch failed');
      return [] as HackerRankScore[];
    }),
    fetchHackerRankCertifications(m.username!).catch((err) => {
      logger.debug(
        { err: (err as Error).message, handle },
        'hackerrank certifications fetch failed'
      );
      return [] as HackerRankCertification[];
    }),
  ]);

  const totalStars = badges.reduce((sum, b) => sum + (b.stars || 0), 0);
  // Headline rank label: prefer star summary (recruiters care about it most),
  // fall back to "Level N" if the badges endpoint was unavailable.
  const rank = totalStars > 0
    ? `${totalStars}★ across ${badges.length} badge${badges.length === 1 ? '' : 's'}`
    : m.level ? `Level ${m.level}` : '';

  return {
    handle: m.username!,
    displayName: m.name ?? m.username!,
    avatarUrl: m.avatar ?? '',
    rating: null, // HR profile API doesn't expose a single global rating
    rank,
    totalStars,
    badges,
    scores,
    certificationCount: certifications.length,
    certifications,
  };
}

/**
 * HackerRank badges: GET /rest/hackers/<handle>/badges
 * Public, returns one entry per track the user has earned a badge in. Each
 * entry includes a `stars` field (0–5) and a `current_points`/`level` pair.
 * The same data backs the trophies on a profile page.
 */
export async function fetchHackerRankBadges(handle: string): Promise<HackerRankBadge[]> {
  interface BadgesResp {
    models?: Array<{
      badge_name?: string;
      badge_short_name?: string;
      stars?: number;
      level?: string;
      category_name?: string;
    }>;
  }
  const data = await hrGet<BadgesResp>(
    `/rest/hackers/${encodeURIComponent(handle)}/badges`,
    handle
  );
  return (data.models ?? [])
    .filter((b) => b.badge_name || b.badge_short_name)
    .map((b) => ({
      name: b.badge_name ?? b.badge_short_name ?? '',
      stars: typeof b.stars === 'number' ? b.stars : 0,
      level: (b.level ?? '').toString(),
      category: b.category_name ?? '',
    }));
}

/**
 * HackerRank per-track scores: GET /rest/hackers/<handle>/scores
 * Returns practice + contest scores per "track" (Algorithms, SQL, etc.). We use
 * this to expose total-solved-per-domain in the integration card, since the
 * deprecated `recent_challenges` feed often returns 500.
 */
export async function fetchHackerRankScores(handle: string): Promise<HackerRankScore[]> {
  interface ScoresResp {
    models?: Array<{
      name?: string;
      practice?: { score?: number; solved?: number };
      contests?: { score?: number };
      score?: number; // legacy flat shape
    }>;
  }
  const data = await hrGet<ScoresResp>(
    `/rest/hackers/${encodeURIComponent(handle)}/scores`,
    handle
  );
  return (data.models ?? [])
    .filter((s) => s.name)
    .map((s) => ({
      track: s.name!,
      practiceScore: s.practice?.score ?? s.score ?? 0,
      contestScore: s.contests?.score ?? 0,
      solvedCount: s.practice?.solved ?? 0,
    }));
}

/**
 * HackerRank certifications: GET /rest/hackers/<handle>/certificates
 * Public; returns "Problem Solving (Basic/Intermediate)", SQL, Python, etc.
 * Some legacy handles return an empty list — tolerate it.
 */
export async function fetchHackerRankCertifications(
  handle: string
): Promise<HackerRankCertification[]> {
  interface CertResp {
    data?: Array<{
      attributes?: {
        certificate_id?: string;
        certificate_url?: string;
        hacker_name?: string;
        certification_name?: string;
        certified_at?: string;
      };
    }>;
    models?: Array<{
      name?: string;
      certified_date?: string;
      url?: string;
      certificate_id?: string;
    }>;
  }
  const data = await hrGet<CertResp>(
    `/rest/hackers/${encodeURIComponent(handle)}/certificates`,
    handle
  );
  // The endpoint returns `data` (jsonapi-shaped) for some users and `models`
  // (legacy) for others — accept both.
  if (Array.isArray(data.data)) {
    return data.data
      .map((d) => d.attributes ?? {})
      .filter((a) => a.certification_name)
      .map((a) => ({
        name: a.certification_name!,
        certifiedAt: a.certified_at ? new Date(a.certified_at) : null,
        url: a.certificate_url ?? '',
      }));
  }
  if (Array.isArray(data.models)) {
    return data.models
      .filter((m) => m.name)
      .map((m) => ({
        name: m.name!,
        certifiedAt: m.certified_date ? new Date(m.certified_date) : null,
        url: m.url ?? '',
      }));
  }
  return [];
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
  maxItems = 1000
): Promise<HackerRankSubmission[]> {
  interface RecentResp {
    models?: HrRecentEntry[];
    total?: number;
  }
  // HackerRank's recent_challenges endpoint is heavily rate-limited and
  // frequently returns 500 to public callers. We try both common path prefixes
  // and paginate via `offset` to capture *all* solved challenges, not only the
  // first page. The endpoint accepts limit up to 100; we page until we hit
  // server-reported `total`, an empty page, or the safety cap (`maxItems`).
  const PAGE = 100;
  const buildPaths = (offset: number, limit: number) => [
    `/rest/hackers/${encodeURIComponent(handle)}/recent_challenges?limit=${limit}&offset=${offset}`,
    `/rest/contests/master/hackers/${encodeURIComponent(handle)}/recent_challenges?limit=${limit}&offset=${offset}`,
  ];

  const collected: HrRecentEntry[] = [];
  const seenIds = new Set<string>();
  let total: number | null = null;
  let workingPath: string | null = null; // pin to whichever prefix worked first
  let firstPageErr: Error | null = null;

  for (let offset = 0; collected.length < maxItems; offset += PAGE) {
    const limit = Math.min(PAGE, maxItems - collected.length);
    const paths: string[] = workingPath
      ? [workingPath.replace(/offset=\d+/, `offset=${offset}`)]
      : buildPaths(offset, limit);
    let pageData: HrRecentEntry[] | null = null;
    let pageErr: Error | null = null;
    for (const path of paths) {
      try {
        const data = await hrGet<RecentResp>(path, handle);
        pageData = data.models ?? [];
        if (typeof data.total === 'number') total = data.total;
        if (!workingPath) workingPath = path;
        pageErr = null;
        break;
      } catch (err) {
        pageErr = err as Error;
        logger.debug({ err: pageErr.message, path }, 'hackerrank recent page failed, trying next');
      }
    }
    if (pageData === null) {
      if (offset === 0) firstPageErr = pageErr;
      break; // mid-pagination failure: stop and return what we have
    }
    if (pageData.length === 0) break;
    let added = 0;
    for (const e of pageData) {
      const id = String(e.id ?? e.ch_id ?? `${e.slug}-${e.created_at ?? ''}`);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      collected.push(e);
      added++;
    }
    if (added === 0) break; // duplicate-only page = exhausted
    if (total !== null && collected.length >= total) break;
    if (pageData.length < limit) break; // short page = last page
    // Light throttle: HR's edge will start 429ing if we hammer it.
    await new Promise((r) => setTimeout(r, 200));
  }

  // HackerRank deprecated their public submission feed for some users; the
  // endpoint returns 500 (DynamoDB BadRequest). If even the first page failed
  // we log so it's clear this is HR's side, not a bad handle.
  if (collected.length === 0 && firstPageErr && !/not found/i.test(firstPageErr.message)) {
    logger.info(
      { handle, lastErr: firstPageErr.message },
      'hackerrank: public submission feed unavailable — returning empty (HR has been deprecating these endpoints)'
    );
  }

  return collected
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
