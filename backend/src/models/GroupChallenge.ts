import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const responseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, default: () => new Date() },

    // aptitude
    selectedOption: { type: String, enum: ['A', 'B', 'C', 'D'], default: null },

    // coding (resolved on read)
    solved: { type: Boolean, default: false },

    // computed at resolution
    pointsAwarded: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false }, // for any type, "got points" flag
  },
  { _id: false }
);

const challengeSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['coding', 'aptitude'], required: true, index: true },

    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    points: { type: Number, default: 10, min: 1, max: 1000 },

    // coding
    problemSlug: { type: String, default: null }, // links to our internal Problem.slug
    externalUrl: { type: String, default: null },
    externalPlatform: {
      type: String,
      enum: ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'gfg', 'atcoder', 'hackerearth', 'custom', null],
      default: null,
    },
    /** Platform-native problem id (e.g. "1234A" for CF, "two-sum" for LC). Null if URL unparseable. */
    externalProblemId: { type: String, default: null },
    /** Whether we can auto-verify solves on this platform via the ExtractedSubmission scan. */
    externalVerifiable: { type: Boolean, default: false },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', null], default: null },
    tags: { type: [String], default: [] },

    // aptitude
    questionImageUrl: { type: String, default: null },
    options: {
      type: { A: String, B: String, C: String, D: String },
      default: undefined,
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null }, // hidden in API until expiry

    responses: { type: [responseSchema], default: [] },

    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

challengeSchema.index({ groupId: 1, expiresAt: -1 });

export type GroupChallengeDoc = InferSchemaType<typeof challengeSchema> & {
  _id: Types.ObjectId;
};

export const GroupChallenge: Model<GroupChallengeDoc> = model<GroupChallengeDoc>(
  'GroupChallenge',
  challengeSchema
);

export interface ChallengeJSON {
  id: string;
  groupId: string;
  type: 'coding' | 'aptitude';
  createdBy: string;
  createdByUsername: string;
  title: string;
  description: string;
  points: number;
  problemSlug: string | null;
  externalUrl: string | null;
  externalPlatform: string | null;
  externalProblemId: string | null;
  externalVerifiable: boolean;
  difficulty: string | null;
  tags: string[];
  questionImageUrl: string | null;
  options: { A: string; B: string; C: string; D: string } | null;
  correctAnswer: string | null; // only present after expiry
  expired: boolean;
  resolved: boolean;
  expiresAt: string;
  createdAt: string;
  responseCount: number;
  myResponse: {
    submittedAt: string;
    selectedOption: string | null;
    solved: boolean;
    pointsAwarded: number;
    isCorrect: boolean;
  } | null;
}

export const challengeToJSON = (c: any, viewerId?: string): ChallengeJSON => {
  const expired = new Date(c.expiresAt) <= new Date();
  const myResponse = viewerId
    ? (c.responses ?? []).find((r: any) => String(r.userId) === viewerId)
    : null;
  return {
    id: String(c._id),
    groupId: String(c.groupId),
    type: c.type,
    createdBy: String(c.createdBy),
    createdByUsername: c._createdByUsername ?? '',
    title: c.title,
    description: c.description,
    points: c.points,
    problemSlug: c.problemSlug ?? null,
    externalUrl: c.externalUrl ?? null,
    externalPlatform: c.externalPlatform ?? null,
    externalProblemId: c.externalProblemId ?? null,
    externalVerifiable: !!c.externalVerifiable,
    difficulty: c.difficulty ?? null,
    tags: c.tags ?? [],
    questionImageUrl: c.questionImageUrl ?? null,
    options: c.options
      ? { A: c.options.A ?? '', B: c.options.B ?? '', C: c.options.C ?? '', D: c.options.D ?? '' }
      : null,
    correctAnswer: expired ? c.correctAnswer ?? null : null,
    expired,
    resolved: !!c.resolvedAt,
    expiresAt: new Date(c.expiresAt).toISOString(),
    createdAt: new Date(c.createdAt).toISOString(),
    responseCount: (c.responses ?? []).length,
    myResponse: myResponse
      ? {
          submittedAt: new Date(myResponse.submittedAt).toISOString(),
          selectedOption: myResponse.selectedOption ?? null,
          solved: !!myResponse.solved,
          pointsAwarded: myResponse.pointsAwarded ?? 0,
          isCorrect: !!myResponse.isCorrect,
        }
      : null,
  };
};
