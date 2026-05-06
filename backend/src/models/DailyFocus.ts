import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

/**
 * Per-day per-user focus minutes tally. Updated atomically via $inc whenever
 * `goalService.logFocusTime` is called. Used by `burnoutDetector` to surface
 * "you've been on the grind for N days straight" warnings on the dashboard.
 *
 * `date` is the YYYY-MM-DD string for the day in the user's local timezone
 * (caller passes the resolved string so we don't have to know server tz).
 */

const dailyFocusSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    minutes: { type: Number, default: 0 },
  },
  // Pin the collection name — Mongoose's default pluralizer of `DailyFocus`
  // leaves "dailyfocus" (trailing 's' of "focus" confuses it). Lock it.
  { timestamps: true, collection: 'dailyfocuses' }
);

dailyFocusSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyFocusSchema.index({ userId: 1, date: -1 });

export type DailyFocusDoc = InferSchemaType<typeof dailyFocusSchema> & {
  _id: Types.ObjectId;
};
export const DailyFocus: Model<DailyFocusDoc> = model<DailyFocusDoc>(
  'DailyFocus',
  dailyFocusSchema
);
