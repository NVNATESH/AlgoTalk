import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const exampleSchema = new Schema(
  {
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    code: { type: String, default: '' },
    language: { type: String, default: '' },
  },
  { _id: false }
);

// Question types: 'mcq_single' | 'mcq_multi' | 'fill_blank' | 'match' | 'true_false'
const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['mcq_single', 'mcq_multi', 'fill_blank', 'match', 'true_false'],
      required: true,
    },
    prompt: { type: String, required: true },
    explanation: { type: String, default: '' },
    points: { type: Number, default: 1 },

    // mcq fields
    options: { type: [String], default: undefined },
    correctIndex: { type: Number },
    correctIndices: { type: [Number] },

    // fill blank — array of accepted answers per blank, separated by | within each entry
    blanks: { type: [String], default: undefined },

    // match — pairs[i].right at index i is the correct match for pairs[i].left
    pairs: {
      type: [{ left: String, right: String, _id: false }],
      default: undefined,
    },

    // true/false
    correct: { type: Boolean },
  },
  { _id: false }
);

const learningContentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
    moduleId: { type: String, required: true },

    concepts: { type: String, default: '' }, // markdown
    examples: { type: [exampleSchema], default: [] },
    quiz: { type: [questionSchema], default: [] },

    generatedAt: { type: Date, default: () => new Date() },
    generationVersion: { type: Number, default: 1 },

    quizAttempts: {
      type: [
        {
          attemptedAt: { type: Date, default: () => new Date() },
          score: Number,
          maxScore: Number,
          percentage: Number,
          passed: Boolean,
          xpAwarded: Number,
        },
      ],
      default: [],
    },

    bestPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

learningContentSchema.index({ userId: 1, goalId: 1, moduleId: 1 }, { unique: true });

export type LearningContentDoc = InferSchemaType<typeof learningContentSchema> & {
  _id: Types.ObjectId;
};

export const LearningContent: Model<LearningContentDoc> = model<LearningContentDoc>(
  'LearningContent',
  learningContentSchema
);

// Public projection — strips correct answers from quiz when shown to user before submit
export const sanitizeQuizForUser = (quiz: any[]) =>
  quiz.map((q) => {
    const base = {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
    };
    switch (q.type) {
      case 'mcq_single':
      case 'mcq_multi':
        return { ...base, options: q.options };
      case 'fill_blank':
        return { ...base, blanks: q.blanks?.map(() => '') ?? [] }; // expose count only
      case 'match':
        // shuffle the rights so the user has to actually match
        return {
          ...base,
          pairs: q.pairs?.map((p: any) => ({ left: p.left })),
          rights: shuffle((q.pairs ?? []).map((p: any) => p.right)),
        };
      case 'true_false':
        return base;
      default:
        return base;
    }
  });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const contentToJSON = (c: any) => ({
  id: String(c._id),
  goalId: String(c.goalId),
  moduleId: c.moduleId,
  concepts: c.concepts,
  examples: c.examples,
  quiz: sanitizeQuizForUser(c.quiz ?? []),
  questionCount: (c.quiz ?? []).length,
  totalPoints: (c.quiz ?? []).reduce((s: number, q: any) => s + (q.points ?? 1), 0),
  bestPercentage: c.bestPercentage ?? 0,
  attemptCount: (c.quizAttempts ?? []).length,
  generatedAt: c.generatedAt,
  generationVersion: c.generationVersion,
});
