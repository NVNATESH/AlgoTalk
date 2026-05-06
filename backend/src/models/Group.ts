import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const memberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 500 },
    privacy: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    icon: { type: String, default: '👥' },

    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [memberSchema], default: [] },

    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

groupSchema.index({ 'members.userId': 1 });

export type GroupDoc = InferSchemaType<typeof groupSchema> & { _id: Types.ObjectId };

export const Group: Model<GroupDoc> = model<GroupDoc>('Group', groupSchema);

export const groupSummary = (g: any, viewerId?: string) => {
  const membership =
    viewerId && g.members
      ? g.members.find((m: any) => String(m.userId) === viewerId) ?? null
      : null;
  return {
    id: String(g._id),
    name: g.name,
    description: g.description,
    privacy: g.privacy,
    icon: g.icon,
    memberCount: g.members?.length ?? 0,
    inviteCode: viewerId && membership ? g.inviteCode : undefined,
    isMember: !!membership,
    role: membership?.role ?? null,
    isAdmin: membership?.role === 'admin',
    createdAt: g.createdAt,
  };
};
