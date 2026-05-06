import { Integration, type Platform } from '../models/Integration.js';
import { manualSync } from './integrationService.js';
import { syncUpcomingContests } from './contestAggregator.js';
import { tickLiveContests } from './liveContestTracker.js';
import { tickRatingChanges } from './ratingChangeIngester.js';
import { runGoalAdaptation } from './goalAdaptation.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Periodic in-process background sync.
 *
 * Every SYNC_TICK_MIN minutes, find integrations where lastSyncAt is older than
 * SYNC_TTL_HOURS, and re-sync them. Concurrency capped at SYNC_MAX_CONCURRENT
 * across the whole user base.
 *
 * Why in-process rather than BullMQ? Avoids a Redis dependency for dev. The
 * function shape (`syncOne`) is queue-friendly — swap `runTick` for a BullMQ
 * worker any time without touching extractors.
 */

let interval: NodeJS.Timeout | null = null;
let runningCount = 0;
let stopRequested = false;

const TICK_MIN = Number(process.env.SYNC_TICK_MIN ?? 5);
const TTL_HOURS = Number(process.env.SYNC_TTL_HOURS ?? 6);
const MAX_CONCURRENT = Number(process.env.SYNC_MAX_CONCURRENT ?? 3);
const ENABLED = (process.env.BACKGROUND_SYNC ?? 'on').toLowerCase() !== 'off';

export function startSyncScheduler() {
  if (!ENABLED) {
    logger.info('background sync disabled (BACKGROUND_SYNC=off)');
    return;
  }
  if (interval) return;
  if (env.NODE_ENV === 'test') return;

  logger.info(
    { tickMin: TICK_MIN, ttlHours: TTL_HOURS, maxConcurrent: MAX_CONCURRENT },
    'background sync scheduler started'
  );
  // First tick after a short delay so app finishes booting fully
  setTimeout(() => void runTick(), 30_000);
  interval = setInterval(() => void runTick(), TICK_MIN * 60 * 1000);

  // Upcoming-contests aggregator runs every 30 min on its own cadence
  // (independent of the per-user sync) so the calendar stays fresh for everyone.
  setTimeout(() => void syncUpcomingContests().catch(() => undefined), 60_000);
  setInterval(() => void syncUpcomingContests().catch(() => undefined), 30 * 60 * 1000);

  // Live-contest poller: every 60s look for active UserContests, pull recent
  // submissions from the platform, merge into UserContest.submissions, and
  // auto-trigger the AI report on contest-end (best-effort).
  setTimeout(() => void tickLiveContests().catch(() => undefined), 45_000);
  setInterval(() => void tickLiveContests().catch(() => undefined), 60_000);

  // CF rating-change reconciler: ~30 min cadence. CF publishes deltas a few
  // hours after a rated contest ends; this fills `UserContest.ratingChange`
  // once they're available so the report page shows the actual delta vs the
  // AI's predicted range.
  setTimeout(() => void tickRatingChanges().catch(() => undefined), 5 * 60 * 1000);
  setInterval(() => void tickRatingChanges().catch(() => undefined), 30 * 60 * 1000);

  // Smart goal adaptation: nominally daily; the function self-rate-limits to
  // 12h between runs so calling it twice a day is harmless.
  setTimeout(() => void runGoalAdaptation().catch(() => undefined), 10 * 60 * 1000);
  setInterval(() => void runGoalAdaptation().catch(() => undefined), 12 * 60 * 60 * 1000);
}

export function stopSyncScheduler() {
  stopRequested = true;
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

async function runTick() {
  if (stopRequested) return;
  const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000);

  // pick up to a small batch of stale integrations per tick
  const stale = await Integration.find({
    isActive: true,
    $or: [{ lastSyncAt: { $lt: cutoff } }, { lastSyncAt: null }],
  })
    .sort({ lastSyncAt: 1 })
    .limit(20)
    .lean();

  if (stale.length === 0) return;

  logger.debug({ candidates: stale.length }, 'background sync tick');

  // Run with a concurrency cap
  const queue = [...stale];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
    workers.push(workerLoop(queue));
  }
  await Promise.all(workers);
}

async function workerLoop(queue: any[]) {
  while (queue.length > 0) {
    if (stopRequested) return;
    const item = queue.shift();
    if (!item) return;
    runningCount++;
    try {
      await syncOne(String(item.userId), item.platform as Platform);
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, platform: item.platform, handle: item.handle },
        'background sync failed for one integration'
      );
    } finally {
      runningCount--;
    }
  }
}

async function syncOne(userId: string, platform: Platform) {
  // We re-enter the existing manualSync path so all the bookkeeping (lastSyncAt,
  // status, error, count, submission count) happens identically to user-triggered.
  // The 5-minute cooldown there is fine — auto runs only fire on rows older than
  // TTL_HOURS, which is well past the cooldown window.
  await manualSync(userId, platform).catch((err) => {
    // manualSync throws on cooldown — that's ok, just skip
    if ((err as Error).message?.includes('Synced recently')) return;
    throw err;
  });
}

export function getSchedulerStatus() {
  return {
    enabled: ENABLED,
    tickMin: TICK_MIN,
    ttlHours: TTL_HOURS,
    maxConcurrent: MAX_CONCURRENT,
    running: runningCount,
    active: !!interval,
  };
}
