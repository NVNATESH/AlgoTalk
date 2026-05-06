export type Platform =
  | 'leetcode'
  | 'codeforces'
  | 'codechef'
  | 'hackerrank'
  | 'atcoder'
  | 'gfg'
  | 'hackerearth';

export interface Integration {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  avatarUrl: string;
  rating: number | null;
  rank: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'ok' | 'failed' | 'never';
  lastSyncError: string;
  syncCount: number;
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExtractedSubmission {
  id: string;
  platform: Platform;
  externalId: string;
  problemId: string;
  problemTitle: string;
  problemUrl: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  rating: number | null;
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'tle'
    | 'mle'
    | 'runtime_error'
    | 'compile_error'
    | 'rejected'
    | 'pending'
    | 'unknown';
  language: string;
  submittedAt: string;
}

export interface ExtractionStats {
  byPlatform: Record<string, { submissions: number; accepted: number; distinctSolved: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  byLanguage: Array<{ language: string; count: number }>;
  total: number;
}
