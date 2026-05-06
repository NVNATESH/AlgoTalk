import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const extensionTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: 'Browser extension' },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type ExtensionTokenDoc = InferSchemaType<typeof extensionTokenSchema> & {
  _id: Types.ObjectId;
};

export const ExtensionToken: Model<ExtensionTokenDoc> = model<ExtensionTokenDoc>(
  'ExtensionToken',
  extensionTokenSchema
);
