export interface TopicMastery {
  topic: string;
  solved: number;
  attempted: number;
  acceptanceRate: number;
  mastery: number;
  recentTrend: 'improving' | 'stable' | 'declining' | 'new';
}

export interface FailurePattern {
  status: string;
  count: number;
  pct: number;
}

export interface RatingBucket {
  bucket: number;
  total: number;
  accepted: number;
}

export interface RatingDistribution {
  platform: 'codeforces';
  buckets: RatingBucket[];
  maxAcceptedRating: number | null;
  ceiling: number | null;
  totalRated: number;
  totalSolved: number;
}

export interface AnalyzerOverview {
  totals: {
    submissions: number;
    accepted: number;
    distinctSolved: number;
    acceptanceRate: number;
    avgAttemptsBeforeAccept: number | null;
    bestRuntimeMs: number | null;
    avgRuntimeMs: number | null;
  };
  topicMastery: TopicMastery[];
  peakHours: number[][]; // 7 × 24
  peakHourMax: number;
  bestHourBucket: { day: number; hour: number; count: number } | null;
  failurePatterns: FailurePattern[];
  byLanguage: Array<{ language: string; count: number; accepted: number; acceptanceRate: number }>;
  attemptedProblems: number;
  unattempted: Array<{ slug: string; title: string; difficulty: string; tags: string[] }>;
  ratingDistribution: RatingDistribution | null;
}

export interface ProgressInsights {
  strengths: string[];
  weaknesses: string[];
  learning_gaps: string[];
  roadmap: Array<{ week: number; focus: string; problems: string[] }>;
  daily_goal: string;
  difficulty_progression: string;
  summary: string;
}

export interface CodeAnalysis {
  complexity: { time: string; space: string };
  score: number;
  readability: string;
  bottlenecks: string[];
  anti_patterns: string[];
  edge_cases_missed: string[];
  suggestions: string[];
  optimized_code: string;
  problem_lines: Array<{ line: number; issue: string }>;
}

export interface CfRatingZone {
  ceiling: number;
  comfortBand: { low: number; high: number; acceptanceRate: number } | null;
  growthBand: { low: number; high: number; acceptanceRate: number } | null;
  totalSolved: number;
}

export interface NextProblemRecommendation {
  recommendation: {
    pickedSlug: string | null;
    alternatives: string[];
    reasoning: string;
    what_to_focus_on: string;
  };
  pickedProblem: { slug: string; title: string; difficulty: string; tags: string[] } | null;
  cfRatingZone: CfRatingZone | null;
}
