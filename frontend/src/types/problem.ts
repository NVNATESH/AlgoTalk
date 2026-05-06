export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Language = 'python' | 'javascript' | 'java' | 'cpp';
export type UserStatus = 'solved' | 'attempted' | 'unsolved';

export type SubmissionStatus =
  | 'accepted'
  | 'wrong_answer'
  | 'tle'
  | 'runtime_error'
  | 'compile_error'
  | 'mle'
  | 'execution_error';

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  companyTags: string[];
  acceptanceRate: number | null;
  totalSubmissions: number;
  userStatus: UserStatus;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface VisibleTestCase {
  stdin: string;
  expectedStdout: string;
}

export interface ProblemDetail extends ProblemSummary {
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Example[];
  visibleTestCases: VisibleTestCase[];
  starterCode: Record<Language, string>;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface RunResultPerCase {
  passed: boolean;
  stdin: string;
  expected: string;
  actual: string;
  stderr: string;
  exception: string | null;
  executionTimeMs: number;
  memoryUsedKb: number;
  hidden: boolean;
}

export interface RunResultTests {
  mode: 'tests';
  results: RunResultPerCase[];
  passed: number;
  total: number;
  creditsRemaining?: number;
}

export interface RunResultCustom {
  mode: 'custom';
  stdout: string;
  stderr: string;
  exception: string | null;
  executionTimeMs: number;
  memoryKb: number;
  creditsRemaining?: number;
}

export type RunResult = RunResultTests | RunResultCustom;

export interface Submission {
  id: string;
  problemId: string;
  language: Language;
  status: SubmissionStatus;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryKb: number;
  failedTestSnippet: string;
  stderrSnippet: string;
  createdAt: string;
}
