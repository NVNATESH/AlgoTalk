import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'badge_earned',
  'goal_completed',
  'goal_module_completed',
  'quiz_passed',
  'challenge_posted',
  'challenge_won',
  'challenge_resolved',
  'sync_complete',
  'sync_failed',
  'group_joined',
  'mentor_replied',
  'contest_started',
  'contest_report_ready',
  // Automation types
  'goal_reminder',
  'weekly_report',
  'ai_plan_ready',
  'streak_alert',
  'goal_deadline_near',
  'admin_announcement',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, default: '', maxlength: 500 },
    icon: { type: String, default: '' }, // emoji
    link: { type: String, default: null }, // app-relative link, e.g. "/groups/123"
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
  _id: Types.ObjectId;
};

export const Notification: Model<NotificationDoc> = model<NotificationDoc>(
  'Notification',
  notificationSchema
);

export const notificationToJSON = (n: any) => ({
  id: String(n._id),
  type: n.type,
  title: n.title,
  message: n.message,
  icon: n.icon,
  link: n.link,
  priority: n.priority,
  read: n.read,
  readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
  metadata: n.metadata ?? {},
  createdAt: new Date(n.createdAt).toISOString(),
});
