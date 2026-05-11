import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },

    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationExpires: { type: Date, select: false },

    resetToken: { type: String, select: false },
    resetExpires: { type: Date, select: false },

    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },

    profilePic: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    location: { type: String, default: '' },
    education: { type: String, default: '' },

    socialLinks: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },

    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    skills: [{ type: String }],
    xp: { type: Number, default: 0 },
    level: { type: String, default: 'Beginner' },

    preferences: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      notifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: true },
      voiceMuteByDefault: { type: Boolean, default: false },
      // Per-type notification opt-out. Missing keys default to true (opted in).
      // When `notifications` master switch is false, every type is suppressed
      // regardless of this map.
      notificationPrefs: { type: Schema.Types.Mixed, default: {} },
      // Per-type EMAIL opt-out. Independent from `notificationPrefs`: a user
      // may want in-app pings for sync-complete but no email about it.
      // Missing keys default to true ONLY for types in the email-worthy
      // allowlist; everything else stays in-app-only regardless.
      emailNotificationPrefs: { type: Schema.Types.Mixed, default: {} },
    },

    refreshTokenVersion: { type: Number, default: 0 },

    // 2FA / TOTP — `twoFactorPendingSecret` holds the freshly-generated base32
    // secret while the user scans + verifies their first code. Once verified
    // it's promoted to `twoFactorSecret` and `twoFactorEnabled` flips to true.
    // Recovery codes are stored as SHA-256 hashes (one per row); each is
    // single-use — `usedAt` flips when consumed.
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false, default: null },
    twoFactorPendingSecret: { type: String, select: false, default: null },
    twoFactorRecoveryCodes: {
      type: [
        {
          hash: { type: String, required: true },
          usedAt: { type: Date, default: null },
        },
      ],
      default: [],
      select: false,
    },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true }
);

userSchema.index({ xp: -1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };

export const User: Model<UserDoc> = model<UserDoc>('User', userSchema);

export const publicUser = (u: any) => ({
  id: String(u._id),
  name: u.name,
  username: u.username,
  email: u.email,
  isVerified: u.isVerified,
  role: u.role,
  profilePic: u.profilePic,
  bio: u.bio,
  xp: u.xp,
  level: u.level,
  preferences: u.preferences,
  twoFactorEnabled: !!u.twoFactorEnabled,
  createdAt: u.createdAt,
});

export const XP_RANKS = [
  { min: 0,     label: 'Beginner' },
  { min: 200,   label: 'Explorer' },
  { min: 500,   label: 'Solver' },
  { min: 1500,  label: 'Challenger' },
  { min: 4000,  label: 'Expert' },
  { min: 10000, label: 'Master' },
] as const;

export function rankForXP(xp: number): string {
  let rank = 'Beginner';
  for (const r of XP_RANKS) {
    if (xp >= r.min) rank = r.label;
  }
  return rank;
}
