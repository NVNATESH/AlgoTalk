import { Goal } from '../models/Goal.js';
import { logger } from '../config/logger.js';
import { emitNotification } from './notificationService.js';

/**
 * Smart Goal Adaptation (MASTER_PROMPT Module 3.13).
 *
 * Once a day, walk every active goal and look at its risk score:
 *   - timePct = (now - startDate) / (deadline - startDate)
 *   - progressFrac = goal.progress / 100
 *   - slack = progressFrac - timePct
 *
 * `slack < -0.3` is "behind" — we extend the deadline by enough to bring slack
 * back to -0.1 (still slightly behind, but achievable). Cap one auto-extension
 * per goal per 7 days so we don't keep pushing it indefinitely.
 *
 * Each adaptation fires a `goal_module_completed` notification (reusing an
 * existing type so we don't add another to the prefs UI; the message makes the
 * intent clear). A new dedicated type could be added if this graduates.
 */

const SLACK_BEHIND_THRESHOLD = -0.3;
const SLACK_TARGET = -0.1; // post-extension slack
const MIN_EXTENSION_DAYS = 3;
const MAX_EXTENSION_DAYS = 21;
const COOLDOWN_DAYS = 7;

let lastRunAt = 0;

export async function runGoalAdaptation(): Promise<{
  examined: number;
  adapted: number;
}> {
  const now = Date.now();
  // Hard rate-limit: don't re-evaluate more than once every 12h even if the
  // scheduler calls us more frequently (the scheduler nominally runs daily).
  if (now - lastRunAt < 12 * 60 * 60 * 1000) {
    return { examined: 0, adapted: 0 };
  }
  lastRunAt = now;

  const goals = await Goal.find({ status: 'active' }).select(
    'userId name startDate deadline progress lastAdaptedAt'
  );
  let adapted = 0;
  for (const g of goals) {
    if (!g.startDate || !g.deadline) continue;
    const start = new Date(g.startDate).getTime();
    const end = new Date(g.deadline).getTime();
    if (end <= start || end <= now) continue;

    const timePct = (now - start) / (end - start);
    const progressFrac = (g.progress ?? 0) / 100;
    const slack = progressFrac - timePct;

    if (slack >= SLACK_BEHIND_THRESHOLD) continue;

    // Cooldown: skip if we adapted this goal recently.
    const lastAdapted = (g as any).lastAdaptedAt
      ? new Date((g as any).lastAdaptedAt).getTime()
      : 0;
    if (now - lastAdapted < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) continue;

    // Solve for new end such that progressFrac - (now - start) / (newEnd - start) === SLACK_TARGET
    //   → newEnd = start + (now - start) / (progressFrac - SLACK_TARGET)
    const denom = progressFrac - SLACK_TARGET;
    if (denom <= 0) continue;
    let proposedEnd = start + (now - start) / denom;
    const minEnd = end + MIN_EXTENSION_DAYS * 24 * 60 * 60 * 1000;
    const maxEnd = end + MAX_EXTENSION_DAYS * 24 * 60 * 60 * 1000;
    proposedEnd = Math.max(minEnd, Math.min(maxEnd, proposedEnd));

    const addedDays = Math.round((proposedEnd - end) / (24 * 60 * 60 * 1000));
    g.deadline = new Date(proposedEnd) as any;
    (g as any).lastAdaptedAt = new Date();
    await g.save();
    adapted++;

    void emitNotification({
      userId: String(g.userId),
      type: 'goal_module_completed',
      title: `📅 Deadline auto-extended: ${g.name}`,
      message: `You were behind schedule on this goal — we pushed the deadline ${addedDays} day${addedDays === 1 ? '' : 's'} so you've got room to finish without rushing. You can drag it back on the dashboard timeline if you'd rather hold the original date.`,
      icon: '📅',
      link: `/goals/${String(g._id)}`,
      priority: 'low',
      metadata: { goalId: String(g._id), addedDays, oldDeadline: new Date(end).toISOString() },
    }).catch(() => undefined);
  }

  if (goals.length > 0) {
    logger.info({ examined: goals.length, adapted }, 'goal adaptation tick');
  }
  return { examined: goals.length, adapted };
}
