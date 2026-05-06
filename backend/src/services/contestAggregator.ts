import { logger } from '../config/logger.js';
import { Contest, type ContestPlatform } from '../models/Contest.js';

/**
 * Upcoming-contest aggregator using kontests.net (the consolidated free API
 * recommended in the spec). Falls back gracefully when the upstream is down.
 *
 * Endpoint: https://kontests.net/api/v1/all
 * Returns array of: { name, url, start_time, end_time, duration, site, in_24_hours, status }
 */

const KONTESTS_URL = 'https://kontests.net/api/v1/all';

// Case-insensitive site mapping. kontests.net's casing isn't perfectly stable
// across deploys ("CodeForces" / "Codeforces" / "codeforces" all observed at
// various points), so we lowercase the key before lookup.
const SITE_MAP: Record<string, ContestPlatform | null> = {
  codeforces: 'codeforces',
  codechef: 'codechef',
  leetcode: 'leetcode',
  atcoder: 'atcoder',
  hackerrank: 'hackerrank',
  hackerearth: 'hackerearth',
  geeksforgeeks: 'gfg',
  gfg: 'gfg',
  // Sites we don't model — silently ignored.
  toph: null,
  topcoder: null,
  'kick start': null,
  'cs academy': null,
  csacademy: null,
};

interface KontestsRow {
  name: string;
  url: string;
  start_time: string;
  end_time: string;
  duration: string; // seconds as string
  site: string;
  in_24_hours: 'Yes' | 'No';
  status: 'BEFORE' | 'CODING' | 'OVER' | string;
}

function mapSite(site: string): ContestPlatform | null {
  return SITE_MAP[site.trim().toLowerCase()] ?? null;
}

function externalIdFromUrl(platform: ContestPlatform, url: string): string {
  // Extract a stable id from the URL where possible — fallback to URL itself.
  if (platform === 'codeforces') {
    const m = url.match(/contests?\/(\d+)/i);
    if (m) return m[1];
  }
  if (platform === 'leetcode') {
    const m = url.match(/contest\/([a-z0-9-]+)/i);
    if (m) return m[1];
  }
  if (platform === 'atcoder') {
    const m = url.match(/contests\/([a-z0-9-]+)/i);
    if (m) return m[1];
  }
  if (platform === 'codechef') {
    const m = url.match(/codechef\.com\/([A-Z0-9]+)/i);
    if (m) return m[1];
  }
  return url;
}

export async function syncUpcomingContests(): Promise<{
  fetched: number;
  upserted: number;
  skipped: number;
  source: 'kontests' | 'direct' | 'mixed' | 'failed';
}> {
  // Try kontests.net first (covers all 7 platforms in one call).
  let rows: KontestsRow[] = [];
  let kontestsOk = false;
  try {
    const res = await fetch(KONTESTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      rows = (await res.json()) as KontestsRow[];
      kontestsOk = true;
    } else {
      throw new Error(`status ${res.status}`);
    }
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'kontests.net unreachable — falling back to direct platform APIs'
    );
  }

  // Always run the direct platform fetchers in parallel with kontests so we
  // get maximum coverage. kontests' multi-platform aggregation is convenient
  // but inconsistent — sometimes it returns only CF + AtCoder, sometimes a
  // platform's contests are missing entirely. Direct fetchers fill those gaps.
  // De-dupe by (platform, externalId) at insert time.
  const [cf, atc, lc, cc] = await Promise.all([
    fetchCodeforcesUpcoming().catch((err) => {
      logger.debug({ err: (err as Error).message }, 'CF direct fetch failed');
      return [];
    }),
    fetchAtCoderUpcoming().catch((err) => {
      logger.debug({ err: (err as Error).message }, 'AtCoder direct fetch failed');
      return [];
    }),
    fetchLeetCodeUpcoming().catch((err) => {
      logger.debug({ err: (err as Error).message }, 'LeetCode direct fetch failed');
      return [];
    }),
    fetchCodeChefUpcoming().catch((err) => {
      logger.debug({ err: (err as Error).message }, 'CodeChef direct fetch failed');
      return [];
    }),
  ]);
  const directContests: Array<{
    platform: ContestPlatform;
    externalId: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
  }> = [...cf, ...atc, ...lc, ...cc];

  let upserted = 0;
  let skipped = 0;
  const seen = new Set<string>();

  // Pass 1: kontests rows (when available).
  for (const r of rows) {
    const platform = mapSite(r.site);
    if (!platform) {
      skipped++;
      continue;
    }
    const externalId = externalIdFromUrl(platform, r.url);
    const startTime = new Date(r.start_time);
    const endTime = new Date(r.end_time);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      skipped++;
      continue;
    }
    const key = `${platform}:${externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await Contest.updateOne(
        { platform, externalId },
        {
          $set: {
            name: r.name,
            url: r.url,
            startTime,
            endTime,
            durationMinutes: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
          },
        },
        { upsert: true }
      );
      upserted++;
    } catch (err) {
      logger.debug({ err: (err as Error).message, platform, externalId }, 'contest upsert failed');
      skipped++;
    }
  }

  // Pass 2: direct-API rows (only when kontests failed; otherwise the kontests
  // data already covers these platforms and we'd just duplicate work).
  for (const c of directContests) {
    const key = `${c.platform}:${c.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await Contest.updateOne(
        { platform: c.platform, externalId: c.externalId },
        {
          $set: {
            name: c.name,
            url: c.url,
            startTime: c.startTime,
            endTime: c.endTime,
            durationMinutes: Math.round(
              (c.endTime.getTime() - c.startTime.getTime()) / 60000
            ),
          },
        },
        { upsert: true }
      );
      upserted++;
    } catch (err) {
      skipped++;
    }
  }

  const source: 'kontests' | 'direct' | 'mixed' | 'failed' =
    kontestsOk && directContests.length === 0
      ? 'kontests'
      : !kontestsOk && directContests.length > 0
        ? 'direct'
        : kontestsOk && directContests.length > 0
          ? 'mixed'
          : 'failed';

  const fetched = rows.length + directContests.length;
  logger.info({ fetched, upserted, skipped, source }, 'upcoming contests synced');
  return { fetched, upserted, skipped, source };
}

// ---- Direct-API fallback fetchers ----------------------------------------

interface CfApiContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  startTimeSeconds?: number;
  durationSeconds: number;
}

async function fetchCodeforcesUpcoming() {
  const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)' },
  });
  if (!res.ok) throw new Error(`CF status ${res.status}`);
  const body = (await res.json()) as { status: string; result?: CfApiContest[] };
  if (body.status !== 'OK' || !body.result) throw new Error('CF non-OK');
  const out: Array<{
    platform: ContestPlatform;
    externalId: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
  }> = [];
  for (const c of body.result) {
    if (c.phase !== 'BEFORE') continue; // only upcoming
    if (!c.startTimeSeconds) continue;
    const startTime = new Date(c.startTimeSeconds * 1000);
    const endTime = new Date((c.startTimeSeconds + c.durationSeconds) * 1000);
    out.push({
      platform: 'codeforces',
      externalId: String(c.id),
      name: c.name,
      url: `https://codeforces.com/contest/${c.id}`,
      startTime,
      endTime,
    });
  }
  return out;
}

interface AtCoderContestRow {
  id: string;
  start_epoch_second: number;
  duration_second: number;
  title: string;
  rate_change?: string;
}

async function fetchAtCoderUpcoming() {
  // AtCoder doesn't have an official API and the kenkoooo mirror started
  // returning 403 for non-browser clients. Scrape the public contests page
  // directly: https://atcoder.jp/contests has an upcoming-contests table
  // with the contest id, name, start ISO, and duration "HH:MM" columns.
  const res = await fetch('https://atcoder.jp/contests/?lang=en', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`AtCoder status ${res.status}`);
  const html = await res.text();
  const upcomingSection =
    html.match(
      /<div[^>]+id="contest-table-upcoming"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i
    )?.[0] ?? '';
  const out: Array<{
    platform: ContestPlatform;
    externalId: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
  }> = [];
  // Each row: <td class="text-center"><a href="https://www.iso-foo">...</a></td>
  //           <td><a href="/contests/abcXXX">Name</a> ...</td>
  //           <td class="text-center">HH:MM</td>
  //           <td class="text-center">- Rated</td>
  const rowRe = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let m: RegExpExecArray | null;
  const now = Date.now();
  while ((m = rowRe.exec(upcomingSection))) {
    const row = m[0];
    if (/<th\b/i.test(row)) continue;
    const startMatch = row.match(
      /<time[^>]*>([\s\S]*?)<\/time>/i
    ) || row.match(/iso-foo[^"]*"[^>]*>([\d\-T+: ]+)</i);
    const idMatch = row.match(/href="\/contests\/([a-z0-9_-]+)"[^>]*>([^<]+)</i);
    const durMatch = row.match(/>(\d{2,3}:\d{2})</);
    if (!startMatch || !idMatch || !durMatch) continue;
    const startTime = new Date(startMatch[1].trim().replace(/\s+/g, 'T'));
    if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= now) continue;
    const [hh, mm] = durMatch[1].split(':').map((n) => parseInt(n, 10));
    const endTime = new Date(startTime.getTime() + (hh * 60 + mm) * 60_000);
    out.push({
      platform: 'atcoder',
      externalId: idMatch[1],
      name: idMatch[2].trim(),
      url: `https://atcoder.jp/contests/${idMatch[1]}`,
      startTime,
      endTime,
    });
  }
  return out;
}

/**
 * LeetCode upcoming contests via the public GraphQL endpoint. The query
 * doesn't need auth — `allContests` returns every contest LeetCode has run
 * plus the upcoming Weekly + Biweekly Contest entries. We filter to ones
 * starting in the future.
 */
async function fetchLeetCodeUpcoming() {
  const query = `query allContests { allContests { title titleSlug startTime duration } }`;
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`LC status ${res.status}`);
  const body = (await res.json()) as {
    data?: { allContests?: Array<{ title: string; titleSlug: string; startTime: number; duration: number }> };
  };
  const list = body?.data?.allContests ?? [];
  const now = Date.now() / 1000;
  const out: Array<{
    platform: ContestPlatform;
    externalId: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
  }> = [];
  for (const c of list) {
    if (!c.startTime || c.startTime < now) continue;
    out.push({
      platform: 'leetcode',
      externalId: c.titleSlug,
      name: c.title,
      url: `https://leetcode.com/contest/${c.titleSlug}/`,
      startTime: new Date(c.startTime * 1000),
      endTime: new Date((c.startTime + (c.duration ?? 5400)) * 1000),
    });
  }
  return out;
}

/**
 * CodeChef upcoming contests via their internal JSON API. The endpoint sits
 * at /api/list/contests/all and returns `{future_contests: [...]}` rows with
 * start/end ISO timestamps and a contest code.
 */
async function fetchCodeChefUpcoming() {
  const res = await fetch('https://www.codechef.com/api/list/contests/all', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
      Accept: 'application/json',
      Referer: 'https://www.codechef.com/contests',
    },
  });
  if (!res.ok) throw new Error(`CC status ${res.status}`);
  const body = (await res.json()) as {
    future_contests?: Array<{
      contest_code: string;
      contest_name: string;
      contest_start_date_iso: string;
      contest_end_date_iso: string;
    }>;
  };
  const out: Array<{
    platform: ContestPlatform;
    externalId: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
  }> = [];
  for (const c of body?.future_contests ?? []) {
    const startTime = new Date(c.contest_start_date_iso);
    const endTime = new Date(c.contest_end_date_iso);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) continue;
    out.push({
      platform: 'codechef',
      externalId: c.contest_code,
      name: c.contest_name,
      url: `https://www.codechef.com/${c.contest_code}`,
      startTime,
      endTime,
    });
  }
  return out;
}
