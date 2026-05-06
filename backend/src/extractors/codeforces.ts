import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

const BASE = 'https://codeforces.com/api';

interface CodeforcesProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
  maxRating: number | null;
}

export interface CodeforcesSubmission {
  externalId: string;
  problemId: string; // {contestId}{index}, e.g. "1234A"
  problemTitle: string;
  problemUrl: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  rating: number | null;
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

async function cfGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ status: res.status, text: text.slice(0, 200) }, 'codeforces non-2xx');
    throw new ApiError(502, `Codeforces returned ${res.status}`);
  }
  const body = (await res.json()) as { status: string; result?: T; comment?: string };
  if (body.status !== 'OK') {
    if ((body.comment ?? '').toLowerCase().includes('not found')) {
      throw ApiError.notFound(body.comment ?? 'Codeforces user not found');
    }
    throw new ApiError(502, body.comment ?? 'Codeforces error');
  }
  return body.result as T;
}

const verdictMap: Record<string, CodeforcesSubmission['status']> = {
  OK: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT_EXCEEDED: 'tle',
  MEMORY_LIMIT_EXCEEDED: 'mle',
  RUNTIME_ERROR: 'runtime_error',
  COMPILATION_ERROR: 'compile_error',
  REJECTED: 'rejected',
  TESTING: 'pending',
  CHALLENGED: 'rejected',
  PARTIAL: 'rejected',
  PRESENTATION_ERROR: 'wrong_answer',
  IDLENESS_LIMIT_EXCEEDED: 'tle',
  SECURITY_VIOLATED: 'rejected',
  CRASHED: 'runtime_error',
  INPUT_PREPARATION_CRASHED: 'rejected',
  SKIPPED: 'rejected',
};

// Boundaries chosen to line up with CF tier transitions:
//   < 1500  →  easy   (Newbie / Pupil / early Specialist; div2 A-B territory)
//   < 2000  →  medium (Specialist / Expert; div2 C-D, the staple grind range)
//   ≥ 2000  →  hard   (Candidate Master and above; div1-B+ / div2-E+)
const ratingToDifficulty = (rating: number | null): CodeforcesSubmission['difficulty'] => {
  if (rating === null) return 'unknown';
  if (rating < 1500) return 'easy';
  if (rating < 2000) return 'medium';
  return 'hard';
};

// Problemset cache — CF's `user.status` returns rating+tags inline for most
// problems, but older / removed / gym problems often have rating=null and
// tags=[]. We fill those in from a cached `/api/problemset.problems` snapshot
// (one bulk endpoint listing all official problems with ratings + tags).
const PROBLEMSET_TTL_MS = 6 * 60 * 60 * 1000;
let _problemsetCache: {
  byId: Map<string, { rating: number | null; tags: string[] }>;
  fetchedAt: number;
} | null = null;

async function getProblemsetMeta(): Promise<Map<string, { rating: number | null; tags: string[] }>> {
  const now = Date.now();
  if (_problemsetCache && now - _problemsetCache.fetchedAt < PROBLEMSET_TTL_MS) {
    return _problemsetCache.byId;
  }
  try {
    interface CfProblemRow {
      contestId?: number;
      index: string;
      rating?: number;
      tags?: string[];
    }
    const data = await cfGet<{ problems: CfProblemRow[] }>('/problemset.problems');
    const byId = new Map<string, { rating: number | null; tags: string[] }>();
    for (const p of data.problems ?? []) {
      if (!p.contestId) continue;
      const id = `${p.contestId}${p.index}`;
      byId.set(id, { rating: p.rating ?? null, tags: p.tags ?? [] });
    }
    _problemsetCache = { byId, fetchedAt: now };
    return byId;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, 'codeforces problemset.problems fetch failed');
    // Fall back to stale cache if we have one, else empty.
    return _problemsetCache?.byId ?? new Map();
  }
}

export async function fetchCodeforcesProfile(handle: string): Promise<CodeforcesProfile> {
  interface UserInfoRow {
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    avatar?: string;
    titlePhoto?: string;
    firstName?: string;
    lastName?: string;
  }
  const arr = await cfGet<UserInfoRow[]>(`/user.info?handles=${encodeURIComponent(handle)}`);
  if (!arr || arr.length === 0) {
    throw ApiError.notFound(`Codeforces user "${handle}" not found`);
  }
  const u = arr[0];
  return {
    handle: u.handle,
    displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.handle,
    avatarUrl: u.titlePhoto ?? u.avatar ?? '',
    rating: u.rating ?? null,
    maxRating: u.maxRating ?? null,
    rank: u.rank ?? '',
  };
}

export async function fetchCodeforcesSubmissions(
  handle: string,
  count = 5000
): Promise<CodeforcesSubmission[]> {
  interface CfProblem {
    contestId?: number;
    index: string;
    name: string;
    rating?: number;
    tags?: string[];
  }
  interface CfSubmission {
    id: number;
    creationTimeSeconds: number;
    problem: CfProblem;
    programmingLanguage: string;
    verdict?: string;
  }

  // Codeforces caps a single user.status call at 10,000 entries server-side
  // but in practice pages of 1000 are reliable and avoid timeout/payload
  // issues. We page from=1 forward until either we hit `count` rows or the
  // server returns fewer than a full page (= we've reached the bottom).
  const PAGE = 1000;
  const list: CfSubmission[] = [];
  for (let from = 1; list.length < count; from += PAGE) {
    const batch = await cfGet<CfSubmission[]>(
      `/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${Math.min(
        PAGE,
        count - list.length
      )}`
    );
    if (!batch || batch.length === 0) break;
    list.push(...batch);
    if (batch.length < PAGE) break; // exhausted
  }
  const problemsetMeta = await getProblemsetMeta();

  return list.map((s) => {
    const problemId = s.problem.contestId ? `${s.problem.contestId}${s.problem.index}` : s.problem.index;
    const url = s.problem.contestId
      ? `https://codeforces.com/contest/${s.problem.contestId}/problem/${s.problem.index}`
      : 'https://codeforces.com/problemset';
    const v = s.verdict ?? '';

    // Fall back to the problemset.problems cache when the user.status entry
    // omits rating or tags — common for older/gym problems.
    const inlineRating = s.problem.rating ?? null;
    const inlineTags = s.problem.tags ?? [];
    const meta = inlineRating === null || inlineTags.length === 0
      ? problemsetMeta.get(problemId)
      : undefined;
    const rating = inlineRating ?? meta?.rating ?? null;
    const tags = inlineTags.length > 0 ? inlineTags : meta?.tags ?? [];

    return {
      externalId: String(s.id),
      problemId,
      problemTitle: s.problem.name,
      problemUrl: url,
      topics: normalizeTopics(tags),
      difficulty: ratingToDifficulty(rating),
      rating,
      status: verdictMap[v] ?? 'unknown',
      language: s.programmingLanguage,
      submittedAt: new Date(s.creationTimeSeconds * 1000),
    } as CodeforcesSubmission;
  });
}
