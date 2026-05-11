import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const exampleSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const testCaseSchema = new Schema(
  {
    stdin: { type: String, required: true },
    expectedStdout: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const starterCodeSchema = new Schema(
  {
    python: { type: String, default: '' },
    javascript: { type: String, default: '' },
    java: { type: String, default: '' },
    cpp: { type: String, default: '' },
  },
  { _id: false }
);

const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true }, // markdown
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    companyTags: { type: [String], default: [], index: true },
    platform: { type: String, default: '', index: true }, // source platform: LeetCode, GeeksforGeeks, HackerRank, CodeChef, Codeforces, InterviewBit, etc.

    inputFormat: { type: String, default: '' }, // e.g. "first line: n target; second line: n integers"
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },

    examples: { type: [exampleSchema], default: [] },
    testCases: { type: [testCaseSchema], default: [] },
    starterCode: { type: starterCodeSchema, default: () => ({}) },

    timeLimitMs: { type: Number, default: 2000 },
    memoryLimitKb: { type: Number, default: 256 * 1024 },

    totalSubmissions: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },

    // AI-estimated CF-equivalent rating (~800–3500). null when not yet estimated.
    // Populated by POST /api/problems/admin/estimate-ratings.
    cfEquivRating: { type: Number, default: null },
    cfEquivRatingEstimatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

problemSchema.index({ title: 'text', description: 'text' });

export type ProblemDoc = InferSchemaType<typeof problemSchema> & { _id: Types.ObjectId };

export const Problem: Model<ProblemDoc> = model<ProblemDoc>('Problem', problemSchema);

export const problemSummary = (p: any) => ({
  id: String(p._id),
  slug: p.slug,
  title: p.title,
  difficulty: p.difficulty,
  tags: p.tags,
  companyTags: p.companyTags ?? [],
  platform: p.platform ?? '',
  acceptanceRate:
    (p.totalSubmissions ?? 0) === 0
      ? null
      : Math.round(((p.totalAccepted ?? 0) / p.totalSubmissions) * 100),
  totalSubmissions: p.totalSubmissions ?? 0,
  cfEquivRating: p.cfEquivRating ?? null,
});

export const problemDetail = (p: any) => ({
  ...problemSummary(p),
  description: p.description,
  inputFormat: p.inputFormat,
  outputFormat: p.outputFormat,
  constraints: p.constraints,
  examples: p.examples,
  // visible test cases only — hidden ones never go to client
  visibleTestCases: (p.testCases ?? [])
    .filter((tc: any) => !tc.isHidden)
    .map((tc: any) => ({ stdin: tc.stdin, expectedStdout: tc.expectedStdout })),
  starterCode: p.starterCode,
  timeLimitMs: p.timeLimitMs,
  memoryLimitKb: p.memoryLimitKb,
});
