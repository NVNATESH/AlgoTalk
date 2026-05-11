import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

export const SUPPORTED_PLATFORMS = [
  'leetcode',
  'codeforces',
  'codechef',
  'hackerrank',
  'atcoder',
  'gfg',
  'hackerearth',
] as const;
export type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  atcoder: 'AtCoder',
  gfg: 'GeeksforGeeks',
  hackerearth: 'HackerEarth',
};

const integrationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: SUPPORTED_PLATFORMS, required: true },
    handle: { type: String, required: true, trim: true },

    // optional metadata fetched on connect
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    rating: { type: Number, default: null },
    rank: { type: String, default: '' },
    extra: { type: Schema.Types.Mixed, default: {} },

    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: {
      type: String,
      enum: ['ok', 'failed', 'never'],
      default: 'never',
    },
    lastSyncError: { type: String, default: '' },
    syncCount: { type: Number, default: 0 },
    submissionCount: { type: Number, default: 0 },
    // Authoritative count of *distinct accepted problems* on this platform.
    // Computed at sync time as MAX(distinct local-cached AC problemIds,
    // profile-reported total). The profile total is the source of truth when
    // the platform's API hides per-problem enumeration (LeetCode, GFG): the
    // local cache is a lower bound there. For platforms that expose full
    // history (Codeforces, AtCoder, CodeChef) the local count is exact.
    solvedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique: one integration per platform per user
integrationSchema.index({ userId: 1, platform: 1 }, { unique: true });

export type IntegrationDoc = InferSchemaType<typeof integrationSchema> & {
  _id: Types.ObjectId;
};

export const Integration: Model<IntegrationDoc> = model<IntegrationDoc>(
  'Integration',
  integrationSchema
);

export const integrationToJSON = (i: any) => ({
  id: String(i._id),
  platform: i.platform,
  handle: i.handle,
  displayName: i.displayName,
  avatarUrl: i.avatarUrl,
  rating: i.rating,
  rank: i.rank,
  lastSyncAt: i.lastSyncAt ? new Date(i.lastSyncAt).toISOString() : null,
  lastSyncStatus: i.lastSyncStatus,
  lastSyncError: i.lastSyncError ?? '',
  syncCount: i.syncCount,
  submissionCount: i.submissionCount,
  solvedCount: i.solvedCount ?? 0,
  isActive: i.isActive,
  createdAt: i.createdAt,
});
