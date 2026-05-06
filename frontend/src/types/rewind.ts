export interface MonthStats {
  month: number;
  monthLabel: string;
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
  date: string;
  label: string;
  detail?: string;
  count?: number;
}

export interface MonthlyAggregate {
  submissions: number;
  accepted: number;
  distinctSolved: number;
  activeDays: number;
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

export interface RewindInsights {
  narrative: string;
  highlights: string[];
  growthPeriod: string;
  productiveMonths: string;
  decline: string | null;
  improvementAreas: string[];
  h1VsH2: string;
}

export interface RewindInsightsResult {
  insights: RewindInsights;
  data: RewindData;
}
