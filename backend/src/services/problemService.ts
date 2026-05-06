import { Types } from 'mongoose';
import { Problem, problemSummary, problemDetail } from '../models/Problem.js';
import { Submission, submissionToJSON } from '../models/Submission.js';
import { ApiError } from '../utils/ApiError.js';
import {
  executeCode,
  runTestCases,
  type SupportedLanguage,
  type TestCaseInput,
} from './judge.js';
import { analyzeCode } from '../analysis/staticAnalyzer.js';

interface ListOpts {
  search?: string;
  difficulty?: ('Easy' | 'Medium' | 'Hard')[];
  tags?: string[];
  companies?: string[];
  page?: number;
  limit?: number;
  status?: 'solved' | 'attempted' | 'unsolved';
  userId?: string;
}

export async function listProblems(opts: ListOpts) {
  const filter: Record<string, unknown> = {};
  if (opts.search) {
    filter.$or = [
      { title: { $regex: opts.search, $options: 'i' } },
      { slug: { $regex: opts.search, $options: 'i' } },
    ];
  }
  if (opts.difficulty?.length) filter.difficulty = { $in: opts.difficulty };
  if (opts.tags?.length) filter.tags = { $in: opts.tags };
  if (opts.companies?.length) {
    // Case-insensitive company match — companyTags are stored as the original
    // casing they were seeded with (e.g. "Google", "Amazon"); we let users hit
    // the URL with any case.
    filter.companyTags = {
      $in: opts.companies.map((c) => new RegExp(`^${escapeRegex(c)}$`, 'i')),
    };
  }

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Problem.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Problem.countDocuments(filter),
  ]);

  let userStatus: Map<string, 'solved' | 'attempted'> = new Map();
  if (opts.userId && docs.length) {
    const ids = docs.map((d) => d._id);
    const subs = await Submission.find({
      userId: opts.userId,
      problemId: { $in: ids },
    })
      .select('problemId status')
      .lean();
    for (const s of subs) {
      const k = String(s.problemId);
      const prev = userStatus.get(k);
      if (s.status === 'accepted') userStatus.set(k, 'solved');
      else if (prev !== 'solved') userStatus.set(k, 'attempted');
    }
  }

  let problems = docs.map((d) => ({
    ...problemSummary(d),
    userStatus: userStatus.get(String(d._id)) ?? 'unsolved',
  }));

  if (opts.status) {
    problems = problems.filter((p) => p.userStatus === opts.status);
  }

  return { problems, total, page, limit };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Distinct company tags across the catalog, with how many problems carry each.
 * Used to populate the /problems/companies index page so users can browse by
 * company without typing.
 */
export async function listCompanies(): Promise<Array<{ name: string; count: number }>> {
  const rows = await Problem.aggregate([
    { $unwind: '$companyTags' },
    { $group: { _id: '$companyTags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
  ]);
  return rows as Array<{ name: string; count: number }>;
}

export async function getProblemBySlug(slug: string, userId?: string) {
  const p = await Problem.findOne({ slug }).lean();
  if (!p) throw ApiError.notFound('Problem not found');

  const detail = problemDetail(p);

  let userStatus: 'solved' | 'attempted' | 'unsolved' = 'unsolved';
  if (userId) {
    const subs = await Submission.find({ userId, problemId: p._id })
      .select('status')
      .lean();
    if (subs.some((s) => s.status === 'accepted')) userStatus = 'solved';
    else if (subs.length) userStatus = 'attempted';
  }

  return { ...detail, userStatus };
}

export async function runVisibleTests(
  slug: string,
  language: SupportedLanguage,
  code: string,
  customStdin?: string
) {
  const p = await Problem.findOne({ slug });
  if (!p) throw ApiError.notFound('Problem not found');

  // If user provided their own stdin, run a single execution and return it as a free-form result.
  if (customStdin !== undefined && customStdin !== null) {
    const exec = await executeCode({ language, code, stdin: customStdin });
    return {
      mode: 'custom' as const,
      stdout: exec.stdout,
      stderr: exec.stderr,
      exception: exec.exception,
      executionTimeMs: exec.executionTime,
      memoryKb: exec.memoryUsedKb,
      creditsRemaining: exec.creditsRemaining,
    };
  }

  const visible: TestCaseInput[] = (p.testCases as any[]).filter((tc) => !tc.isHidden);
  if (visible.length === 0) {
    throw ApiError.badRequest('No visible test cases — provide custom input');
  }
  const out = await runTestCases(language, code, visible, { stopOnFail: false });
  return { mode: 'tests' as const, ...out };
}

export async function submit(
  userId: string,
  slug: string,
  language: SupportedLanguage,
  code: string
) {
  const p = await Problem.findOne({ slug });
  if (!p) throw ApiError.notFound('Problem not found');

  const cases: TestCaseInput[] = (p.testCases as any[]).map((tc) => ({
    stdin: tc.stdin,
    expectedStdout: tc.expectedStdout,
    isHidden: tc.isHidden,
  }));

  if (cases.length === 0) throw ApiError.badRequest('Problem has no test cases');

  const out = await runTestCases(language, code, cases, { stopOnFail: true });

  // Determine status
  let status: any = 'accepted';
  let stderr = '';
  let failedSnippet = '';
  let runtime = 0;
  let memory = 0;

  if (out.passed === out.total) {
    status = 'accepted';
    runtime = Math.max(...out.results.map((r) => r.executionTimeMs), 0);
    memory = Math.max(...out.results.map((r) => r.memoryUsedKb), 0);
  } else {
    const firstFail = out.results.find((r) => !r.passed);
    if (firstFail) {
      if (firstFail.exception === 'execution_error') status = 'execution_error';
      else if (firstFail.stderr && /compile/i.test(firstFail.stderr)) status = 'compile_error';
      else if (firstFail.stderr || firstFail.exception) status = 'runtime_error';
      else status = 'wrong_answer';
      stderr = firstFail.stderr;
      // expose failed details only if visible
      if (!firstFail.hidden) {
        failedSnippet = `Input: ${firstFail.stdin.trim()}\nExpected: ${firstFail.expected.trim()}\nActual:   ${firstFail.actual.trim()}`;
      } else {
        failedSnippet = `Failed on a hidden test (${out.passed}/${out.total} passed).`;
      }
    }
  }

  // Lightweight static analysis — captured once at submit so AI reviewers
  // and the analyzer dashboard don't have to re-scan the code later.
  let staticAnalysis: ReturnType<typeof analyzeCode> | null = null;
  try {
    staticAnalysis = analyzeCode(code, language);
  } catch (err) {
    // Bad regex matches against weird code shouldn't fail the submit.
    staticAnalysis = null;
  }

  const sub = await Submission.create({
    userId,
    problemId: p._id,
    code,
    language,
    status,
    passedCount: out.passed,
    totalCount: out.total,
    runtimeMs: runtime,
    memoryKb: memory,
    failedTestSnippet: failedSnippet,
    stderrSnippet: stderr.slice(0, 500),
    ...(staticAnalysis
      ? {
          staticAnalysis: {
            loc: staticAnalysis.loc,
            functionCount: staticAnalysis.functionCount,
            maxDepth: staticAnalysis.maxDepth,
            dataStructures: staticAnalysis.dataStructures,
            controlFlow: staticAnalysis.controlFlow,
          },
        }
      : {}),
  });

  // bump problem stats (atomically)
  await Problem.updateOne(
    { _id: p._id },
    {
      $inc: {
        totalSubmissions: 1,
        ...(status === 'accepted' ? { totalAccepted: 1 } : {}),
      },
    }
  );

  return {
    submission: submissionToJSON(sub.toObject()),
    creditsRemaining: out.creditsRemaining,
  };
}

export async function listSubmissions(userId: string, slug: string) {
  const p = await Problem.findOne({ slug }).select('_id').lean();
  if (!p) throw ApiError.notFound('Problem not found');
  const subs = await Submission.find({ userId, problemId: p._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return subs.map(submissionToJSON);
}
