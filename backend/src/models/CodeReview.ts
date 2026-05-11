import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const lineCommentSchema = new Schema(
  {
    line: { type: Number, required: true, min: 1 },
    severity: {
      type: String,
      enum: ['info', 'suggestion', 'warning', 'critical'],
      required: true,
    },
    comment: { type: String, required: true, maxlength: 600 },
  },
  { _id: false }
);

// Learning resources surfaced alongside a review (or contest analysis). The
// "topic" tag lets us cluster + dedupe across multiple reviews — e.g. show
// once on a /resources page rather than re-listing the same blog 30 times.
const resourceSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['article', 'video', 'blog', 'docs', 'repo', 'problem', 'course'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 300 },
    url: { type: String, required: true, maxlength: 500 },
    topic: { type: String, default: '', maxlength: 80 },
    why: { type: String, default: '', maxlength: 240 },
  },
  { _id: false }
);

const codeReviewSchema = new Schema(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true, // one review per submission
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },

    overall: { type: String, required: true, maxlength: 1500 },
    score: { type: Number, required: true, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    lineComments: { type: [lineCommentSchema], default: [] },
    resources: { type: [resourceSchema], default: [] },

    // Cache the inputs so we can detect if the user changes the code and asks
    // again (we just key by submissionId so the saved code is implicitly stable).
    language: { type: String, required: true },
    model: { type: String, default: 'gemini-2.5-flash' },
  },
  { timestamps: true }
);

export type CodeReviewDoc = InferSchemaType<typeof codeReviewSchema> & { _id: Types.ObjectId };

export const CodeReview: Model<CodeReviewDoc> = model<CodeReviewDoc>(
  'CodeReview',
  codeReviewSchema
);

export const codeReviewToJSON = (r: any) => ({
  id: String(r._id),
  submissionId: String(r.submissionId),
  overall: r.overall,
  score: r.score,
  strengths: r.strengths ?? [],
  weaknesses: r.weaknesses ?? [],
  lineComments: (r.lineComments ?? []).map((c: any) => ({
    line: c.line,
    severity: c.severity,
    comment: c.comment,
  })),
  resources: (r.resources ?? []).map((res: any) => ({
    type: res.type,
    title: res.title,
    url: res.url,
    topic: res.topic ?? '',
    why: res.why ?? '',
  })),
  language: r.language,
  model: r.model,
  createdAt: r.createdAt,
});
