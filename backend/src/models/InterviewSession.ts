import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

export const INTERVIEW_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type InterviewDifficulty = (typeof INTERVIEW_DIFFICULTIES)[number];

export const INTERVIEW_ROLES = [
  'SDE-1 (entry)',
  'SDE-2 (mid)',
  'SDE-3 (senior)',
  'Backend',
  'Frontend',
  'ML',
  'Generic',
] as const;
export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

const exampleSchema = new Schema(
  { input: String, output: String, explanation: String },
  { _id: false }
);

const problemSchema = new Schema(
  {
    title: { type: String, required: true },
    statement: { type: String, required: true }, // markdown
    constraints: { type: String, default: '' },
    examples: { type: [exampleSchema], default: [] },
    expectedComplexity: {
      time: { type: String, default: '' },
      space: { type: String, default: '' },
    },
    starterHint: { type: String, default: '' },
  },
  { _id: false }
);

const approachFeedbackSchema = new Schema(
  {
    transcript: { type: String, required: true },
    onTrack: { type: Boolean, default: false },
    score: { type: Number, default: 0, min: 0, max: 100 },
    observations: { type: [String], default: [] },
    questionsToConsider: { type: [String], default: [] },
    suggestedDirection: { type: String, default: '' },
    complexity: {
      time: { type: String, default: null },
      space: { type: String, default: null },
    },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const evaluationSchema = new Schema(
  {
    verdict: { type: String, enum: ['pass', 'partial', 'fail'], default: 'fail' },
    score: { type: Number, default: 0, min: 0, max: 100 },
    complexity: {
      time: { type: String, default: '' },
      space: { type: String, default: '' },
    },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    edgeCasesMissed: { type: [String], default: [] },
    lineByLine: {
      type: [{ line: Number, comment: String, _id: false }],
      default: [],
    },
    summary: { type: String, default: '' },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const followUpMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'interviewer'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const interviewSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    topic: { type: String, required: true, maxlength: 120 },
    difficulty: { type: String, enum: INTERVIEW_DIFFICULTIES, required: true },
    role: { type: String, enum: INTERVIEW_ROLES, default: 'Generic' },
    notes: { type: String, default: '', maxlength: 500 },

    problem: { type: problemSchema, required: true },
    code: { type: String, default: '' },
    language: { type: String, default: 'python' },

    approachFeedbacks: { type: [approachFeedbackSchema], default: [] },
    evaluation: { type: evaluationSchema, default: null },
    followUps: { type: [followUpMessageSchema], default: [] },

    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'completed', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    startedAt: { type: Date, default: () => new Date() },
    submittedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
  },
  { timestamps: true }
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });

export type InterviewSessionDoc = InferSchemaType<typeof interviewSessionSchema> & {
  _id: Types.ObjectId;
};

export const InterviewSession: Model<InterviewSessionDoc> = model<InterviewSessionDoc>(
  'InterviewSession',
  interviewSessionSchema
);

export const sessionToJSON = (s: any) => ({
  id: String(s._id),
  topic: s.topic,
  difficulty: s.difficulty,
  role: s.role,
  notes: s.notes,
  problem: s.problem,
  code: s.code,
  language: s.language,
  approachFeedbacks: (s.approachFeedbacks ?? []).map((f: any) => ({
    transcript: f.transcript,
    onTrack: f.onTrack,
    score: f.score,
    observations: f.observations,
    questionsToConsider: f.questionsToConsider,
    suggestedDirection: f.suggestedDirection,
    complexity: f.complexity,
    createdAt: new Date(f.createdAt).toISOString(),
  })),
  evaluation: s.evaluation
    ? {
        verdict: s.evaluation.verdict,
        score: s.evaluation.score,
        complexity: s.evaluation.complexity,
        strengths: s.evaluation.strengths,
        weaknesses: s.evaluation.weaknesses,
        edgeCasesMissed: s.evaluation.edgeCasesMissed,
        lineByLine: s.evaluation.lineByLine,
        summary: s.evaluation.summary,
        createdAt: new Date(s.evaluation.createdAt).toISOString(),
      }
    : null,
  followUps: (s.followUps ?? []).map((f: any) => ({
    role: f.role,
    text: f.text,
    createdAt: new Date(f.createdAt).toISOString(),
  })),
  status: s.status,
  startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
  submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : null,
  durationSeconds: s.durationSeconds,
  createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
});

export const sessionSummary = (s: any) => ({
  id: String(s._id),
  topic: s.topic,
  difficulty: s.difficulty,
  role: s.role,
  problemTitle: s.problem?.title ?? '(untitled)',
  status: s.status,
  evaluationScore: s.evaluation?.score ?? null,
  evaluationVerdict: s.evaluation?.verdict ?? null,
  startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
  submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : null,
  durationSeconds: s.durationSeconds,
  createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
});
