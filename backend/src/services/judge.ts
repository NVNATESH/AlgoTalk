import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

const ONECOMPILER_URL = 'https://api.onecompiler.com/api/v1/run';

export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'cpp';

interface LanguageMeta {
  fileName: string;
  ocLang: string; // OneCompiler language identifier
}

const LANGUAGE_META: Record<SupportedLanguage, LanguageMeta> = {
  python: { fileName: 'main.py', ocLang: 'python' },
  javascript: { fileName: 'index.js', ocLang: 'javascript' },
  java: { fileName: 'Main.java', ocLang: 'java' },
  cpp: { fileName: 'main.cpp', ocLang: 'cpp' },
};

export interface ExecuteRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
}

export interface ExecuteResult {
  status: 'success' | 'error';
  stdout: string;
  stderr: string;
  exception: string | null;
  compilationTime: number;
  executionTime: number;
  memoryUsedKb: number;
  creditsRemaining?: number;
}

interface OneCompilerResponse {
  status: 'success' | string;
  exception: string | null;
  stdout: string | null;
  stderr: string | null;
  compilationTime: number;
  executionTime: number;
  memoryUsed: number;
  creditsRemaining?: number;
}

export async function executeCode(req: ExecuteRequest): Promise<ExecuteResult> {
  if (!env.ONECOMPILER_API_KEY) {
    throw ApiError.badRequest('Code execution provider not configured (set ONECOMPILER_API_KEY)');
  }
  const meta = LANGUAGE_META[req.language];
  if (!meta) throw ApiError.badRequest(`Unsupported language: ${req.language}`);

  const body = {
    language: meta.ocLang,
    files: [{ name: meta.fileName, content: req.code }],
    ...(req.stdin !== undefined ? { stdin: req.stdin } : {}),
  };

  let res: Response;
  try {
    res = await fetch(ONECOMPILER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ONECOMPILER_API_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err }, 'judge network error');
    throw new ApiError(502, 'Code execution service unreachable');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ status: res.status, text: text.slice(0, 200) }, 'judge non-2xx');
    if (res.status === 401 || res.status === 403) {
      throw new ApiError(502, 'Code execution credentials invalid');
    }
    if (res.status === 429) {
      throw new ApiError(429, 'Code execution rate limited — try again in a moment');
    }
    throw new ApiError(502, 'Code execution failed');
  }

  const data = (await res.json()) as OneCompilerResponse;
  return {
    status: data.status === 'success' ? 'success' : 'error',
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? '',
    exception: data.exception ?? null,
    compilationTime: data.compilationTime ?? 0,
    executionTime: data.executionTime ?? 0,
    memoryUsedKb: data.memoryUsed ?? 0,
    creditsRemaining: data.creditsRemaining,
  };
}

export interface TestCaseInput {
  stdin: string;
  expectedStdout: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
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

const normalizeOutput = (s: string) => s.replace(/\r\n/g, '\n').replace(/\s+$/g, '').trim();

export async function runTestCases(
  language: SupportedLanguage,
  code: string,
  cases: TestCaseInput[],
  options: { stopOnFail?: boolean } = {}
): Promise<{
  results: TestCaseResult[];
  passed: number;
  total: number;
  creditsRemaining?: number;
}> {
  const results: TestCaseResult[] = [];
  let passed = 0;
  let credits: number | undefined;

  for (const tc of cases) {
    let exec: ExecuteResult;
    try {
      exec = await executeCode({ language, code, stdin: tc.stdin });
    } catch (err) {
      results.push({
        passed: false,
        stdin: tc.stdin,
        expected: tc.expectedStdout,
        actual: '',
        stderr: err instanceof Error ? err.message : 'execution failed',
        exception: 'execution_error',
        executionTimeMs: 0,
        memoryUsedKb: 0,
        hidden: !!tc.isHidden,
      });
      if (options.stopOnFail) break;
      continue;
    }
    if (exec.creditsRemaining !== undefined) credits = exec.creditsRemaining;

    const actual = normalizeOutput(exec.stdout);
    const expected = normalizeOutput(tc.expectedStdout);
    const ok =
      exec.status === 'success' && !exec.exception && !exec.stderr && actual === expected;

    if (ok) passed++;
    results.push({
      passed: ok,
      stdin: tc.stdin,
      expected: tc.expectedStdout,
      actual: exec.stdout,
      stderr: exec.stderr,
      exception: exec.exception,
      executionTimeMs: exec.executionTime,
      memoryUsedKb: exec.memoryUsedKb,
      hidden: !!tc.isHidden,
    });

    if (!ok && options.stopOnFail) break;
  }

  return { results, passed, total: cases.length, creditsRemaining: credits };
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['python', 'javascript', 'java', 'cpp'];

export const languageDisplayName = (lang: SupportedLanguage) =>
  ({ python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++' }[lang]);
