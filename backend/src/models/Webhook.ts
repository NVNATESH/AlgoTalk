import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

/**
 * User-configured outgoing webhook. When an event the user subscribed to fires,
 * we POST `{ event, data, deliveredAt }` to `url` with a signed `X-LearnHub-Signature`
 * HMAC-SHA256 of the raw body using `secret` so the receiver can verify origin.
 *
 * `events: ['*']` means "all". Subscribed events are flat strings like
 * `notification.goal_completed`, `submission.accepted`, `contest.report.ready`.
 */

const webhookSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    label: { type: String, default: '' },
    events: { type: [String], default: ['*'] },
    secret: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    lastDeliveredAt: { type: Date, default: null },
    lastStatus: { type: Number, default: null },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

webhookSchema.index({ userId: 1, active: 1 });

export type WebhookDoc = InferSchemaType<typeof webhookSchema> & { _id: Types.ObjectId };
export const Webhook: Model<WebhookDoc> = model<WebhookDoc>('Webhook', webhookSchema);

/**
 * Per-user incoming webhook token. Pasting `POST /api/webhooks/incoming/:token`
 * with a JSON body is how a user logs activity from sources we don't natively
 * support (e.g. their own scripts).
 */
const incomingTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: '' },
    lastUsedAt: { type: Date, default: null },
    usageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type IncomingTokenDoc = InferSchemaType<typeof incomingTokenSchema> & {
  _id: Types.ObjectId;
};
export const IncomingWebhookToken: Model<IncomingTokenDoc> = model<IncomingTokenDoc>(
  'IncomingWebhookToken',
  incomingTokenSchema
);
