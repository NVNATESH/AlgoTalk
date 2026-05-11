import { Types } from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { Goal } from '../models/Goal.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
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

// ---------------------------------------------------------------------------
// Multi-period, multi-platform rewind (Wave D)
// ---------------------------------------------------------------------------
// `getRewindForYear` above is the v1 endpoint and stays unchanged. The new
// `getRewindForRange` below answers the same question for week / month / year
// with an additional per-platform breakdown that includes external sync data
// (LeetCode / Codeforces / CodeChef / HackerRank / AtCoder / GFG / HackerEarth).
// Both functions live in this file so they share the year-level helpers; the
// new one is purely additive.

export type RewindPeriod = 'week' | 'month' | 'year';

export interface RewindRangePlatformStats {
  platform: string; // 'learnhub' | 'leetcode' | ...
  submissions: number;
  accepted: number;
  distinctSolved: number;
  activeDays: number;
  byDifficulty: { easy: number; medium: number; hard: number; unknown: number };
  topLanguage: string | null;
}

export interface RewindRangeData {
  period: RewindPeriod;
  range: { start: string; end: string }; // ISO YYYY-MM-DD inclusive
  hasData: boolean;
  totals: {
    submissions: number;
    accepted: number;
    distinctSolved: number;
    activeDays: number;
    byDifficulty: { easy: number; medium: number; hard: number; unknown: number };
  };
  // One row per platform the user submitted on during the range; learnhub is
  // always included if any internal submissions exist.
  byPlatform: RewindRangePlatformStats[];
  // Daily totals for a heatmap. Sparse: only days with activity emitted, plus
  // we emit zeros for the period boundaries so the consumer can render gaps.
  daily: Array<{ date: string; total: number; accepted: number; byPlatform: Record<string, number> }>;
  // Topic counts merged across platforms (extracted submissions carry their
  // own normalized topic tags; internal submissions inherit Problem.tags).
  topTopics: Array<{ topic: string; count: number }>;
  byLanguage: Array<{ language: string; count: number }>;
  // Comparison vs the *previous* equal-length window. Useful for trend arrows
  // ("+38% vs last week"). null when there is no prior data to compare against.
  comparison: {
    previous: { submissions: number; accepted: number; distinctSolved: number; activeDays: number };
    delta: { submissions: number; accepted: number; distinctSolved: number; activeDays: number };
  } | null;
}

function startOfWeekUTC(d: Date): Date {
  // Monday-anchored week (matches CP convention; CodeForces / AtCoder roll their contests by week).
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay();
  const diff = (day + 6) % 7; // Mon=0
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfYearUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function rangeFor(period: RewindPeriod, anchor: Date): { start: Date; end: Date } {
  if (period === 'week') {
    const start = startOfWeekUTC(anchor);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }
  if (period === 'month') {
    const start = startOfMonthUTC(anchor);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start, end };
  }
  // year
  const start = startOfYearUTC(anchor);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start, end };
}

function difficultyBucket(diff: string | null | undefined): 'easy' | 'medium' | 'hard' | 'unknown' {
  const v = (diff ?? '').toLowerCase();
  if (v === 'easy') return 'easy';
  if (v === 'medium') return 'medium';
  if (v === 'hard') return 'hard';
  return 'unknown';
}

export async function getRewindForRange(
  userId: string,
  period: RewindPeriod,
  anchor: Date = new Date()
): Promise<RewindRangeData> {
  const { start, end } = rangeFor(period, anchor);
  const userObjId = new Types.ObjectId(userId);

  // Pull internal + external submissions in parallel.
  const [internal, external] = await Promise.all([
    Submission.find({
      userId: userObjId,
      createdAt: { $gte: start, $lt: end },
    })
      .select('problemId status language createdAt')
      .lean(),
    ExtractedSubmission.find({
      userId: userObjId,
      submittedAt: { $gte: start, $lt: end },
    })
      .select('platform externalId problemId status language difficulty topics submittedAt count')
      .lean(),
  ]);

  // Look up internal-problem metadata in one round trip (difficulty + tags).
  const internalProblemIds = Array.from(
    new Set(internal.map((s) => String(s.problemId)))
  );
  const internalProblems = internalProblemIds.length
    ? await Problem.find({
        _id: { $in: internalProblemIds.map((id) => new Types.ObjectId(id)) },
      })
        .select('difficulty tags')
        .lean()
    : [];
  const internalProbInfo = new Map<string, { difficulty: string; tags: string[] }>();
  for (const p of internalProblems) {
    internalProbInfo.set(String(p._id), {
      difficulty: p.difficulty,
      tags: p.tags ?? [],
    });
  }

  // Per-platform aggregator.
  const perPlatform = new Map<string, {
    submissions: number;
    accepted: number;
    activeDays: Set<string>;
    distinctSolved: Set<string>;
    byDifficulty: { easy: number; medium: number; hard: number; unknown: number };
    langs: Map<string, number>;
  }>();
  const ensure = (platform: string) => {
    let row = perPlatform.get(platform);
    if (!row) {
      row = {
        submissions: 0,
        accepted: 0,
        activeDays: new Set<string>(),
        distinctSolved: new Set<string>(),
        byDifficulty: { easy: 0, medium: 0, hard: 0, unknown: 0 },
        langs: new Map<string, number>(),
      };
      perPlatform.set(platform, row);
    }
    return row;
  };

  // Daily totals across all platforms.
  const daily = new Map<string, { total: number; accepted: number; byPlatform: Record<string, number> }>();
  const ensureDay = (key: string) => {
    let d = daily.get(key);
    if (!d) {
      d = { total: 0, accepted: 0, byPlatform: {} };
      daily.set(key, d);
    }
    return d;
  };

  const topicCount = new Map<string, number>();
  const langCount = new Map<string, number>();

  // Internal submissions
  for (const s of internal) {
    const platform = 'learnhub';
    const row = ensure(platform);
    const day = ymd(new Date(s.createdAt as Date));
    row.submissions++;
    row.activeDays.add(day);
    row.langs.set(s.language, (row.langs.get(s.language) ?? 0) + 1);
    langCount.set(s.language, (langCount.get(s.language) ?? 0) + 1);

    const dayBucket = ensureDay(day);
    dayBucket.total++;
    dayBucket.byPlatform[platform] = (dayBucket.byPlatform[platform] ?? 0) + 1;

    if (s.status === 'accepted') {
      const pid = String(s.problemId);
      row.accepted++;
      row.distinctSolved.add(pid);
      dayBucket.accepted++;

      const info = internalProbInfo.get(pid);
      if (info) {
        const b = difficultyBucket(info.difficulty);
        row.byDifficulty[b]++;
        for (const tag of info.tags ?? []) {
          topicCount.set(tag, (topicCount.get(tag) ?? 0) + 1);
        }
      } else {
        row.byDifficulty.unknown++;
      }
    }
  }

  // External submissions — they already carry difficulty + topics + count.
  for (const s of external) {
    const platform = s.platform as string;
    const row = ensure(platform);
    const day = ymd(new Date(s.submittedAt as Date));
    // Calendar-fallback rows (e.g. LeetCode hidden submissions) carry a count
    // representing N submissions for that day. Treat each row's `count` as the
    // weight rather than 1 so the totals match what the integration card shows.
    const n = typeof (s as any).count === 'number' && (s as any).count > 0
      ? (s as any).count
      : 1;
    row.submissions += n;
    row.activeDays.add(day);
    if (s.language) {
      row.langs.set(s.language, (row.langs.get(s.language) ?? 0) + n);
      langCount.set(s.language, (langCount.get(s.language) ?? 0) + n);
    }

    const dayBucket = ensureDay(day);
    dayBucket.total += n;
    dayBucket.byPlatform[platform] = (dayBucket.byPlatform[platform] ?? 0) + n;

    if (s.status === 'accepted') {
      row.accepted += n;
      // Per-problem dedup: same problem solved twice in the window counts once.
      // For platforms with synthesized day rows (LC calendar) the problemId is
      // unique per (handle, day), so this still doesn't double-count days.
      row.distinctSolved.add(`${platform}:${s.problemId}`);
      dayBucket.accepted += n;

      const b = difficultyBucket(s.difficulty);
      row.byDifficulty[b] += n;
      for (const tag of s.topics ?? []) {
        topicCount.set(tag, (topicCount.get(tag) ?? 0) + 1);
      }
    }
  }

  // Materialize per-platform output
  const byPlatform: RewindRangePlatformStats[] = [];
  for (const [platform, row] of perPlatform) {
    let topLang: string | null = null;
    let topLangN = 0;
    for (const [lang, n] of row.langs) {
      if (n > topLangN) {
        topLangN = n;
        topLang = lang;
      }
    }
    byPlatform.push({
      platform,
      submissions: row.submissions,
      accepted: row.accepted,
      distinctSolved: row.distinctSolved.size,
      activeDays: row.activeDays.size,
      byDifficulty: row.byDifficulty,
      topLanguage: topLang,
    });
  }
  // Highest-volume platform first so the UI doesn't have to re-sort.
  byPlatform.sort((a, b) => b.submissions - a.submissions);

  // Daily array sorted ascending — gives the heatmap a stable order.
  const dailyArr = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Totals = sum across platforms (avoids re-walking the docs).
  let totalSubs = 0;
  let totalAccepted = 0;
  const totalDifficulty = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  const distinctAcrossPlatforms = new Set<string>();
  const totalActiveDaysSet = new Set<string>();
  for (const row of perPlatform.values()) {
    totalSubs += row.submissions;
    totalAccepted += row.accepted;
    totalDifficulty.easy += row.byDifficulty.easy;
    totalDifficulty.medium += row.byDifficulty.medium;
    totalDifficulty.hard += row.byDifficulty.hard;
    totalDifficulty.unknown += row.byDifficulty.unknown;
    for (const k of row.distinctSolved) distinctAcrossPlatforms.add(k);
    for (const d of row.activeDays) totalActiveDaysSet.add(d);
  }

  // Comparison with previous equal-length window.
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs);
  const prevEnd = start;
  const [prevInternal, prevExternal] = await Promise.all([
    Submission.countDocuments({
      userId: userObjId,
      createdAt: { $gte: prevStart, $lt: prevEnd },
    }),
    ExtractedSubmission.find({
      userId: userObjId,
      submittedAt: { $gte: prevStart, $lt: prevEnd },
    })
      .select('status submittedAt count problemId platform')
      .lean(),
  ]);

  const prevDays = new Set<string>();
  let prevSubs = prevInternal;
  let prevAccepted = 0;
  const prevDistinct = new Set<string>();
  // Internal previous-window accepts/active days.
  if (prevInternal > 0) {
    const prevInternalDocs = await Submission.find({
      userId: userObjId,
      createdAt: { $gte: prevStart, $lt: prevEnd },
    })
      .select('status problemId createdAt')
      .lean();
    for (const s of prevInternalDocs) {
      prevDays.add(ymd(new Date(s.createdAt as Date)));
      if (s.status === 'accepted') {
        prevAccepted++;
        prevDistinct.add(`learnhub:${String(s.problemId)}`);
      }
    }
  }
  for (const s of prevExternal) {
    const n = typeof (s as any).count === 'number' && (s as any).count > 0
      ? (s as any).count
      : 1;
    prevSubs += n;
    prevDays.add(ymd(new Date(s.submittedAt as Date)));
    if (s.status === 'accepted') {
      prevAccepted += n;
      prevDistinct.add(`${s.platform}:${s.problemId}`);
    }
  }

  const comparison = prevSubs > 0
    ? {
        previous: {
          submissions: prevSubs,
          accepted: prevAccepted,
          distinctSolved: prevDistinct.size,
          activeDays: prevDays.size,
        },
        delta: {
          submissions: totalSubs - prevSubs,
          accepted: totalAccepted - prevAccepted,
          distinctSolved: distinctAcrossPlatforms.size - prevDistinct.size,
          activeDays: totalActiveDaysSet.size - prevDays.size,
        },
      }
    : null;

  return {
    period,
    range: { start: ymd(start), end: ymd(new Date(end.getTime() - 86_400_000)) },
    hasData: totalSubs > 0,
    totals: {
      submissions: totalSubs,
      accepted: totalAccepted,
      distinctSolved: distinctAcrossPlatforms.size,
      activeDays: totalActiveDaysSet.size,
      byDifficulty: totalDifficulty,
    },
    byPlatform,
    daily: dailyArr,
    topTopics: Array.from(topicCount.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    byLanguage: Array.from(langCount.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count),
    comparison,
  };
}
