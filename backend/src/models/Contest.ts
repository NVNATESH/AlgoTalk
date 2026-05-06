import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

export const CONTEST_PLATFORMS = [
  'codeforces',
  'codechef',
  'leetcode',
  'atcoder',
  'hackerrank',
  'hackerearth',
  'gfg',
] as const;
export type ContestPlatform = (typeof CONTEST_PLATFORMS)[number];

const contestProblemSchema = new Schema(
  {
    index: { type: String, required: true }, // e.g. "A", "B", "C" or task slug
    title: { type: String, default: '' },
    difficulty: { type: String, default: '' },
    tags: { type: [String], default: [] },
    url: { type: String, default: '' },
  },
  { _id: false }
);

const contestSchema = new Schema(
  {
    platform: { type: String, enum: CONTEST_PLATFORMS, required: true, index: true },
    externalId: { type: String, required: true }, // platform-native id
    name: { type: String, required: true },
    url: { type: String, default: '' },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 0 },
    type: { type: String, default: '' }, // 'div2', 'long', 'starters', 'weekly', etc.
    problems: { type: [contestProblemSchema], default: [] },
  },
  { timestamps: true }
);

contestSchema.index({ platform: 1, externalId: 1 }, { unique: true });
contestSchema.index({ startTime: 1, endTime: 1 });

export type ContestDoc = InferSchemaType<typeof contestSchema> & { _id: Types.ObjectId };
export const Contest: Model<ContestDoc> = model<ContestDoc>('Contest', contestSchema);

export const contestToJSON = (c: any) => ({
  id: String(c._id),
  platform: c.platform,
  externalId: c.externalId,
  name: c.name,
  url: c.url,
  startTime: c.startTime instanceof Date ? c.startTime.toISOString() : c.startTime,
  endTime: c.endTime instanceof Date ? c.endTime.toISOString() : c.endTime,
  durationMinutes: c.durationMinutes,
  type: c.type,
  problems: c.problems ?? [],
});
