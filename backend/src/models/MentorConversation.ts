import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const messageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const mentorConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
    moduleId: { type: String, default: '' }, // empty string for goal-level chat
    messages: { type: [messageSchema], default: [] },
    lastMessageAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

mentorConversationSchema.index({ userId: 1, goalId: 1, moduleId: 1 }, { unique: true });

export type MentorConversationDoc = InferSchemaType<typeof mentorConversationSchema> & {
  _id: Types.ObjectId;
};

export const MentorConversation: Model<MentorConversationDoc> = model<MentorConversationDoc>(
  'MentorConversation',
  mentorConversationSchema
);

export const conversationToJSON = (c: any) => ({
  id: String(c._id),
  goalId: String(c.goalId),
  moduleId: c.moduleId,
  messages: (c.messages ?? []).map((m: any) => ({
    id: m.id,
    role: m.role,
    text: m.text,
    createdAt: m.createdAt,
  })),
  lastMessageAt: c.lastMessageAt,
});
