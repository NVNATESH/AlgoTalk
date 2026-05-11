export type Platform =
  | 'leetcode'
  | 'codeforces'
  | 'codechef'
  | 'hackerrank'
  | 'atcoder'
  | 'gfg'
  | 'hackerearth';

export interface PlatformDashboardEntry {
  platform: Platform;
  handle: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSolvedAt: string | null;
  distinctSolved: number;
  submissions: number;
  difficulty: { easy: number; medium: number; hard: number; unknown: number };
  topTopics: Array<{ topic: string; count: number }>;
  recentRatings: Array<{ submittedAt: string; rating: number; problemId: string }>;
  currentStreakDays: number;
}

export interface RewindDashboardOverview {
  topicMastery: Array<{
    topic: string;
    solved: number;
    attempted: number;
    acceptanceRate: number;
    mastery: number;
    recentTrend: 'improving' | 'stable' | 'declining' | 'new';
  }>;
  peakHours: number[][];
  peakHourMax: number;
  bestHourBucket: { day: number; hour: number; count: number } | null;
  ratingDistribution: {
    platform: 'codeforces';
    buckets: Array<{ bucket: number; total: number; accepted: number }>;
    maxAcceptedRating: number | null;
    ceiling: number | null;
    totalRated: number;
    totalSolved: number;
  } | null;
  byLanguage: Array<{ language: string; count: number; accepted: number; acceptanceRate: number }>;
  failurePatterns: Array<{ status: string; count: number; pct: number }>;
}

export interface RewindDashboardResponse {
  platforms: PlatformDashboardEntry[];
  overview: RewindDashboardOverview | null;
}
