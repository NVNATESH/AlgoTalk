import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

/**
 * HackerEarth extractor.
 *
 * HackerEarth's user data lives behind login for the most part — there is no
 * public API. We scrape the public profile at
 *   https://www.hackerearth.com/@<handle>/
 * for displayName/avatar/rating, and the practice activity feed (a nested
 * subpage of the profile) for solved problems.
 *
 * Best-effort: when the page layout shifts (HE redesigns periodically) the
 * regexes degrade gracefully — we return what we can parse.
 */

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1; +https://learnhub.example)',
  Accept: 'text/html,application/json,*/*',
  Referer: 'https://www.hackerearth.com/',
};

interface HackerEarthProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
  totalSolved: number;
}

export interface HackerEarthSubmission {
  externalId: string;
  problemId: string;
  problemTitle: string;
  problemUrl: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  status: 'accepted' | 'wrong_answer' | 'rejected' | 'unknown';
  language: string;
  submittedAt: Date;
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: COMMON_HEADERS, redirect: 'follow' });
  if (res.status === 404) throw ApiError.notFound('HackerEarth user not found');
  if (!res.ok) {
    logger.warn({ status: res.status, url }, 'hackerearth non-2xx');
    throw new ApiError(502, `HackerEarth returned ${res.status}`);
  }
  return res.text();
}

export async function fetchHackerEarthProfile(handle: string): Promise<HackerEarthProfile> {
  const html = await getText(`https://www.hackerearth.com/@${encodeURIComponent(handle)}/`);
  if (/page not found/i.test(html) || /this user does not exist/i.test(html)) {
    throw ApiError.notFound(`HackerEarth user "${handle}" not found`);
  }

  const nameMatch =
    html.match(/<h1[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/property="og:title"\s+content="([^"]+)"/i);
  const avatarMatch =
    html.match(/property="og:image"\s+content="([^"]+)"/i) ||
    html.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i);
  const ratingMatch = html.match(/Rating[^0-9]*?(\d+)/i);
  const rankMatch = html.match(/Global Rank[^#]*#?(\d+)/i);
  const solvedMatch = html.match(/(\d+)\s*Problems? Solved/i);

  return {
    handle,
    displayName: nameMatch ? decode(nameMatch[1].trim()) : handle,
    avatarUrl: avatarMatch ? avatarMatch[1] : '',
    rating: ratingMatch ? parseInt(ratingMatch[1], 10) : null,
    rank: rankMatch ? `Global Rank #${rankMatch[1]}` : '',
    totalSolved: solvedMatch ? parseInt(solvedMatch[1], 10) : 0,
  };
}

export async function fetchHackerEarthRecent(
  handle: string
): Promise<HackerEarthSubmission[]> {
  const html = await getText(
    `https://www.hackerearth.com/@${encodeURIComponent(handle)}/practice/`
  );
  return parseSolvedHtml(html);
}

function parseSolvedHtml(html: string): HackerEarthSubmission[] {
  const out: HackerEarthSubmission[] = [];
  const seen = new Set<string>();

  // Solved problems render as anchors to /practice/.../<slug>/
  const re = /<a[^>]+href="(\/(?:practice|challenges)\/[a-z0-9-/]*?\/([a-z0-9-]+)\/?)"[^>]*>([^<]{2,200})<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const path = m[1];
    const slug = m[2];
    const title = decode(m[3].trim());
    if (!/^[a-z0-9-]+$/.test(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);

    // Best-effort difficulty hint from the path.
    const diff: 'easy' | 'medium' | 'hard' | 'unknown' = /easy/i.test(path)
      ? 'easy'
      : /medium/i.test(path)
        ? 'medium'
        : /hard/i.test(path)
          ? 'hard'
          : 'unknown';

    // Topic hint from path segments.
    const segments = path.split('/').filter(Boolean);
    const topicCandidates = segments.filter(
      (s) =>
        s !== slug &&
        !['practice', 'challenges', 'algorithm', 'data-structures'].includes(s)
    );

    out.push({
      externalId: `he:${slug}`,
      problemId: slug,
      problemTitle: title,
      problemUrl: `https://www.hackerearth.com${path}`,
      topics: normalizeTopics(topicCandidates),
      difficulty: diff,
      status: 'accepted', // public profile only lists solved
      language: '',
      submittedAt: new Date(),
    });
  }
  return out;
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
