import { Problem } from '../models/Problem.js';
import { logger } from '../config/logger.js';
import { geminiJSON } from './gemini.js';
import { rateProblemsBatchPrompt } from '../prompts/ratingEstimator.js';

const BATCH_SIZE = 5; // small batches keep Gemini focused and JSON parseable

interface BatchResponse {
  ratings: Array<{ slug: string; rating: number; rationale?: string }>;
}

function clampRating(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const clamped = Math.max(800, Math.min(3500, Math.round(n / 100) * 100));
  return clamped;
}

export interface EstimateRatingsResult {
  estimated: number;
  skipped: number;
  total: number;
  failures: number;
}

/**
 * Estimate (or re-estimate) CF-equivalent ratings for LearnHub problems.
 * - When `force: false` (default), only problems with `cfEquivRating === null` are touched.
 * - When `force: true`, every problem gets a fresh estimate (overrides existing).
 *
 * Runs in small batches sequentially so a single AI rate-limit hit doesn't
 * abort the whole sweep — failed batches log and continue.
 */
export async function estimateProblemRatings(
  opts: { force?: boolean } = {}
): Promise<EstimateRatingsResult> {
  const filter = opts.force ? {} : { cfEquivRating: null };
  const problems = await Problem.find(filter)
    .select('slug title difficulty tags description constraints')
    .lean();

  if (problems.length === 0) {
    return { estimated: 0, skipped: 0, total: 0, failures: 0 };
  }

  let estimated = 0;
  let failures = 0;

  for (let i = 0; i < problems.length; i += BATCH_SIZE) {
    const batch = problems.slice(i, i + BATCH_SIZE);
    try {
      const out = await geminiJSON<BatchResponse>(
        rateProblemsBatchPrompt(
          batch.map((p: any) => ({
            slug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            tags: p.tags ?? [],
            description: p.description ?? '',
            constraints: p.constraints ?? '',
          }))
        )
      );
      const bySlug = new Map(
        (out.ratings ?? [])
          .map((r) => [r.slug, clampRating(r.rating)] as const)
          .filter(([, r]) => r !== null)
      );
      const now = new Date();
      const ops = batch
        .map((p: any) => {
          const rating = bySlug.get(p.slug);
          if (rating === null || rating === undefined) return null;
          return {
            updateOne: {
              filter: { _id: p._id },
              update: { $set: { cfEquivRating: rating, cfEquivRatingEstimatedAt: now } },
            },
          };
        })
        .filter((op): op is NonNullable<typeof op> => op !== null);
      if (ops.length > 0) {
        await Problem.bulkWrite(ops as any, { ordered: false });
        estimated += ops.length;
      }
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, batchStart: i, batchSize: batch.length },
        'rating estimate batch failed'
      );
      failures += batch.length;
    }
  }

  return {
    estimated,
    skipped: problems.length - estimated - failures,
    total: problems.length,
    failures,
  };
}
