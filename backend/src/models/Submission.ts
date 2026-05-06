import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const submissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },
    code: { type: String, required: true },
    language: {
      type: String,
      enum: ['python', 'javascript', 'java', 'cpp'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'accepted',
        'wrong_answer',
        'tle',
        'runtime_error',
        'compile_error',
        'mle',
        'execution_error',
      ],
      required: true,
    },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    runtimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    failedTestSnippet: { type: String, default: '' }, // first failed (visible only) for display
    stderrSnippet: { type: String, default: '' },
    // Static-analysis output captured at submit time so we don't re-scan the
    // code every time something downstream (AI review, analyzer dashboard)
    // wants to know what data structures were used.
    staticAnalysis: {
      loc: { type: Number, default: 0 },
      functionCount: { type: Number, default: 0 },
      maxDepth: { type: Number, default: 0 },
      dataStructures: { type: [String], default: [] },
      controlFlow: {
        forLoops: { type: Number, default: 0 },
        whileLoops: { type: Number, default: 0 },
        ifs: { type: Number, default: 0 },
        recursionLikely: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

export type SubmissionDoc = InferSchemaType<typeof submissionSchema> & { _id: Types.ObjectId };

export const Submission: Model<SubmissionDoc> = model<SubmissionDoc>('Submission', submissionSchema);

export const submissionToJSON = (s: any) => ({
  id: String(s._id),
  problemId: String(s.problemId),
  language: s.language,
  status: s.status,
  passedCount: s.passedCount,
  totalCount: s.totalCount,
  runtimeMs: s.runtimeMs,
  memoryKb: s.memoryKb,
  failedTestSnippet: s.failedTestSnippet,
  stderrSnippet: s.stderrSnippet,
  createdAt: s.createdAt,
});
