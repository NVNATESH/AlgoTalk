import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const meetRequestSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    challengeId: { type: Schema.Types.ObjectId, ref: 'GroupChallenge', required: true, index: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    preferredTime: { type: Date, default: null },
    message: { type: String, default: '', maxlength: 500 },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    scheduledTime: { type: Date, default: null },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', default: null },

    acceptedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

meetRequestSchema.index({ groupId: 1, status: 1, createdAt: -1 });

export type MeetRequestDoc = InferSchemaType<typeof meetRequestSchema> & {
  _id: Types.ObjectId;
};

export const MeetRequest: Model<MeetRequestDoc> = model<MeetRequestDoc>(
  'MeetRequest',
  meetRequestSchema
);

export const meetToJSON = (m: any) => ({
  id: String(m._id),
  groupId: String(m.groupId),
  challengeId: String(m.challengeId),
  requesterId: String(m.requesterId),
  requester: m.requester ?? null, // optionally hydrated
  challengeTitle: m.challengeTitle ?? null,
  preferredTime: m.preferredTime ? new Date(m.preferredTime).toISOString() : null,
  message: m.message ?? '',
  status: m.status,
  acceptedBy: m.acceptedBy ? String(m.acceptedBy) : null,
  acceptor: m.acceptor ?? null,
  scheduledTime: m.scheduledTime ? new Date(m.scheduledTime).toISOString() : null,
  roomId: m.roomId ? String(m.roomId) : null,
  acceptedAt: m.acceptedAt ? new Date(m.acceptedAt).toISOString() : null,
  cancelledAt: m.cancelledAt ? new Date(m.cancelledAt).toISOString() : null,
  expiresAt: new Date(m.expiresAt).toISOString(),
  createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
});
