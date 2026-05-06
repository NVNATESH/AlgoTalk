import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const moduleSchema = new Schema(
  {
    moduleId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    topics: [{ type: String }],
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    estimatedHours: { type: Number, default: 1 },
    actualMinutes: { type: Number, default: 0 },
    quizScore: { type: Number, default: null },
    problemsSolved: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
  },
  { _id: false }
);

const goalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 80 },
    icon: { type: String, default: '🎯' },
    description: { type: String, default: '' },

    topic: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Master'],
      default: 'Intermediate',
    },
    priority: { type: String, enum: ['P0', 'P1', 'P2'], default: 'P1' },

    modules: { type: [moduleSchema], default: [] },

    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    isFocus: { type: Boolean, default: false, index: true },

    estimatedHours: { type: Number, default: 0 },
    actualMinutes: { type: Number, default: 0 },

    weeklyHours: { type: Number, default: 8 },
    startDate: { type: Date, default: () => new Date() },
    deadline: { type: Date, required: true },
    completedAt: { type: Date, default: null },

    streak: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: null },
    riskScore: { type: Number, default: 0 },

    rationale: { type: String, default: '' },

    // Set by smart goal adaptation; gates the cooldown so we don't keep
    // pushing the deadline every tick.
    lastAdaptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, isFocus: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

export type GoalDoc = InferSchemaType<typeof goalSchema> & { _id: Types.ObjectId };

export const Goal: Model<GoalDoc> = model<GoalDoc>('Goal', goalSchema);

export const goalToJSON = (g: any) => ({
  id: String(g._id),
  name: g.name,
  icon: g.icon,
  description: g.description,
  topic: g.topic,
  difficulty: g.difficulty,
  priority: g.priority,
  modules: (g.modules ?? []).map((m: any) => ({
    moduleId: m.moduleId,
    title: m.title,
    description: m.description,
    topics: m.topics,
    difficulty: m.difficulty,
    status: m.status,
    estimatedHours: m.estimatedHours,
    actualMinutes: m.actualMinutes,
    quizScore: m.quizScore,
    problemsSolved: m.problemsSolved,
    completedAt: m.completedAt,
    dueDate: m.dueDate,
  })),
  progress: g.progress,
  status: g.status,
  isFocus: g.isFocus,
  estimatedHours: g.estimatedHours,
  actualMinutes: g.actualMinutes,
  weeklyHours: g.weeklyHours,
  startDate: g.startDate,
  deadline: g.deadline,
  completedAt: g.completedAt,
  streak: g.streak,
  riskScore: g.riskScore,
  rationale: g.rationale,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});
