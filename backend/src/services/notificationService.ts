import { Types } from 'mongoose';
import { Notification, notificationToJSON, type NotificationType } from '../models/Notification.js';
import { User } from '../models/User.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { pushToUser } from '../notify/notifyServer.js';
import { mailer } from './mailer.js';
import { fanoutWebhook } from './webhookService.js';

// Notification types that warrant a real email (not just an in-app toast).
// Keep this conservative — every entry here is one extra email in the user's
// inbox per occurrence. High-signal lifecycle events only.
const EMAIL_WORTHY_TYPES = new Set<NotificationType>([
  'goal_completed',
  'badge_earned',
  'challenge_won',
  'contest_report_ready',
]);

/**
 * Returns true if the user has opted-in for this notification type.
 * Master switch (`preferences.notifications`) being false suppresses everything;
 * otherwise we look at the per-type map and treat missing keys as opted-in.
 */
async function userAcceptsType(
  userId: string | Types.ObjectId,
  type: NotificationType
): Promise<boolean> {
  try {
    const u = await User.findById(userId).select('preferences').lean();
    if (!u) return true; // user gone — let the upstream Mongo write fail naturally
    const prefs = u.preferences ?? ({} as any);
    if (prefs.notifications === false) return false;
    const perType = (prefs.notificationPrefs ?? {}) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(perType, type) && perType[type] === false) {
      return false;
    }
    return true;
  } catch {
    // Errors here mean we couldn't read prefs — default to delivering (safer
    // than silently dropping legitimate notifications).
    return true;
  }
}

interface EmitInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message?: string;
  icon?: string;
  link?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget. Logs but never throws — a notification failure must NEVER break
 * the underlying business action that produced it.
 */
export async function emitNotification(input: EmitInput): Promise<void> {
  try {
    if (!(await userAcceptsType(input.userId, input.type))) return;
    const doc = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? '',
      icon: input.icon ?? defaultIconFor(input.type),
      link: input.link ?? null,
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? {},
      read: false,
    });
    // Realtime push (best-effort — silently no-ops if the user is offline).
    try {
      pushToUser(String(input.userId), {
        type: 'notification:new',
        payload: notificationToJSON(doc.toObject()),
      });
    } catch (pushErr) {
      logger.debug({ err: (pushErr as Error).message }, 'notify push failed');
    }

    // Email for high-signal lifecycle events. Best-effort, swallowed.
    if (EMAIL_WORTHY_TYPES.has(input.type) || input.priority === 'critical') {
      void sendEmailFor(String(input.userId), input).catch(() => undefined);
    }

    // User-configured outgoing webhooks fire on every emitted notification —
    // the webhookService itself filters by user-selected event subscriptions.
    void fanoutWebhook(String(input.userId), `notification.${input.type}`, {
      id: String((doc as any)._id),
      type: input.type,
      title: input.title,
      message: input.message ?? '',
      link: input.link ?? null,
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? {},
      createdAt: (doc as any).createdAt,
    }).catch(() => undefined);
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, type: input.type, userId: String(input.userId) },
      'failed to emit notification'
    );
  }
}

/** Emit to multiple users in one shot. */
export async function emitNotifications(
  userIds: Array<string | Types.ObjectId>,
  payload: Omit<EmitInput, 'userId'>
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    // Filter recipients by per-type prefs in one query so we don't N+1.
    const allUsers = await User.find({ _id: { $in: userIds as any[] } })
      .select('preferences')
      .lean();
    const accepts = new Set<string>();
    for (const u of allUsers) {
      const prefs = (u.preferences ?? {}) as any;
      if (prefs.notifications === false) continue;
      const perType = (prefs.notificationPrefs ?? {}) as Record<string, unknown>;
      if (
        Object.prototype.hasOwnProperty.call(perType, payload.type) &&
        perType[payload.type] === false
      ) {
        continue;
      }
      accepts.add(String(u._id));
    }
    const filtered = userIds.filter((u) => accepts.has(String(u)));
    if (filtered.length === 0) return;
    const docs = filtered.map((u) => ({
      userId: u,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? '',
      icon: payload.icon ?? defaultIconFor(payload.type),
      link: payload.link ?? null,
      priority: payload.priority ?? 'medium',
      metadata: payload.metadata ?? {},
      read: false,
    }));
    const inserted = await Notification.insertMany(docs, { ordered: false });
    // Realtime push per user — bulk insert returns Documents in input order.
    for (const d of inserted) {
      try {
        pushToUser(String(d.userId), {
          type: 'notification:new',
          payload: notificationToJSON((d as any).toObject ? (d as any).toObject() : d),
        });
      } catch {
        /* swallow per-user push failures */
      }
    }
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, type: payload.type, count: userIds.length },
      'failed to emit batch notifications'
    );
  }
}

async function sendEmailFor(userId: string, input: EmitInput): Promise<void> {
  const u = await User.findById(userId).select('name email isVerified preferences').lean();
  if (!u) return;
  if (!u.isVerified) return; // don't email unverified accounts
  const prefs: any = u.preferences ?? {};
  if (prefs.emailNotifications === false) return; // explicit opt-out
  const link = input.link
    ? input.link.startsWith('http')
      ? input.link
      : `${process.env.CLIENT_URL ?? ''}${input.link}`
    : undefined;
  await mailer.sendNotification(u.email, u.name, input.title, input.message ?? '', link);
}

function defaultIconFor(type: NotificationType): string {
  switch (type) {
    case 'badge_earned':
      return '🏆';
    case 'goal_completed':
      return '🎯';
    case 'goal_module_completed':
      return '✅';
    case 'quiz_passed':
      return '🧠';
    case 'challenge_posted':
      return '📢';
    case 'challenge_won':
      return '🏅';
    case 'challenge_resolved':
      return '⏰';
    case 'sync_complete':
      return '🌐';
    case 'sync_failed':
      return '⚠️';
    case 'group_joined':
      return '👥';
    case 'mentor_replied':
      return '🤖';
    case 'contest_started':
      return '🏁';
    case 'contest_report_ready':
      return '📊';
    default:
      return '🔔';
  }
}

interface ListOpts {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  before?: Date;
}

export async function listForUser(userId: string, opts: ListOpts = {}) {
  const filter: Record<string, unknown> = { userId };
  if (opts.unreadOnly) filter.read = false;
  if (opts.type) filter.type = opts.type;
  if (opts.before) filter.createdAt = { $lt: opts.before };

  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const docs = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map(notificationToJSON);
}

export async function unreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, read: false });
}

export async function markRead(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const objIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (objIds.length === 0) return;
  await Notification.updateMany(
    { _id: { $in: objIds }, userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

export async function markAllRead(userId: string) {
  await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

export async function removeNotification(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Notification not found');
  const res = await Notification.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw ApiError.notFound('Notification not found');
}

export async function clearAll(userId: string) {
  await Notification.deleteMany({ userId });
}
