import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const practiceProblemSchema = new Schema(
  {
    platform: String,
    url: String,
    title: String,
    difficulty: String,
    topic: String,
    estimatedMinutes: Number,
  },
  { _id: false }
);

const practiceDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    problems: { type: [practiceProblemSchema], default: [] },
  },
  { _id: false }
);

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

const contestReportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true, index: true },
    userContestId: { type: Schema.Types.ObjectId, ref: 'UserContest', required: true, index: true },

    summary: { type: String, default: '' },
    whatHappened: { type: String, default: '' },
    whatYouDidWell: {
      type: [{ point: String, evidence: String }],
      default: [],
    },
    whereYouStruggled: {
      type: [{ problem: String, issue: String, rootCause: String, timeLostMinutes: Number }],
      default: [],
    },
    codeQualityNotes: {
      type: [{ problem: String, note: String }],
      default: [],
    },
    howToImprove: {
      type: [{ priority: String, action: String }],
      default: [],
    },
    whatToLearnNext: {
      type: [{ topic: String, why: String, estimatedHours: Number, resources: [String] }],
      default: [],
    },
    practicePlan7Days: { type: [practiceDaySchema], default: [] },
    predictedRatingChange: { type: String, default: '' },
    nextContestRecommendation: { type: String, default: '' },
    resources: { type: [resourceSchema], default: [] },

    generatedBy: { type: String, default: 'gemini-2.5-flash' },
  },
  { timestamps: true }
);

contestReportSchema.index({ userId: 1, contestId: 1 }, { unique: true });

export type ContestReportDoc = InferSchemaType<typeof contestReportSchema> & {
  _id: Types.ObjectId;
};
export const ContestReport: Model<ContestReportDoc> = model<ContestReportDoc>(
  'ContestReport',
  contestReportSchema
);

export const contestReportToJSON = (r: any) => ({
  id: String(r._id),
  contestId: String(r.contestId),
  summary: r.summary,
  whatHappened: r.whatHappened,
  whatYouDidWell: r.whatYouDidWell ?? [],
  whereYouStruggled: r.whereYouStruggled ?? [],
  codeQualityNotes: r.codeQualityNotes ?? [],
  howToImprove: r.howToImprove ?? [],
  whatToLearnNext: r.whatToLearnNext ?? [],
  practicePlan7Days: r.practicePlan7Days ?? [],
  predictedRatingChange: r.predictedRatingChange,
  nextContestRecommendation: r.nextContestRecommendation,
  resources: (r.resources ?? []).map((res: any) => ({
    type: res.type,
    title: res.title,
    url: res.url,
    topic: res.topic ?? '',
    why: res.why ?? '',
  })),
  generatedBy: r.generatedBy,
  createdAt: r.createdAt,
});
