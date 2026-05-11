import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const missionItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['solve_problem', 'complete_module', 'study_time', 'quiz_score', 'login_streak'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🎯' },
    target: { type: Number, required: true },    // e.g. 2 problems, 30 minutes, 80% score
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    xpReward: { type: Number, default: 25 },
  },
  { _id: false }
);

const dailyMissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    missions: { type: [missionItemSchema], default: [] },
    allCompleted: { type: Boolean, default: false },
    bonusXP: { type: Number, default: 50 }, // bonus for completing all 3
    bonusClaimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dailyMissionSchema.index({ userId: 1, date: 1 }, { unique: true });

export type DailyMissionDoc = InferSchemaType<typeof dailyMissionSchema> & { _id: Types.ObjectId };

export const DailyMission: Model<DailyMissionDoc> = model<DailyMissionDoc>('DailyMission', dailyMissionSchema);

export const dailyMissionToJSON = (d: any) => ({
  id: String(d._id),
  date: d.date,
  missions: (d.missions ?? []).map((m: any) => ({
    type: m.type,
    title: m.title,
    description: m.description,
    icon: m.icon,
    target: m.target,
    progress: m.progress,
    completed: m.completed,
    completedAt: m.completedAt,
    xpReward: m.xpReward,
  })),
  allCompleted: d.allCompleted,
  bonusXP: d.bonusXP,
  bonusClaimed: d.bonusClaimed,
});
