import { Types } from 'mongoose';
import { DailyFocus } from '../models/DailyFocus.js';

/** Threshold: "burnout" = sustained ≥4h focus for ≥5 consecutive days. */
const BURNOUT_DAILY_THRESHOLD = 240; // minutes
const BURNOUT_CONSECUTIVE_DAYS = 5;
const WINDOW_DAYS = 14;

export interface BurnoutStatus {
  burnout: boolean;
  consecutiveHighDays: number;
  totalMinutesLast7: number;
  averageDailyMinutesLast7: number;
  threshold: { dailyMinutes: number; days: number };
  daily: Array<{ date: string; minutes: number }>;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export async function getBurnoutStatus(userId: string): Promise<BurnoutStatus> {
  const userObjId = new Types.ObjectId(userId);
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS + 1);
  const sinceStr = ymd(since);

  const rows = await DailyFocus.find({ userId: userObjId, date: { $gte: sinceStr } })
    .select('date minutes')
    .sort({ date: 1 })
    .lean();

  const byDate = new Map(rows.map((r: any) => [r.date as string, r.minutes as number]));

  // Build a contiguous daily array covering the full window (gaps = 0).
  const daily: Array<{ date: string; minutes: number }> = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = ymd(d);
    daily.push({ date: k, minutes: byDate.get(k) ?? 0 });
  }

  // Walk newest → oldest, count consecutive days where minutes ≥ threshold.
  let consecutive = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].minutes >= BURNOUT_DAILY_THRESHOLD) consecutive++;
    else break;
  }

  // Last 7 days totals
  const last7 = daily.slice(-7);
  const totalLast7 = last7.reduce((s, d) => s + d.minutes, 0);

  return {
    burnout: consecutive >= BURNOUT_CONSECUTIVE_DAYS,
    consecutiveHighDays: consecutive,
    totalMinutesLast7: totalLast7,
    averageDailyMinutesLast7: Math.round(totalLast7 / 7),
    threshold: {
      dailyMinutes: BURNOUT_DAILY_THRESHOLD,
      days: BURNOUT_CONSECUTIVE_DAYS,
    },
    daily,
  };
}
