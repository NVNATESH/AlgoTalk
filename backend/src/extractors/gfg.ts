import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

/**
 * GeeksforGeeks extractor.
 *
 * GFG's site is built with Next.js and exposes its profile data via the
 * Next.js data path:
 *
 *   https://www.geeksforgeeks.org/gfg-assets/_next/data/latest/user/<handle>.json
 *
 * That JSON contains:
 *   pageProps.userInfo            — name, score, institute, total_problems_solved
 *   pageProps.userSubmissionsInfo — { Easy|Medium|Hard|Basic|School: { id: { slug, pname, lang, user_subtime } } }
 *
 * That gives us every accepted problem with a real submission timestamp —
 * perfect for both totals and the heatmap. We use it as the primary source
 * and only fall back to scraping the practice page when the JSON 404s.
 */

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1; +https://learnhub.example)',
  Accept: 'application/json,text/html,*/*',
  Referer: 'https://www.geeksforgeeks.org/',
};

interface GfgProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
  totalSolved: number;
}

export interface GfgSubmission {
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

interface GfgUserJson {
  pageProps?: {
    userInfo?: {
      name?: string;
      profile_image_url?: string;
      institute_name?: string;
      institute_rank?: number;
      score?: number;
      monthly_score?: number;
      total_problems_solved?: number;
    };
    userSubmissionsInfo?: Record<
      string,
      Record<
        string,
        {
          slug?: string;
          pname?: string;
          lang?: string;
          user_subtime?: string;
        }
      >
    >;
  };
}

async function fetchGfgUserJson(handle: string): Promise<GfgUserJson | null> {
  try {
    const url = `https://www.geeksforgeeks.org/gfg-assets/_next/data/latest/user/${encodeURIComponent(
      handle
    )}.json`;
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      redirect: 'follow',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.debug({ status: res.status, url }, 'gfg next/data non-2xx');
      return null;
    }
    return (await res.json()) as GfgUserJson;
  } catch (err) {
    logger.debug({ err: (err as Error).message, handle }, 'gfg next/data fetch threw');
    return null;
  }
}

export async function fetchGfgProfile(handle: string): Promise<GfgProfile> {
  const json = await fetchGfgUserJson(handle);
  const info = json?.pageProps?.userInfo;
  if (info) {
    return {
      handle,
      displayName: info.name ?? handle,
      avatarUrl: info.profile_image_url ?? '',
      rating: typeof info.score === 'number' ? info.score : null,
      rank:
        typeof info.institute_rank === 'number'
          ? `Institute Rank #${info.institute_rank}${info.institute_name ? ` · ${info.institute_name}` : ''}`
          : info.institute_name ?? '',
      totalSolved: info.total_problems_solved ?? 0,
    };
  }
  // Fallback: scrape the public profile page (handle the redirect chain
  // /user/<handle>/practice → /user/<handle>/).
  const html = await getText(`https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`);
  if (/page not found|user does not exist/i.test(html)) {
    throw ApiError.notFound(`GFG user "${handle}" not found`);
  }
  const nameMatch = html.match(/<title>([^<|]+?)\s*\|\s*GeeksforGeeks/i);
  return {
    handle,
    displayName: nameMatch ? decode(nameMatch[1].trim()) : handle,
    avatarUrl: '',
    rating: null,
    rank: '',
    totalSolved: 0,
  };
}

export async function fetchGfgRecent(handle: string): Promise<GfgSubmission[]> {
  const json = await fetchGfgUserJson(handle);
  const subsByDiff = json?.pageProps?.userSubmissionsInfo;
  if (subsByDiff) {
    const out: GfgSubmission[] = [];
    for (const [diffLabel, problems] of Object.entries(subsByDiff)) {
      const difficulty = mapDifficulty(diffLabel);
      for (const [id, p] of Object.entries(problems)) {
        if (!p.slug) continue;
        const submittedAt = parseGfgTimestamp(p.user_subtime);
        out.push({
          externalId: `gfg:${id}`,
          problemId: p.slug,
          problemTitle: p.pname ?? p.slug,
          problemUrl: `https://www.geeksforgeeks.org/problems/${p.slug}/`,
          topics: normalizeTopics([]),
          difficulty,
          status: 'accepted',
          language: p.lang ?? '',
          submittedAt,
        });
      }
    }
    // Newest first so the recent-submissions feed displays correctly.
    out.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    return out;
  }
  // No JSON available — last resort, return empty rather than crashing.
  // (Prior versions tried to parse the practice HTML, but GFG migrated to a
  // client-rendered page so the static HTML no longer contains the data.)
  logger.debug({ handle }, 'gfg: no submission data available — returning empty');
  return [];
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: COMMON_HEADERS, redirect: 'follow' });
  if (res.status === 404) throw ApiError.notFound('GFG user not found');
  if (!res.ok) {
    logger.warn({ status: res.status, url }, 'gfg non-2xx');
    throw new ApiError(502, `GFG returned ${res.status}`);
  }
  return res.text();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function mapDifficulty(s: string): 'easy' | 'medium' | 'hard' | 'unknown' {
  const v = s.toLowerCase();
  if (v === 'school' || v === 'basic' || v === 'easy') return 'easy';
  if (v === 'medium') return 'medium';
  if (v === 'hard') return 'hard';
  return 'unknown';
}

function parseGfgTimestamp(s: string | undefined): Date {
  if (!s) return new Date();
  // GFG returns timestamps like "2025-11-29 10:27:22" in IST (no tz suffix).
  // Treating as UTC slightly mis-buckets a midnight boundary day in the heatmap;
  // good enough for our purposes (we don't display sub-hour resolution).
  const iso = s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
