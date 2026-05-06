import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

export const MAX_WRITERS = 3;
export const MAX_READ_ONLY = 57;
export const MAX_PARTICIPANTS = MAX_WRITERS + MAX_READ_ONLY; // 60

const roomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    icon: { type: String, default: '🤝' },

    // The room creator / "Question Asker" — has permanent writer slot + admin powers
    asker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Up to MAX_WRITERS user IDs (asker is always included)
    writers: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    readOnly: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },

    // For external join links
    inviteCode: { type: String, required: true, unique: true, index: true },

    initialContent: { type: String, default: '' }, // optional starter code/notes
    language: { type: String, default: 'javascript' },

    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

roomSchema.index({ writers: 1 });
roomSchema.index({ readOnly: 1 });

export type RoomDoc = InferSchemaType<typeof roomSchema> & { _id: Types.ObjectId };

export const Room: Model<RoomDoc> = model<RoomDoc>('Room', roomSchema);

export type RoleInRoom = 'asker' | 'writer' | 'readonly' | null;

export function getRole(room: any, userId: string): RoleInRoom {
  if (!room) return null;
  if (String(room.asker) === userId) return 'asker';
  if ((room.writers ?? []).some((w: any) => String(w) === userId)) return 'writer';
  if ((room.readOnly ?? []).some((r: any) => String(r) === userId)) return 'readonly';
  return null;
}

export const roomToJSON = (r: any, viewerId?: string) => ({
  id: String(r._id),
  name: r.name,
  description: r.description,
  icon: r.icon,
  asker: String(r.asker),
  writers: (r.writers ?? []).map((w: any) => String(w)),
  readOnly: (r.readOnly ?? []).map((u: any) => String(u)),
  participantCount: (r.writers?.length ?? 0) + (r.readOnly?.length ?? 0),
  writerCount: r.writers?.length ?? 0,
  readOnlyCount: r.readOnly?.length ?? 0,
  maxWriters: MAX_WRITERS,
  maxReadOnly: MAX_READ_ONLY,
  initialContent: r.initialContent,
  language: r.language,
  inviteCode: viewerId && getRole(r, viewerId) ? r.inviteCode : undefined,
  myRole: viewerId ? getRole(r, viewerId) : null,
  isAsker: viewerId ? String(r.asker) === viewerId : false,
  expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
  createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
});
