import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/notificationService.js';
import { NOTIFICATION_TYPES, type NotificationType } from '../models/Notification.js';

const typeSchema = z.enum(NOTIFICATION_TYPES);

export const list = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const type =
    typeof req.query.type === 'string'
      ? typeSchema.safeParse(req.query.type)
      : null;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const before =
    typeof req.query.before === 'string' ? new Date(req.query.before) : undefined;
  const notifications = await svc.listForUser(req.userId, {
    unreadOnly,
    type: type && type.success ? (type.data as NotificationType) : undefined,
    limit,
    before: before && !isNaN(before.getTime()) ? before : undefined,
  });
  const unread = await svc.unreadCount(req.userId);
  res.json({ notifications, unreadCount: unread });
});

export const unreadCount = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const count = await svc.unreadCount(req.userId);
  res.json({ unreadCount: count });
});

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
});

export const markRead = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.markRead(req.userId, req.body.ids);
  const unread = await svc.unreadCount(req.userId);
  res.json({ unreadCount: unread });
});

export const markAllRead = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.markAllRead(req.userId);
  res.json({ unreadCount: 0 });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.removeNotification(req.userId, req.params.id);
  res.status(204).end();
});

export const clearAll = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.clearAll(req.userId);
  res.status(204).end();
});

/**
 * Admin-only diagnostic endpoint. Emits a single notification to the calling
 * user — useful for verifying the realtime WS path is delivering pushes.
 */
export const emitTest = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  if (req.userRole !== 'admin') throw ApiError.forbidden('Admin only');
  await svc.emitNotification({
    userId: req.userId,
    type: 'mentor_replied',
    title: '🔔 Test notification',
    message: 'If you see this as a slide-in toast, the realtime WS is working.',
    icon: '🔔',
    priority: 'low',
  });
  res.json({ ok: true });
});
