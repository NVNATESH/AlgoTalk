import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const submissionSchema = new Schema(
  {
    problemIndex: { type: String, required: true },
    verdict: { type: String, required: true }, // 'AC', 'WA', 'TLE', etc.
    timeFromStartSec: { type: Number, default: 0 },
    code: { type: String, default: '' },
    language: { type: String, default: '' },
    runtimeMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const userContestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true, index: true },
    status: {
      type: String,
      enum: ['registered', 'live', 'ended', 'analyzed'],
      default: 'registered',
      index: true,
    },
    rank: { type: Number, default: null },
    score: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    submissions: { type: [submissionSchema], default: [] },
    ratingChange: { type: Number, default: null },
    reportId: { type: Schema.Types.ObjectId, ref: 'ContestReport', default: null },
  },
  { timestamps: true }
);

userContestSchema.index({ userId: 1, contestId: 1 }, { unique: true });

export type UserContestDoc = InferSchemaType<typeof userContestSchema> & { _id: Types.ObjectId };
export const UserContest: Model<UserContestDoc> = model<UserContestDoc>(
  'UserContest',
  userContestSchema
);
