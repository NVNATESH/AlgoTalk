import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const badgeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true },
    earnedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

// One award per (user, badgeKey)
badgeSchema.index({ userId: 1, key: 1 }, { unique: true });
badgeSchema.index({ userId: 1, earnedAt: -1 });

export type BadgeDoc = InferSchemaType<typeof badgeSchema> & { _id: Types.ObjectId };

export const Badge: Model<BadgeDoc> = model<BadgeDoc>('Badge', badgeSchema);
