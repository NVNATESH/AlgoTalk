/**
 * Validates AI-generated learning-resource recommendations before they reach
 * the database / UI. The model can hallucinate URLs, dump dead links, or
 * recommend the same blog post under three different titles — this layer
 * filters that out so downstream code can trust the array.
 *
 * Used by:
 *   - codeReviewService (per-submission recommendations)
 *   - contestService    (contest-replay analysis recommendations)
 *
 * Keeping a single sanitizer means a future change to allowed types/domains
 * propagates everywhere recommendations land.
 */

export type ResourceType =
  | 'article'
  | 'video'
  | 'blog'
  | 'docs'
  | 'repo'
  | 'problem'
  | 'course';

export interface LearningResource {
  type: ResourceType;
  title: string;
  url: string;
  // Topic tag used to dedupe across reviews and to cluster on the /resources
  // page — empty string means the model didn't tag it.
  topic: string;
  // 1-sentence rationale shown under the link in the UI.
  why: string;
}

const VALID_TYPES: ResourceType[] = [
  'article',
  'video',
  'blog',
  'docs',
  'repo',
  'problem',
  'course',
];

// Domains we trust enough to display without an extra "external link" warning.
// The list is intentionally narrow — we'd rather drop a dubious link than
// show a recommendation that takes the user somewhere shady. Add to it as
// new sources prove themselves.
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  /^(www\.)?youtube\.com$/i,
  /^youtu\.be$/i,
  /^(.+\.)?leetcode\.com$/i,
  /^(.+\.)?codeforces\.com$/i,
  /^(.+\.)?codechef\.com$/i,
  /^(.+\.)?atcoder\.jp$/i,
  /^(.+\.)?hackerrank\.com$/i,
  /^(.+\.)?hackerearth\.com$/i,
  /^(.+\.)?geeksforgeeks\.org$/i,
  /^(.+\.)?cp-algorithms\.com$/i,
  /^(.+\.)?usaco\.guide$/i,
  /^(.+\.)?cses\.fi$/i,
  /^(.+\.)?topcoder\.com$/i,
  /^(.+\.)?dev\.to$/i,
  /^(.+\.)?medium\.com$/i,
  /^(.+\.)?freecodecamp\.org$/i,
  /^(.+\.)?codingame\.com$/i,
  /^(.+\.)?kaggle\.com$/i,
  /^(.+\.)?github\.com$/i,
  /^(.+\.)?stackoverflow\.com$/i,
  /^(.+\.)?stackexchange\.com$/i,
  /^(.+\.)?wikipedia\.org$/i,
  /^(.+\.)?mit\.edu$/i,
  /^(.+\.)?stanford\.edu$/i,
  /^(.+\.)?oeis\.org$/i,
  /^(.+\.)?neetcode\.io$/i,
  /^(.+\.)?programiz\.com$/i,
  /^(.+\.)?w3schools\.com$/i,
  /^(.+\.)?developer\.mozilla\.org$/i,
  /^(.+\.)?docs\.python\.org$/i,
  /^(.+\.)?cppreference\.com$/i,
  /^(.+\.)?en\.cppreference\.com$/i,
  /^(.+\.)?docs\.oracle\.com$/i,
];

function isHostAllowed(hostname: string): boolean {
  return ALLOWED_HOST_PATTERNS.some((re) => re.test(hostname));
}

export function sanitizeResources(
  raw: unknown,
  opts: { max?: number } = {}
): LearningResource[] {
  if (!Array.isArray(raw)) return [];
  const max = opts.max ?? 6;

  const out: LearningResource[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const obj = r as Record<string, unknown>;

    const type = String(obj.type ?? '').toLowerCase();
    if (!VALID_TYPES.includes(type as ResourceType)) continue;

    const title = String(obj.title ?? '').trim();
    if (!title || title.length > 300) continue;

    const url = String(obj.url ?? '').trim();
    if (!url) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;
    if (!isHostAllowed(parsed.hostname)) continue;

    // Drop bare-host suggestions ("https://leetcode.com/") — these are
    // typically the model giving up; a real recommendation has a path.
    if (parsed.pathname === '/' || parsed.pathname === '') continue;

    const normalizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    if (seenUrls.has(normalizedUrl)) continue;
    const normalizedTitle = title.toLowerCase();
    if (seenTitles.has(normalizedTitle)) continue;

    seenUrls.add(normalizedUrl);
    seenTitles.add(normalizedTitle);

    out.push({
      type: type as ResourceType,
      title,
      url,
      topic: typeof obj.topic === 'string' ? obj.topic.slice(0, 80) : '',
      why: typeof obj.why === 'string' ? obj.why.slice(0, 240) : '',
    });

    if (out.length >= max) break;
  }
  return out;
}
