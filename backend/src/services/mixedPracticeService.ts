import { Types } from 'mongoose';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON } from './gemini.js';
import { computeOverview } from './analyzerService.js';
import {
  buildMixedPracticePrompt,
  type MixedPracticeContext,
  type MixedPracticeResponse,
} from '../prompts/mixedPractice.js';
import { TtlCache } from '../utils/ttlCache.js';

export interface MixedPracticeRequest {
  topics: string[];
  difficulty?: ('Easy' | 'Medium' | 'Hard')[];
  count?: number;
  mode?: 'practice' | 'timed' | 'contest';
  durationMinutes?: number;
  companies?: string[];
}

export interface MixedPracticeResult {
  topics: string[];
  count: number;
  mode: 'practice' | 'timed' | 'contest';
  problems: Array<{
    slug: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    companyTags: string[];
  }>;
  insights: MixedPracticeResponse;
  weakTopicCoverage: { topic: string; problems: number }[];
}

// 5-minute cache so a user reloading the analyzer doesn't burn AI calls.
const cache = new TtlCache<MixedPracticeResult>(5 * 60_000);

const cacheKey = (userId: string, req: MixedPracticeRequest) =>
  [
    userId,
    [...req.topics].sort().join('|'),
    (req.difficulty ?? []).sort().join(','),
    req.count ?? 8,
    req.mode ?? 'practice',
    req.durationMinutes ?? 0,
    (req.companies ?? []).sort().join(','),
  ].join('::');

export async function generateMixedPractice(
  userId: string,
  req: MixedPracticeRequest
): Promise<MixedPracticeResult> {
  if (!req.topics?.length) throw ApiError.badRequest('Pick at least one topic');
  if (req.topics.length > 6) throw ApiError.badRequest('Pick at most 6 topics');

  const count = Math.min(20, Math.max(3, req.count ?? 8));
  const mode = req.mode ?? 'practice';
  const difficultyFilter = req.difficulty?.length
    ? req.difficulty
    : (['Easy', 'Medium', 'Hard'] as const);

  return cache.wrap(cacheKey(userId, { ...req, count, mode, difficulty: [...difficultyFilter] }), async () => {
    // Pull candidate problems matching ANY requested topic — over-fetch so the
    // AI has options. Prefer unattempted ones first.
    const filter: Record<string, unknown> = {
      tags: { $in: req.topics },
      difficulty: { $in: difficultyFilter },
    };
    if (req.companies?.length) {
      filter.companyTags = { $in: req.companies };
    }
    const candidates = await Problem.find(filter)
      .select('_id slug title difficulty tags companyTags')
      .limit(120)
      .lean();
    if (candidates.length === 0) {
      throw ApiError.badRequest(
        'No problems match those topics + difficulty in your catalog yet — broaden the filters.'
      );
    }

    // Mark which the user already accepted so we can prefer fresh problems.
    const userObjId = new Types.ObjectId(userId);
    const accepted = await Submission.find({
      userId: userObjId,
      problemId: { $in: candidates.map((c) => c._id) },
      status: 'accepted',
    })
      .select('problemId')
      .lean();
    const acceptedIds = new Set(accepted.map((s) => String(s.problemId)));

    const fresh = candidates.filter((c) => !acceptedIds.has(String(c._id)));
    const seen = candidates.filter((c) => acceptedIds.has(String(c._id)));
    // Hand the AI fresh first, then seen problems for context.
    const orderedCatalog = [...fresh, ...seen].slice(0, 80);

    // Get user mastery context for weak/strong topics + level.
    const overview = await computeOverview(userId).catch(() => null);
    const weakTopics =
      overview?.topicMastery
        .filter((t) => t.attempted >= 2 && t.mastery < 50)
        .map((t) => t.topic)
        .slice(0, 6) ?? [];
    const strongTopics =
      overview?.topicMastery
        .filter((t) => t.mastery >= 70)
        .map((t) => t.topic)
        .slice(0, 6) ?? [];
    const userLevel = inferLevel(overview?.totals.distinctSolved ?? 0);

    const ctx: MixedPracticeContext = {
      topics: req.topics,
      difficulty: [...difficultyFilter],
      count,
      userLevel,
      weakTopics,
      strongTopics,
      catalog: orderedCatalog.map((c) => ({
        slug: c.slug,
        title: c.title,
        difficulty: c.difficulty as 'Easy' | 'Medium' | 'Hard',
        tags: c.tags ?? [],
      })),
      mode,
      durationMinutes: req.durationMinutes,
    };

    let insights: MixedPracticeResponse;
    try {
      insights = await geminiJSON<MixedPracticeResponse>(buildMixedPracticePrompt(ctx));
    } catch {
      // Fallback — pure heuristic pick if AI is unavailable. Spread across
      // topics + lean toward weak topics with a difficulty curve.
      insights = heuristicFallback(orderedCatalog as any, ctx);
    }

    const validSlugs = new Set(orderedCatalog.map((c) => c.slug));
    const picked = (insights.pickedSlugs || []).filter((s) => validSlugs.has(s)).slice(0, count);

    // If the AI returned too few valid slugs, top up with heuristic picks.
    if (picked.length < count) {
      const need = count - picked.length;
      const taken = new Set(picked);
      for (const c of orderedCatalog) {
        if (taken.has(c.slug)) continue;
        picked.push(c.slug);
        taken.add(c.slug);
        if (picked.length >= count) break;
      }
      void need;
    }

    const slugIndex = new Map(orderedCatalog.map((c) => [c.slug, c] as const));
    const problems = picked
      .map((s) => {
        const c = slugIndex.get(s);
        if (!c) return null;
        return {
          slug: c.slug,
          title: c.title,
          difficulty: c.difficulty as 'Easy' | 'Medium' | 'Hard',
          tags: c.tags ?? [],
          companyTags: c.companyTags ?? [],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Coverage stats for weak topics
    const weakSet = new Set(weakTopics);
    const weakCov = new Map<string, number>();
    for (const p of problems) {
      for (const t of p.tags) {
        if (weakSet.has(t)) weakCov.set(t, (weakCov.get(t) ?? 0) + 1);
      }
    }
    const weakTopicCoverage = Array.from(weakCov.entries())
      .map(([topic, problems]) => ({ topic, problems }))
      .sort((a, b) => b.problems - a.problems);

    return {
      topics: req.topics,
      count: problems.length,
      mode,
      problems,
      insights,
      weakTopicCoverage,
    };
  });
}

function inferLevel(solved: number): string {
  if (solved >= 500) return 'Master';
  if (solved >= 200) return 'Advanced';
  if (solved >= 50) return 'Intermediate';
  return 'Beginner';
}

function heuristicFallback(
  catalog: Array<{ slug: string; title: string; difficulty: string; tags: string[] }>,
  ctx: MixedPracticeContext
): MixedPracticeResponse {
  const want = ctx.count;
  const byDifficulty: Record<string, typeof catalog> = { Easy: [], Medium: [], Hard: [] };
  for (const c of catalog) {
    if (byDifficulty[c.difficulty]) byDifficulty[c.difficulty].push(c);
  }
  const order = ctx.mode === 'practice' ? ['Easy', 'Medium', 'Hard'] : ['Easy', 'Medium', 'Hard'];
  const picked: typeof catalog = [];
  let bucket = 0;
  while (picked.length < want) {
    const d = order[bucket % order.length];
    const list = byDifficulty[d] ?? [];
    if (list.length === 0) {
      bucket++;
      if (bucket > 8) break;
      continue;
    }
    const next = list.shift();
    if (next) picked.push(next);
    bucket++;
  }
  return {
    pickedSlugs: picked.slice(0, want).map((p) => p.slug),
    reasoning: `Heuristic mix across ${ctx.topics.join(' + ')} — AI was unavailable so we balanced difficulty.`,
    difficulty_curve: 'Alternating Easy → Medium → Hard for steady progression.',
    weak_topic_focus: ctx.weakTopics.length
      ? `Targets weak topics: ${ctx.weakTopics.slice(0, 3).join(', ')}`
      : 'No weak topics flagged yet — broad coverage instead.',
    daily_plan: [
      { day: 1, focus: 'Warm up with the easier picks', problems: picked.slice(0, Math.ceil(want / 2)).map((p) => p.slug) },
      { day: 2, focus: 'Push through medium/hard', problems: picked.slice(Math.ceil(want / 2)).map((p) => p.slug) },
    ],
    expected_outcome: 'Solid pattern recognition across the chosen mix.',
  };
}
