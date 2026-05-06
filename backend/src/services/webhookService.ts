import crypto from 'node:crypto';
import { Webhook, IncomingWebhookToken } from '../models/Webhook.js';
import { logger } from '../config/logger.js';

/**
 * Fan an event out to every active webhook the user has subscribed for.
 * Best-effort, never throws — webhook failures must not break the main flow.
 *
 * Signature: `sha256=<hex>` of the raw JSON body keyed by the webhook's secret.
 * Receivers compute the same HMAC over the raw body and compare in constant time.
 */
export async function fanoutWebhook(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  let hooks: Array<any>;
  try {
    hooks = await Webhook.find({ userId, active: true }).select('+secret').lean();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'webhook fanout query failed');
    return;
  }
  if (hooks.length === 0) return;

  const body = JSON.stringify({ event, data, deliveredAt: new Date().toISOString() });
  await Promise.all(
    hooks.map(async (h) => {
      // Subscription filter — '*' matches all, otherwise exact event or
      // namespace prefix match (e.g. 'notification.*' matches 'notification.x').
      if (!matchesEvent(h.events, event)) return;
      const sig = crypto.createHmac('sha256', h.secret).update(body).digest('hex');
      try {
        const r = await withTimeout(
          fetch(h.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-LearnHub-Event': event,
              'X-LearnHub-Signature': `sha256=${sig}`,
              'User-Agent': 'LearnHub-Webhook/1.0',
            },
            body,
          }),
          8000
        );
        await Webhook.updateOne(
          { _id: h._id },
          {
            $set: {
              lastDeliveredAt: new Date(),
              lastStatus: r.status,
              ...(r.ok ? { failureCount: 0 } : {}),
            },
            ...(!r.ok ? { $inc: { failureCount: 1 } } : {}),
          }
        );
        // Auto-disable a webhook after 10 consecutive failures so we stop hammering
        // a dead URL forever. User can re-enable manually from settings.
        if (!r.ok && (h.failureCount ?? 0) + 1 >= 10) {
          await Webhook.updateOne({ _id: h._id }, { $set: { active: false } });
        }
      } catch (err) {
        await Webhook.updateOne(
          { _id: h._id },
          { $inc: { failureCount: 1 }, $set: { lastStatus: 0 } }
        ).catch(() => undefined);
        logger.debug(
          { err: (err as Error).message, url: h.url, event },
          'webhook delivery failed'
        );
      }
    })
  );
}

function matchesEvent(subscribed: string[], event: string): boolean {
  if (!subscribed || subscribed.length === 0) return false;
  if (subscribed.includes('*')) return true;
  if (subscribed.includes(event)) return true;
  // Namespace wildcards: 'notification.*' matches 'notification.foo'
  for (const s of subscribed) {
    if (s.endsWith('.*') && event.startsWith(s.slice(0, -1))) return true;
  }
  return false;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('webhook timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export function newIncomingToken(): string {
  // 24-byte url-safe random — collision chance is negligible at any scale we care
  // about; the model has a unique index as a backstop.
  return crypto.randomBytes(24).toString('base64url');
}

export async function recordIncomingUsage(tokenId: string): Promise<void> {
  await IncomingWebhookToken.updateOne(
    { _id: tokenId },
    { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } }
  ).catch(() => undefined);
}

export function newWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(20).toString('base64url')}`;
}
