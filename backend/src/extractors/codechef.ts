import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

/**
 * CodeChef extractor.
 *
 * CodeChef has no documented public REST API. We use two endpoints:
 *
 *  - Profile via the public profile page (HTML scrape of the rating bar).
 *    https://www.codechef.com/users/<handle>
 *
 *  - Recent submissions via the activity feed JSON. CodeChef's site itself
 *    calls `/recent/user?user_handle=<handle>&page=0` which returns
 *    `{ html: "<table rows...>" }`. We parse the HTML for problem code,
 *    submission id, language, status icon class, and timestamp.
 *
 * Both are unofficial and brittle — failures here log + propagate; the
 * integration sync wrapper will mark the integration as failed and surface a
 * notification rather than crashing the request.
 */

const BASE = 'https://www.codechef.com';

interface CodeChefProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
  maxRating: number | null;
  stars: string;
}

export interface CodeChefSubmission {
  externalId: string;
  problemId: string;
  problemTitle: string;
  problemUrl: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'tle'
    | 'mle'
    | 'runtime_error'
    | 'compile_error'
    | 'rejected'
    | 'pending'
    | 'unknown';
  language: string;
  submittedAt: Date;
}

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; LearnHub/0.1; +https://learnhub.example)',
  Accept: 'text/html,application/json,*/*',
  Referer: 'https://www.codechef.com/',
};

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: COMMON_HEADERS });
  if (res.status === 404) throw ApiError.notFound('CodeChef user not found');
  if (!res.ok) {
    logger.warn({ status: res.status, url }, 'codechef non-2xx');
    throw new ApiError(502, `CodeChef returned ${res.status}`);
  }
  return res.text();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: COMMON_HEADERS });
  if (res.status === 404) throw ApiError.notFound('CodeChef user not found');
  if (!res.ok) {
    logger.warn({ status: res.status, url }, 'codechef non-2xx');
    throw new ApiError(502, `CodeChef returned ${res.status}`);
  }
  return (await res.json()) as T;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

const stripTags = (s: string) => decodeHtml(s.replace(/<[^>]*>/g, '').trim());

export async function fetchCodeChefProfile(handle: string): Promise<CodeChefProfile> {
  const html = await getText(`${BASE}/users/${encodeURIComponent(handle)}`);

  // Profile page contains a 404-style banner if the user doesn't exist.
  if (
    /Page not found/i.test(html) ||
    /this page doesn['’]t exist/i.test(html)
  ) {
    throw ApiError.notFound(`CodeChef user "${handle}" not found`);
  }

  const ratingMatch =
    html.match(/<div class="rating-number"[^>]*>(\d+)\??/i) ||
    html.match(/class="rating-number"[^>]*>(\d+)/i);
  const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

  const maxMatch = html.match(/Highest Rating[^<]*<[^>]*>(\d+)/i) || html.match(/\(Max:\s*(\d+)\)/i);
  const maxRating = maxMatch ? parseInt(maxMatch[1], 10) : null;

  const starsMatch = html.match(/class="rating"[^>]*>([0-9]★)/) || html.match(/(\d★)/);
  const stars = starsMatch ? starsMatch[1] : '';

  const rankMatch = html.match(/Country Rank[^#]*#?(\d+)/i);
  const rank = rankMatch ? `Country Rank #${rankMatch[1]}` : stars || '';

  // Display name (best-effort from the H1 / header-text)
  const nameMatch =
    html.match(/<h1 class="h2-style"[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<header class="user-details-container">[\s\S]*?<h1[^>]*>([^<]+)<\/h1>/i);
  const displayName = nameMatch ? decodeHtml(nameMatch[1].trim()) : handle;

  // Avatar
  const avatarMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="profileImage"/i);
  const avatarUrl = avatarMatch ? avatarMatch[1] : '';

  return {
    handle,
    displayName,
    avatarUrl,
    rating,
    maxRating,
    rank,
    stars,
  };
}

const STATUS_BY_CLASS_FRAGMENT: Array<{ frag: RegExp; status: CodeChefSubmission['status'] }> = [
  { frag: /tick-icon/i, status: 'accepted' },
  { frag: /alert-icon/i, status: 'wrong_answer' },
  { frag: /cross-icon/i, status: 'wrong_answer' },
  { frag: /clock_error/i, status: 'tle' },
  { frag: /memory_error/i, status: 'mle' },
  { frag: /runtime_error/i, status: 'runtime_error' },
  { frag: /compile_error/i, status: 'compile_error' },
  { frag: /partial/i, status: 'rejected' },
];

function statusFromCell(cellHtml: string): CodeChefSubmission['status'] {
  for (const m of STATUS_BY_CLASS_FRAGMENT) if (m.frag.test(cellHtml)) return m.status;
  // Fallback: text-based
  if (/AC\b/i.test(cellHtml)) return 'accepted';
  if (/WA\b/i.test(cellHtml)) return 'wrong_answer';
  if (/TLE/i.test(cellHtml)) return 'tle';
  if (/CTE|CE\b/i.test(cellHtml)) return 'compile_error';
  if (/RTE\b/i.test(cellHtml)) return 'runtime_error';
  return 'unknown';
}

export async function fetchCodeChefRecent(
  handle: string,
  pages = 100
): Promise<CodeChefSubmission[]> {
  const out: CodeChefSubmission[] = [];
  // CodeChef returns ~10 rows/page and caps at `max_page` (~144 for active
  // users with 1000+ submissions). Default to 100 pages so we capture roughly
  // 1000 most-recent submissions; stop early on empty page or duplicate id.
  const seenIds = new Set<string>();
  let lastMaxPage: number | null = null;
  for (let page = 0; page < pages; page++) {
    let resp: { html?: string; content?: string; max_page?: number };
    try {
      resp = await getJson<{ html?: string; content?: string; max_page?: number }>(
        `${BASE}/recent/user?user_handle=${encodeURIComponent(handle)}&page=${page}`
      );
    } catch (err) {
      if (page === 0) throw err;
      break; // non-first page failure = stop, return what we have
    }
    const html = resp.content ?? resp.html ?? '';
    if (lastMaxPage === null && typeof resp.max_page === 'number') {
      lastMaxPage = resp.max_page;
    }
    if (!html.trim()) break;
    const rows = extractRows(html);
    if (rows.length === 0) break;

    let added = 0;
    for (const row of rows) {
      const sub = parseRow(row);
      if (!sub) continue;
      if (seenIds.has(sub.externalId)) continue;
      seenIds.add(sub.externalId);
      out.push(sub);
      added++;
    }
    // Hit the server-known last page → stop.
    if (lastMaxPage !== null && page >= lastMaxPage) break;
    // No new rows produced (deduped against earlier pages) → stop.
    if (added === 0) break;
    // Light throttle so CodeChef doesn't 429 us on long histories.
    if (pages > 10) await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

function extractRows(html: string): string[] {
  const rows: string[] = [];
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (/<th\b/i.test(m[1])) continue; // header row
    rows.push(m[1]);
  }
  return rows;
}

function parseRow(row: string): CodeChefSubmission | null {
  // Cells in order: [time, problem, result, language, [view link]]. The exact
  // column count varies between contest/practice rows; we hunt by patterns.
  const tdMatches = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1]);
  if (tdMatches.length < 3) return null;

  // Problem code: CodeChef switched to single-quoted attributes — accept both.
  // Pattern: <a href='/problems/CODE'> or href="/problems/CODE".
  const problemMatch =
    row.match(/<a[^>]+href=['"]\/problems\/([A-Z0-9_]+)['"]?/i) ||
    // Fallback: the cell sometimes has the code in a `title='CODE'` attribute.
    row.match(/<td[^>]+title=['"]([A-Z][A-Z0-9_]{1,29})['"]\s*>\s*<a[^>]*>\s*\1/i);
  if (!problemMatch) return null;
  const problemId = problemMatch[1].toUpperCase();

  // Time first — used as the stable submission id when no /viewsolution link
  // is present (CodeChef now disables the View link for non-friends).
  // Title attribute: title='10:41 PM 02/05/26' (single quotes, MM/DD/YY).
  const niceTime =
    row.match(/title=['"](\d{1,2}:\d{2} [AP]M \d{2}\/\d{2}\/\d{2})['"]/);
  const isoTime = row.match(/title=['"](\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})['"]/);
  const submittedAt = isoTime
    ? new Date(isoTime[1].replace(' ', 'T') + 'Z')
    : niceTime
      ? parseCodeChefDateTime(niceTime[1])
      : new Date();

  // Submission id: prefer the /viewsolution/<id> link, fall back to a stable
  // composite of (problemId, submittedAt) so re-syncs are idempotent.
  const idMatch = row.match(/\/viewsolution\/(\d+)/i);
  const externalId = idMatch
    ? idMatch[1]
    : `${problemId}-${Math.floor(submittedAt.getTime() / 1000)}`;

  const status = statusFromCell(row);

  // Language: scan tds for a short upper/alphanumeric token like "C++17",
  // "PYTH 3.6", "JAVA". Strip tags first.
  const langMatch = tdMatches
    .map((t) => stripTags(t))
    .find((t) => /^[A-Z][A-Z0-9+# .]{0,12}$/.test(t.replace(/\s+/g, ' ').trim()));
  const language = langMatch ?? '';

  return {
    externalId,
    problemId,
    problemTitle: problemId,
    problemUrl: `${BASE}/problems/${problemId}`,
    topics: normalizeTopics([]),
    difficulty: 'unknown',
    status,
    language,
    submittedAt,
  };
}

/**
 * Parse CodeChef's display format: "10:41 PM 02/05/26" — MM/DD/YY in their
 * locale. Returns a Date treating the time as UTC (close enough for heatmap
 * day-buckets).
 */
function parseCodeChefDateTime(s: string): Date {
  const m = s.match(/(\d{1,2}):(\d{2})\s+(AM|PM)\s+(\d{2})\/(\d{2})\/(\d{2})/i);
  if (!m) return new Date();
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hh < 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const month = parseInt(m[4], 10);
  const day = parseInt(m[5], 10);
  const year = 2000 + parseInt(m[6], 10);
  const d = new Date(Date.UTC(year, month - 1, day, hh, mm));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
