import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';
import { SUPPORTED_PLATFORMS } from './Integration.js';

const extractedSubmissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // integrationId is null for rows sourced from incoming webhooks (no
    // integration row backs those — they're posted directly by the user).
    integrationId: { type: Schema.Types.ObjectId, ref: 'Integration', default: null, index: true },
    // 'extractor' = polled by sync scheduler, 'webhook' = posted via incoming
    // webhook, 'extension' = browser extension live event.
    source: { type: String, enum: ['extractor', 'webhook', 'extension'], default: 'extractor' },
    platform: { type: String, required: true },

    externalId: { type: String, required: true }, // platform-native submission id
    problemId: { type: String, required: true }, // platform-native problem identifier
    problemTitle: { type: String, required: true },
    problemUrl: { type: String, default: '' },

    topics: { type: [String], default: [] },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'unknown'],
      default: 'unknown',
    },
    rating: { type: Number, default: null }, // codeforces problem rating

    status: {
      type: String,
      enum: [
        'accepted',
        'wrong_answer',
        'tle',
        'mle',
        'runtime_error',
        'compile_error',
        'rejected',
        'pending',
        'unknown',
      ],
      default: 'unknown',
      index: true,
    },
    language: { type: String, default: '' },
    submittedAt: { type: Date, required: true, index: true },
    // Some platforms (e.g. LeetCode when the user has hidden their submission
    // list) only expose daily totals — a single row in that case represents N
    // submissions on that day. Defaults to 1 so per-submission rows from the
    // other platforms count normally. Stats / heatmap aggregators sum this
    // instead of counting rows when computing total submissions.
    count: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Idempotent re-sync: one row per (userId, platform, externalId)
extractedSubmissionSchema.index(
  { userId: 1, platform: 1, externalId: 1 },
  { unique: true }
);
extractedSubmissionSchema.index({ userId: 1, submittedAt: -1 });

export type ExtractedSubmissionDoc = InferSchemaType<typeof extractedSubmissionSchema> & {
  _id: Types.ObjectId;
};

export const ExtractedSubmission: Model<ExtractedSubmissionDoc> = model<ExtractedSubmissionDoc>(
  'ExtractedSubmission',
  extractedSubmissionSchema
);

export const extractedToJSON = (e: any) => ({
  id: String(e._id),
  platform: e.platform,
  externalId: e.externalId,
  problemId: e.problemId,
  problemTitle: e.problemTitle,
  problemUrl: e.problemUrl,
  topics: e.topics ?? [],
  difficulty: e.difficulty,
  rating: e.rating,
  status: e.status,
  language: e.language,
  submittedAt: new Date(e.submittedAt).toISOString(),
});
