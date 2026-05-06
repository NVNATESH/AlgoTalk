import { Types } from 'mongoose';
import { Contest } from '../models/Contest.js';
import { UserContest } from '../models/UserContest.js';
import { Integration } from '../models/Integration.js';
import { logger } from '../config/logger.js';

/**
 * Codeforces rating-change ingester.
 *
 * After a CF contest is officially rated (typically ~24h after end), CF
 * publishes the rating deltas at:
 *   https://codeforces.com/api/contest.ratingChanges?contestId=<id>
 *
 * For every UserContest where:
 *   - platform is codeforces
 *   - status is 'ended' or 'analyzed'
 *   - ratingChange is null
 *   - the contest ended ≥1h ago (give CF time to publish)
 *
 * we look up the user's CF handle, hit the rating-changes endpoint, find their
 * row, and persist `newRating - oldRating` into `UserContest.ratingChange`.
 * Idempotent — once filled, we skip.
 *
 * Runs as part of the periodic scheduler tick (cheap; only touches contests
 * with missing data, and the API call is one cheap GET per CF contest).
 */

interface CfRatingRow {
  contestId: number;
  handle: string;
  rank: number;
  oldRating: number;
  newRating: number;
}

const handleByContestCache = new Map<string, { rows: CfRatingRow[]; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — once rated, the data doesn't churn

async function fetchRatingChanges(contestExternalId: string): Promise<CfRatingRow[] | null> {
  const cached = handleByContestCache.get(contestExternalId);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.rows;

  try {
    const res = await fetch(
      `https://codeforces.com/api/contest.ratingChanges?contestId=${encodeURIComponent(contestExternalId)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LearnHub/0.1)' } }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { status: string; result?: CfRatingRow[]; comment?: string };
    if (body.status !== 'OK' || !body.result) {
      // CF returns "OK" with empty array if contest isn't rated yet, or
      // FAILED with a "rating changes are not available" comment.
      return null;
    }
    handleByContestCache.set(contestExternalId, { rows: body.result, fetchedAt: now });
    return body.result;
  } catch {
    return null;
  }
}

export async function tickRatingChanges(): Promise<{
  examined: number;
  filled: number;
  unrated: number;
}> {
  const summary = { examined: 0, filled: 0, unrated: 0 };
  const minEndedAt = new Date(Date.now() - 60 * 60 * 1000); // ≥1h ago

  // Find candidate contests that need a rating reconciliation.
  const candidates = await UserContest.aggregate([
    { $match: { ratingChange: null, status: { $in: ['ended', 'analyzed'] } } },
    {
      $lookup: {
        from: 'contests',
        localField: 'contestId',
        foreignField: '_id',
        as: 'contest',
      },
    },
    { $unwind: '$contest' },
    {
      $match: {
        'contest.platform': 'codeforces',
        'contest.endTime': { $lt: minEndedAt },
      },
    },
    { $limit: 50 }, // safety cap per tick
  ]);

  if (candidates.length === 0) return summary;

  // Group by contest externalId so we hit the API once per contest.
  const byContest = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const ext = String(c.contest.externalId);
    if (!byContest.has(ext)) byContest.set(ext, []);
    byContest.get(ext)!.push(c);
  }

  for (const [externalId, regs] of byContest.entries()) {
    summary.examined += regs.length;
    const rows = await fetchRatingChanges(externalId);
    if (!rows) {
      // Not rated yet (or upstream error) — skip; we'll retry next tick.
      summary.unrated += regs.length;
      continue;
    }
    const byHandle = new Map(rows.map((r) => [r.handle.toLowerCase(), r]));

    for (const reg of regs) {
      // Look up the user's CF handle from their integration.
      const integration = await Integration.findOne({
        userId: reg.userId,
        platform: 'codeforces',
      })
        .select('handle')
        .lean();
      if (!integration) continue;
      const row = byHandle.get(integration.handle.toLowerCase());
      if (!row) continue; // user didn't participate in the rated standings
      const delta = row.newRating - row.oldRating;
      await UserContest.updateOne(
        { _id: reg._id },
        { $set: { ratingChange: delta, rank: reg.rank ?? row.rank } }
      );
      summary.filled++;
    }
  }

  if (summary.examined > 0) {
    logger.info(summary, 'CF rating changes reconciled');
  }
  return summary;
}
