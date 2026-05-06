import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeTopics } from './topicMap.js';

/**
 * AtCoder extractor — uses the unofficial Kenkoooo AtCoder API
 * (https://kenkoooo.com/atcoder/), which mirrors AtCoder's public data.
 *
 * Submissions: GET /v3/user/submissions?user=<handle>&from_second=<unix>
 * Each entry: {
 *   id, epoch_second, problem_id (e.g. "abc123_a"), contest_id, user_id,
 *   language, point, length, result (AC/WA/TLE/MLE/RE/CE/...), execution_time
 * }
 *
 * The API does NOT return per-problem tags, and AtCoder is generally untagged
 * upstream — so `topics: []` for everything here.
 */

const KENKO_BASE = 'https://kenkoooo.com/atcoder/atcoder-api';

interface AtCoderProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null; // not exposed by Kenkoooo v3 cheaply — left null
  rank: string;
}

export interface AtCoderSubmission {
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

const verdictMap: Record<string, AtCoderSubmission['status']> = {
  AC: 'accepted',
  WA: 'wrong_answer',
  TLE: 'tle',
  MLE: 'mle',
  RE: 'runtime_error',
  CE: 'compile_error',
  IE: 'rejected',
  OLE: 'rejected',
  WJ: 'pending',
  WR: 'pending',
};

// AtCoder doesn't publish topic tags. Difficulty isn't an official attribute
// either — Kenkoooo computes an estimated difficulty score per problem and
// exposes it at /v3/problem-models. We cache the whole map for 6 hours and
// use a heuristic to bin difficulty into easy/medium/hard.
//
// Kenkoooo difficulty scores are roughly Codeforces-style ratings.
const DIFFICULTY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let _difficultyCache: { byProblem: Map<string, number>; fetchedAt: number } | null = null;

async function getDifficultyMap(): Promise<Map<string, number>> {
  const now = Date.now();
  if (_difficultyCache && now - _difficultyCache.fetchedAt < DIFFICULTY_CACHE_TTL_MS) {
    return _difficultyCache.byProblem;
  }
  try {
    const res = await fetch(`${KENKO_BASE}/v3/problem-models`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as Record<
      string,
      { difficulty?: number; is_experimental?: boolean }
    >;
    const map = new Map<string, number>();
    for (const [pid, m] of Object.entries(data)) {
      if (typeof m.difficulty === 'number') map.set(pid, m.difficulty);
    }
    _difficultyCache = { byProblem: map, fetchedAt: now };
    return map;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, 'atcoder difficulty fetch failed');
    // Return a stale cache if we have one, otherwise empty.
    return _difficultyCache?.byProblem ?? new Map();
  }
}

function difficultyBin(score: number | undefined): 'easy' | 'medium' | 'hard' | 'unknown' {
  if (typeof score !== 'number') return 'unknown';
  if (score < 800) return 'easy';
  if (score < 1800) return 'medium';
  return 'hard';
}

/**
 * Fallback when Kenkoooo's problem-models endpoint is unavailable: derive a
 * coarse difficulty from the AtCoder problem-id suffix. Most contest IDs
 * follow `<contest>_<task-letter>` where earlier letters are easier:
 *   a, b      → easy
 *   c, d      → medium
 *   e, f, g+ → hard
 *
 * Older contests use numeric suffixes (e.g. `arc001_1`); we treat 1/2 as easy,
 * 3 as medium, 4+ as hard. Anything we can't pattern-match stays unknown.
 */
function difficultyFromProblemId(problemId: string): 'easy' | 'medium' | 'hard' | 'unknown' {
  const m = problemId.match(/_([a-z0-9]+)$/i);
  if (!m) return 'unknown';
  const tail = m[1].toLowerCase();
  if (/^[a-z]$/.test(tail)) {
    if (tail <= 'b') return 'easy';
    if (tail <= 'd') return 'medium';
    return 'hard';
  }
  if (/^\d+$/.test(tail)) {
    const n = parseInt(tail, 10);
    if (n <= 2) return 'easy';
    if (n === 3) return 'medium';
    return 'hard';
  }
  return 'unknown';
}

async function kenkoGet<T>(path: string): Promise<T> {
  const res = await fetch(`${KENKO_BASE}${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)',
      Accept: 'application/json',
    },
  });
  if (res.status === 404) {
    throw ApiError.notFound('AtCoder user not found');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ status: res.status, text: text.slice(0, 200) }, 'atcoder non-2xx');
    throw new ApiError(502, `AtCoder API returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchAtCoderProfile(handle: string): Promise<AtCoderProfile> {
  // Kenkoooo returns 1 submission to verify the user exists; use that as a
  // smoke check. If the user has zero submissions ever we still treat them as
  // a valid AtCoder account (no way to disprove existence cheaply).
  await kenkoGet<unknown[]>(
    `/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`
  ).catch((err) => {
    if (err instanceof ApiError && err.status === 404) throw err;
    // Kenkoooo returns [] for unknown users (not 404). We can't distinguish.
    // Return empty array so caller treats as 'no submissions yet', not as 404.
    return [];
  });
  return {
    handle,
    displayName: handle,
    avatarUrl: '',
    rating: null,
    rank: '',
  };
}

interface KenkoSubmission {
  id: number;
  epoch_second: number;
  problem_id: string;
  contest_id: string;
  user_id: string;
  language: string;
  point?: number;
  length?: number;
  result: string;
  execution_time?: number | null;
}

export async function fetchAtCoderSubmissions(
  handle: string,
  limit = 200
): Promise<AtCoderSubmission[]> {
  const [list, difficultyByProblem] = await Promise.all([
    kenkoGet<KenkoSubmission[]>(
      `/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`
    ),
    getDifficultyMap(),
  ]);
  if (!Array.isArray(list)) return [];

  // Newest first, capped to `limit`. Kenkoooo returns ascending by epoch.
  const sorted = list.slice().sort((a, b) => b.epoch_second - a.epoch_second).slice(0, limit);

  return sorted.map((s) => {
    const problemId = s.problem_id;
    const url = `https://atcoder.jp/contests/${s.contest_id}/tasks/${s.problem_id}`;
    return {
      externalId: String(s.id),
      problemId,
      problemTitle: s.problem_id, // human title not in this endpoint
      problemUrl: url,
      topics: normalizeTopics([]), // AtCoder problems are officially untagged
      difficulty: (() => {
        const score = difficultyByProblem.get(problemId);
        if (typeof score === 'number') return difficultyBin(score);
        return difficultyFromProblemId(problemId);
      })(),
      status: verdictMap[s.result] ?? 'unknown',
      language: s.language,
      submittedAt: new Date(s.epoch_second * 1000),
    };
  });
}
