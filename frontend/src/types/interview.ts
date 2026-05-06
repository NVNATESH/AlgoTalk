export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';
export type InterviewRole =
  | 'SDE-1 (entry)'
  | 'SDE-2 (mid)'
  | 'SDE-3 (senior)'
  | 'Backend'
  | 'Frontend'
  | 'ML'
  | 'Generic';

export type InterviewStatus = 'in_progress' | 'submitted' | 'completed' | 'abandoned';
export type Verdict = 'pass' | 'partial' | 'fail';

export interface InterviewProblem {
  title: string;
  statement: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  expectedComplexity: { time: string; space: string };
  starterHint: string;
}

export interface ApproachFeedback {
  transcript: string;
  onTrack: boolean;
  score: number;
  observations: string[];
  questionsToConsider: string[];
  suggestedDirection: string;
  complexity: { time: string | null; space: string | null };
  createdAt: string;
}

export interface InterviewEvaluation {
  verdict: Verdict;
  score: number;
  complexity: { time: string; space: string };
  strengths: string[];
  weaknesses: string[];
  edgeCasesMissed: string[];
  lineByLine: Array<{ line: number; comment: string }>;
  summary: string;
  createdAt: string;
}

export interface FollowUpMessage {
  role: 'user' | 'interviewer';
  text: string;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  topic: string;
  difficulty: InterviewDifficulty;
  role: InterviewRole;
  notes: string;
  problem: InterviewProblem;
  code: string;
  language: string;
  approachFeedbacks: ApproachFeedback[];
  evaluation: InterviewEvaluation | null;
  followUps: FollowUpMessage[];
  status: InterviewStatus;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  createdAt: string | null;
}

export interface InterviewSessionSummary {
  id: string;
  topic: string;
  difficulty: InterviewDifficulty;
  role: InterviewRole;
  problemTitle: string;
  status: InterviewStatus;
  evaluationScore: number | null;
  evaluationVerdict: Verdict | null;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  createdAt: string | null;
}
