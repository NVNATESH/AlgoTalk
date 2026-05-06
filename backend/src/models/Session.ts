import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

/**
 * Per-login audit row. We don't bind the refresh token to a specific session
 * (the existing system uses a per-user `refreshTokenVersion`), so individual
 * session revocation cascades to "revoke all sessions for this user" today —
 * but the audit log here is still useful for showing the user what's logged
 * in where, and the model leaves room to wire per-session revocation later.
 */

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    // Cheap UA parse done at insert-time (just OS + browser tokens).
    device: { type: String, default: '' },
    tokenVersion: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: Types.ObjectId };
export const Session: Model<SessionDoc> = model<SessionDoc>('Session', sessionSchema);

export function describeUserAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /Windows NT/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Linux/.test(ua)
        ? 'Linux'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Android/.test(ua)
            ? 'Android'
            : '';
  return os ? `${browser} on ${os}` : browser;
}
