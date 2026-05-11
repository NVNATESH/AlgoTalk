import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const exampleSchema = new Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

export const IQ_CATEGORIES = ['dsa', 'system_design', 'behavioral', 'sql', 'os', 'networking', 'hr'] as const;
export type IQCategory = (typeof IQ_CATEGORIES)[number];

const interviewQuestionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true }, // markdown
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true, index: true },
    category: { type: String, enum: IQ_CATEGORIES, required: true, index: true },
    topic: { type: String, required: true, trim: true, maxlength: 100 }, // e.g. "Arrays", "System Design", "Trees"
    tags: { type: [String], default: [], index: true },

    // Companies that commonly ask this question
    companies: { type: [String], default: [], index: true },
    // Platform sources
    platforms: { type: [String], default: [] }, // e.g. ["LeetCode", "GFG", "HackerRank"]
    platformLinks: {
      type: [
        new Schema(
          {
            platform: { type: String, required: true },
            url: { type: String, required: true },
            problemId: { type: String, default: '' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    constraints: { type: String, default: '' },
    examples: { type: [exampleSchema], default: [] },
    hints: { type: [String], default: [] },
    solution: { type: String, default: '' }, // markdown solution approach
    expectedComplexity: {
      time: { type: String, default: '' },
      space: { type: String, default: '' },
    },

    // Frequency / importance
    frequency: { type: Number, default: 50, min: 0, max: 100 }, // 0-100
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

interviewQuestionSchema.index({ title: 'text', description: 'text', topic: 'text' });

export type InterviewQuestionDoc = InferSchemaType<typeof interviewQuestionSchema> & {
  _id: Types.ObjectId;
};

export const InterviewQuestion: Model<InterviewQuestionDoc> = model<InterviewQuestionDoc>(
  'InterviewQuestion',
  interviewQuestionSchema
);

export function iqToJSON(q: any) {
  return {
    id: String(q._id),
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    category: q.category,
    topic: q.topic,
    tags: q.tags ?? [],
    companies: q.companies ?? [],
    platforms: q.platforms ?? [],
    platformLinks: q.platformLinks ?? [],
    constraints: q.constraints ?? '',
    examples: q.examples ?? [],
    hints: q.hints ?? [],
    solution: q.solution ?? '',
    expectedComplexity: q.expectedComplexity ?? { time: '', space: '' },
    frequency: q.frequency ?? 50,
    isActive: q.isActive ?? true,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
