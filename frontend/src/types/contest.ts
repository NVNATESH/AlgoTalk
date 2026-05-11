export type ContestPlatform =
  | 'codeforces'
  | 'codechef'
  | 'leetcode'
  | 'atcoder'
  | 'hackerrank'
  | 'hackerearth'
  | 'gfg';

export interface Contest {
  id: string;
  platform: ContestPlatform;
  externalId: string;
  name: string;
  url: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: string;
  problems: Array<{
    index: string;
    title: string;
    difficulty: string;
    tags: string[];
    url: string;
  }>;
}

export interface ContestRegistration {
  id: string;
  status: 'registered' | 'live' | 'ended' | 'analyzed';
  rank: number | null;
  score: number;
  ratingChange: number | null;
  reportId: string | null;
  createdAt: string;
}

export interface ContestRegistrationItem {
  registration: ContestRegistration;
  contest: Contest;
}

export interface ContestReport {
  id: string;
  contestId: string;
  summary: string;
  whatHappened: string;
  whatYouDidWell: Array<{ point: string; evidence: string }>;
  whereYouStruggled: Array<{
    problem: string;
    issue: string;
    rootCause: string;
    timeLostMinutes: number;
  }>;
  codeQualityNotes: Array<{ problem: string; note: string }>;
  howToImprove: Array<{ priority: string; action: string }>;
  whatToLearnNext: Array<{
    topic: string;
    why: string;
    estimatedHours: number;
    resources: string[];
  }>;
  practicePlan7Days: Array<{
    day: number;
    problems: Array<{
      platform: string;
      url: string;
      title: string;
      difficulty: string;
      topic: string;
      estimatedMinutes: number;
    }>;
  }>;
  predictedRatingChange: string;
  nextContestRecommendation: string;
  resources?: Array<{
    type: 'article' | 'video' | 'blog' | 'docs' | 'repo' | 'problem' | 'course';
    title: string;
    url: string;
    topic: string;
    why: string;
  }>;
  generatedBy: string;
  createdAt: string;
  actualRatingChange?: number | null;
  actualRank?: number | null;
  actualScore?: number | null;
}
