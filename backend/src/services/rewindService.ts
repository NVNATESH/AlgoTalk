import { Types } from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { Goal } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export interface MonthStats {
  month: number; // 0-11
  monthLabel: string; // "Jan"
  submissions: number;
  accepted: number;
  distinctSolved: number;
  activeDays: number;
  byDifficulty: { Easy: number; Medium: number; Hard: number };
}

export interface MilestoneEvent {
  type:
    | 'first_submission'
    | 'first_solve'
    | 'count_milestone'
    | 'streak_milestone'
    | 'first_hard'
    | 'language_first'
    | 'most_productive_day';
  date: string; // ISO YYYY-MM-DD
  label: string;
  detail?: string;
  count?: number;
}

export interface RewindData {
  year: number;
  hasData: boolean;
  totals: {
    submissions: number;
    accepted: number;
    distinctSolved: number;
    activeDays: number;
    byDifficulty: { Easy: number; Medium: number; Hard: number };
    longestStreak: number;
    avgAcceptanceRate: number;
  };
  monthly: MonthStats[];
  topLanguage: { language: string; count: number; pct: number } | null;
  byLanguage: Array<{ language: string; count: number }>;
  topTopics: Array<{ topic: string; solvedCount: number }>;
  milestones: MilestoneEvent[];
  bestDay: { date: string; submissions: number } | null;
  bestMonth: { month: number; monthLabel: string; solved: number } | null;
  h1: MonthlyAggregate;
  h2: MonthlyAggregate;
  goalsCompletedThisYear: number;
}

export interface MonthlyAggregate {
  submissions: number;
  accepted: number;
  distinctSolved: number;
  activeDays: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COUNT_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export async function getRewindForYear(userId: string, year: number): Promise<RewindData> {
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw ApiError.badRequest('Invalid year');
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const subs = await Submission.find({
    userId,
    createdAt: { $gte: start, $lt: end },
  })
    .select('problemId status language runtimeMs createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const monthly: MonthStats[] = MONTHS.map((label, i) => ({
    month: i,
    monthLabel: label,
    submissions: 0,
    accepted: 0,
    distinctSolved: 0,
    activeDays: 0,
    byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
  }));

  // bucket submissions per month + per-day, track distinct accepted problems per month + global
  const distinctAcceptedAllYear = new Set<string>();
  const distinctAcceptedPerMonth: Set<string>[] = MONTHS.map(() => new Set<string>());
  const activeDaysPerMonth: Set<string>[] = MONTHS.map(() => new Set<string>());
  const dayCount = new Map<string, number>(); // YYYY-MM-DD -> submissions
  const langCount = new Map<string, number>();

  for (const s of subs) {
    const d = new Date(s.createdAt as Date);
    const m = d.getMonth();
    const dayKey = ymd(d);
    monthly[m].submissions++;
    activeDaysPerMonth[m].add(dayKey);
    dayCount.set(dayKey, (dayCount.get(dayKey) ?? 0) + 1);
    langCount.set(s.language, (langCount.get(s.language) ?? 0) + 1);

    if (s.status === 'accepted') {
      const pid = String(s.problemId);
      monthly[m].accepted++;
      if (!distinctAcceptedPerMonth[m].has(pid)) {
        distinctAcceptedPerMonth[m].add(pid);
      }
      if (!distinctAcceptedAllYear.has(pid)) {
        distinctAcceptedAllYear.add(pid);
      }
    }
  }

  // Difficulty per month requires problem.difficulty
  // Build first-accepted-date per problem (for milestones + difficulty bucketing)
  const firstAcceptedAt = new Map<string, Date>();
  for (const s of subs) {
    if (s.status !== 'accepted') continue;
    const pid = String(s.problemId);
    const t = new Date(s.createdAt as Date);
    if (!firstAcceptedAt.has(pid)) firstAcceptedAt.set(pid, t);
  }

  // Lookup difficulties + tags for accepted problems
  const acceptedIds = Array.from(distinctAcceptedAllYear);
  const problems = acceptedIds.length
    ? await Problem.find({
        _id: { $in: acceptedIds.map((id) => new Types.ObjectId(id)) },
      })
        .select('difficulty tags title slug')
        .lean()
    : [];
  const probInfo = new Map<string, { difficulty: string; tags: string[]; title: string; slug: string }>();
  for (const p of problems) {
    probInfo.set(String(p._id), {
      difficulty: p.difficulty,
      tags: p.tags ?? [],
      title: p.title,
      slug: p.slug,
    });
  }

  const totalsByDifficulty = { Easy: 0, Medium: 0, Hard: 0 } as Record<string, number>;
  const topicCount = new Map<string, number>();

  for (const pid of acceptedIds) {
    const info = probInfo.get(pid);
    if (!info) continue;
    if (info.difficulty in totalsByDifficulty) totalsByDifficulty[info.difficulty]++;
    const t = firstAcceptedAt.get(pid);
    if (t) {
      const m = t.getMonth();
      if (info.difficulty in monthly[m].byDifficulty) {
        (monthly[m].byDifficulty as any)[info.difficulty]++;
      }
    }
    for (const tag of info.tags) {
      topicCount.set(tag, (topicCount.get(tag) ?? 0) + 1);
    }
  }

  // Fill monthly rollups
  for (let m = 0; m < 12; m++) {
    monthly[m].distinctSolved = distinctAcceptedPerMonth[m].size;
    monthly[m].activeDays = activeDaysPerMonth[m].size;
  }

  // Year totals
  const totalSubmissions = subs.length;
  const totalAccepted = subs.filter((s) => s.status === 'accepted').length;
  const totalActiveDays = new Set(Array.from(dayCount.keys())).size;
  const avgAcceptanceRate =
    totalSubmissions === 0 ? 0 : Math.round((totalAccepted / totalSubmissions) * 100);

  // Longest streak across the year (calendar-walk)
  let longestStreak = 0;
  let run = 0;
  const yearStart = new Date(year, 0, 1);
  const yearEndInclusive = new Date(year, 11, 31);
  // limit walk to today if year is current and incomplete, else full year
  const walkEnd = new Date() < yearEndInclusive ? new Date() : yearEndInclusive;
  for (let d = new Date(yearStart); d <= walkEnd; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    if (dayCount.has(k)) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // Best day / month
  let bestDay: { date: string; submissions: number } | null = null;
  for (const [k, c] of dayCount) {
    if (!bestDay || c > bestDay.submissions) bestDay = { date: k, submissions: c };
  }

  let bestMonth: { month: number; monthLabel: string; solved: number } | null = null;
  for (const m of monthly) {
    if (!bestMonth || m.distinctSolved > bestMonth.solved) {
      bestMonth = { month: m.month, monthLabel: m.monthLabel, solved: m.distinctSolved };
    }
  }
  if (bestMonth && bestMonth.solved === 0) bestMonth = null;

  // Languages
  const byLanguage = Array.from(langCount.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
  const topLanguage =
    byLanguage.length > 0
      ? {
          language: byLanguage[0].language,
          count: byLanguage[0].count,
          pct:
            totalSubmissions === 0
              ? 0
              : Math.round((byLanguage[0].count / totalSubmissions) * 100),
        }
      : null;

  // Top topics
  const topTopics = Array.from(topicCount.entries())
    .map(([topic, solvedCount]) => ({ topic, solvedCount }))
    .sort((a, b) => b.solvedCount - a.solvedCount)
    .slice(0, 8);

  // Milestones: walk subs chronologically and emit events
  const milestones: MilestoneEvent[] = [];
  let acceptedSoFar = 0;
  let firstSubmission = true;
  let firstSolve = true;
  let firstHard = true;
  const langsSeen = new Set<string>();
  const reachedCounts = new Set<number>();
  const reachedStreaks = new Set<number>();

  // Track running daily streak
  let lastDay: string | null = null;
  let streakRun = 0;

  for (const s of subs) {
    const d = new Date(s.createdAt as Date);
    const dateIso = ymd(d);
    const dateKey = dateIso;

    if (firstSubmission) {
      milestones.push({
        type: 'first_submission',
        date: dateIso,
        label: 'First submission of the year',
      });
      firstSubmission = false;
    }
    if (!langsSeen.has(s.language)) {
      langsSeen.add(s.language);
      if (langsSeen.size > 1 && langsSeen.size <= 4) {
        milestones.push({
          type: 'language_first',
          date: dateIso,
          label: `First time using ${displayLang(s.language)}`,
        });
      }
    }

    if (s.status === 'accepted') {
      acceptedSoFar++;
      const pid = String(s.problemId);
      const info = probInfo.get(pid);

      if (firstSolve) {
        milestones.push({
          type: 'first_solve',
          date: dateIso,
          label: 'First problem solved',
          detail: info?.title,
        });
        firstSolve = false;
      }
      if (firstHard && info?.difficulty === 'Hard') {
        milestones.push({
          type: 'first_hard',
          date: dateIso,
          label: 'First Hard problem conquered',
          detail: info?.title,
        });
        firstHard = false;
      }
      for (const m of COUNT_MILESTONES) {
        if (acceptedSoFar === m && !reachedCounts.has(m)) {
          reachedCounts.add(m);
          milestones.push({
            type: 'count_milestone',
            date: dateIso,
            label: `${m} problem${m === 1 ? '' : 's'} solved`,
            count: m,
          });
        }
      }
    }

    // Streak tracking
    if (lastDay === null) {
      streakRun = 1;
    } else if (lastDay === dateKey) {
      // same day, no change
    } else {
      const prev = new Date(lastDay + 'T00:00:00');
      const cur = new Date(dateKey + 'T00:00:00');
      const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) streakRun++;
      else streakRun = 1;
    }
    lastDay = dateKey;

    for (const target of STREAK_MILESTONES) {
      if (streakRun === target && !reachedStreaks.has(target)) {
        reachedStreaks.add(target);
        milestones.push({
          type: 'streak_milestone',
          date: dateIso,
          label: `${target}-day streak reached`,
          count: target,
        });
      }
    }
  }

  if (bestDay && bestDay.submissions >= 5) {
    milestones.push({
      type: 'most_productive_day',
      date: bestDay.date,
      label: 'Most productive day',
      detail: `${bestDay.submissions} submissions`,
    });
  }

  // Sort milestones chronologically
  milestones.sort((a, b) => a.date.localeCompare(b.date));

  // H1 vs H2 split
  const h1Months = monthly.slice(0, 6);
  const h2Months = monthly.slice(6, 12);
  const aggregate = (ms: MonthStats[]): MonthlyAggregate => ({
    submissions: ms.reduce((s, m) => s + m.submissions, 0),
    accepted: ms.reduce((s, m) => s + m.accepted, 0),
    distinctSolved: ms.reduce((s, m) => s + m.distinctSolved, 0),
    activeDays: ms.reduce((s, m) => s + m.activeDays, 0),
  });
  const h1 = aggregate(h1Months);
  const h2 = aggregate(h2Months);

  // Goals completed this year
  const goalsCompletedThisYear = await Goal.countDocuments({
    userId,
    status: 'completed',
    completedAt: { $gte: start, $lt: end },
  });

  return {
    year,
    hasData: totalSubmissions > 0,
    totals: {
      submissions: totalSubmissions,
      accepted: totalAccepted,
      distinctSolved: distinctAcceptedAllYear.size,
      activeDays: totalActiveDays,
      byDifficulty: {
        Easy: totalsByDifficulty.Easy,
        Medium: totalsByDifficulty.Medium,
        Hard: totalsByDifficulty.Hard,
      },
      longestStreak,
      avgAcceptanceRate,
    },
    monthly,
    topLanguage,
    byLanguage,
    topTopics,
    milestones,
    bestDay,
    bestMonth,
    h1,
    h2,
    goalsCompletedThisYear,
  };
}

const LANG_DISPLAY: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

function displayLang(l: string) {
  return LANG_DISPLAY[l] ?? l;
}
