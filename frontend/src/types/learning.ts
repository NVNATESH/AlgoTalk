export type QuestionType = 'mcq_single' | 'mcq_multi' | 'fill_blank' | 'match' | 'true_false';

export interface Example {
  title: string;
  explanation: string;
  code: string;
  language: string;
}

interface QuestionBase {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
}

// Server-sanitized shapes (no correct answers exposed)
export interface MCQSingleQuestion extends QuestionBase {
  type: 'mcq_single';
  options: string[];
}
export interface MCQMultiQuestion extends QuestionBase {
  type: 'mcq_multi';
  options: string[];
}
export interface FillBlankQuestion extends QuestionBase {
  type: 'fill_blank';
  blanks: string[]; // empty strings, length == number of blanks to fill
}
export interface MatchQuestion extends QuestionBase {
  type: 'match';
  pairs: Array<{ left: string }>;
  rights: string[]; // shuffled
}
export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
}

export type Question =
  | MCQSingleQuestion
  | MCQMultiQuestion
  | FillBlankQuestion
  | MatchQuestion
  | TrueFalseQuestion;

export interface LearningContent {
  id: string;
  goalId: string;
  moduleId: string;
  concepts: string;
  examples: Example[];
  quiz: Question[];
  questionCount: number;
  totalPoints: number;
  bestPercentage: number;
  attemptCount: number;
  generatedAt: string;
  generationVersion: number;
}

// Answer shapes the user submits
export type Answer =
  | { type: 'mcq_single'; choice: number }
  | { type: 'mcq_multi'; choices: number[] }
  | { type: 'fill_blank'; values: string[] }
  | { type: 'match'; pairs: Array<{ left: string; right: string }> }
  | { type: 'true_false'; value: boolean };

export interface QuestionResult {
  id: string;
  type: QuestionType;
  correct: boolean;
  pointsEarned: number;
  pointsAvailable: number;
  explanation: string;
  expected: any;
}

export interface QuizResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passThreshold: number;
  xpAwarded: number;
  firstPass: boolean;
  bestPercentage: number;
  attemptCount: number;
  results: QuestionResult[];
}
