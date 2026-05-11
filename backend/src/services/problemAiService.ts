import { Types } from 'mongoose';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON, proModel } from './gemini.js';
import {
  hintPrompt,
  explainProblemPrompt,
  explainCodePrompt,
  optimizePrompt,
} from '../prompts/problem.js';
import {
  buildUpsolvedFeedbackPrompt,
  type UpsolvedFeedbackResponse,
} from '../prompts/upsolvedFeedback.js';
import { computeOverview } from './analyzerService.js';

async function loadProblem(slug: string) {
  const p = await Problem.findOne({ slug }).lean();
  if (!p) throw ApiError.notFound('Problem not found');
  return p;
}

const ctxFromProblem = (p: any) => ({
  title: p.title,
  description: p.description,
  difficulty: p.difficulty,
  tags: p.tags ?? [],
});

export async function generateHint(slug: string, code?: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ hint: string }>(hintPrompt(ctxFromProblem(p), code));
  return out;
}

export async function generateExplanation(slug: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ explanation: string }>(explainProblemPrompt(ctxFromProblem(p)));
  return out;
}

export async function generateCodeExplanation(slug: string, code: string, language: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ explanation: string }>(
    explainCodePrompt(ctxFromProblem(p), code, language)
  );
  return out;
}

export async function generateOptimization(slug: string, code: string, language: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{
    currentComplexity: { time: string; space: string };
    targetComplexity: { time: string; space: string };
    suggestions: string[];
    optimizedCode: string;
  }>(optimizePrompt(ctxFromProblem(p), code, language), { model: proModel() });
  return out;
}

/**
 * Structured 7-section "upsolve" feedback (see prompts/upsolvedFeedback.ts).
 * Pulled together from the user's last failing submission unless the caller
 * provides their own code (e.g. from the editor before they hit submit).
 */
export async function generateUpsolvedFeedback(
  userId: string,
  slug: string,
  opts: { code?: string; language?: string } = {}
): Promise<UpsolvedFeedbackResponse> {
  const p = await loadProblem(slug);

  let code = opts.code;
  let language = opts.language ?? 'python';
  let attemptCount = 0;
  let failureSummary = 'User chose to upsolve before/without submitting';

  if (!code) {
    const last = await Submission.find({
      userId: new Types.ObjectId(userId),
      problemId: p._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('code language status passedCount totalCount stderrSnippet failedTestSnippet createdAt')
      .lean();
    if (last.length === 0) {
      throw ApiError.badRequest(
        'No prior submissions for this problem. Submit at least once or pass code in the request.'
      );
    }
    attemptCount = last.length;
    const lastFailing = last.find((s) => s.status !== 'accepted') ?? last[0];
    code = lastFailing.code;
    language = lastFailing.language;
    failureSummary =
      lastFailing.status === 'accepted'
        ? `Eventually accepted after ${attemptCount} attempts — the user wants a deeper review`
        : `Last verdict: ${lastFailing.status} (${lastFailing.passedCount}/${lastFailing.totalCount} cases passed)` +
          (lastFailing.failedTestSnippet ? ` · failing input: ${lastFailing.failedTestSnippet.slice(0, 200)}` : '') +
          (lastFailing.stderrSnippet ? ` · stderr: ${lastFailing.stderrSnippet.slice(0, 200)}` : '');
  }

  const overview = await computeOverview(userId).catch(() => null);
  const weakTopics =
    overview?.topicMastery
      .filter((t) => t.attempted >= 2 && t.mastery < 50)
      .map((t) => t.topic)
      .slice(0, 5) ?? [];
  const recentAccepted = await Submission.find({
    userId: new Types.ObjectId(userId),
    status: 'accepted',
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate({ path: 'problemId', select: 'title slug' })
    .lean();
  const recentSolved = recentAccepted
    .map((s: any) => s.problemId?.title)
    .filter(Boolean)
    .slice(0, 8);

  const out = await geminiJSON<UpsolvedFeedbackResponse>(
    buildUpsolvedFeedbackPrompt({
      problemTitle: p.title,
      problemSlug: p.slug,
      problemDescription: p.description,
      difficulty: p.difficulty,
      tags: p.tags ?? [],
      userCode: code!,
      userLanguage: language,
      failureSummary,
      attemptCount,
      userLevel: inferLevel(overview?.totals.distinctSolved ?? 0),
      weakTopics,
      recentSolved,
    }),
    { model: proModel() }
  );
  return out;
}

function inferLevel(solved: number): string {
  if (solved >= 500) return 'Master';
  if (solved >= 200) return 'Advanced';
  if (solved >= 50) return 'Intermediate';
  return 'Beginner';
}
