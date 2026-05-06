import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

/**
 * Snapshot of a Yjs room's full document state, captured periodically while
 * the room is active. Stored as the binary state vector + state-as-update
 * blob (Y.encodeStateAsUpdate output) so we can restore the live Y.Doc from
 * any snapshot without replaying every individual update.
 *
 * Module 1 spec calls this "session recording (Y.Doc snapshots every 30s)".
 *
 * Retention: we keep the most recent N snapshots per room (`SNAPSHOT_RETENTION`
 * in yjsServer.ts), older rows pruned at write time. The very last snapshot
 * before all peers leave acts as the "session ended" record and is what we
 * rehydrate from on the next connection.
 */

const roomSnapshotSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    // Binary Y.Doc state — the output of Y.encodeStateAsUpdate(doc).
    state: { type: Buffer, required: true },
    bytes: { type: Number, required: true },
    activeConns: { type: Number, default: 0 },
    reason: {
      type: String,
      enum: ['tick', 'last-leaves', 'manual'],
      default: 'tick',
    },
  },
  { timestamps: true }
);

roomSnapshotSchema.index({ roomId: 1, createdAt: -1 });

export type RoomSnapshotDoc = InferSchemaType<typeof roomSnapshotSchema> & {
  _id: Types.ObjectId;
};
export const RoomSnapshot: Model<RoomSnapshotDoc> = model<RoomSnapshotDoc>(
  'RoomSnapshot',
  roomSnapshotSchema
);
