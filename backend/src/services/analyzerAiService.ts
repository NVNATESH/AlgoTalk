import { Problem } from '../models/Problem.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON, proModel } from './gemini.js';
import {
  analyzeCode as runStaticAnalysis,
  formatAnalysisHints,
  type SupportedLanguage as StaticLanguage,
} from '../analysis/staticAnalyzer.js';

const STATIC_LANGS = new Set<StaticLanguage>(['cpp', 'python', 'javascript', 'java']);
import { buildProgressContext, computeOverview } from './analyzerService.js';
import {
  codeAnalysisPrompt,
  progressInsightsPrompt,
  recommendNextProblemPrompt,
  type CodeAnalysisResponse,
  type ProgressInsightsResponse,
  type RecommendationResponse,
} from '../prompts/analyzer.js';

export async function analyzeProgress(userId: string): Promise<{
  insights: ProgressInsightsResponse;
  context: Awaited<ReturnType<typeof buildProgressContext>>;
}> {
  const context = await buildProgressContext(userId);
  const insights = await geminiJSON<ProgressInsightsResponse>(
    progressInsightsPrompt(context),
    { model: proModel() }
  );
  return { insights, context };
}

export async function analyzeCode(input: {
  code: string;
  language: string;
  problemSlug?: string;
}): Promise<CodeAnalysisResponse> {
  let problemContext: string | undefined;
  if (input.problemSlug) {
    const p = await Problem.findOne({ slug: input.problemSlug })
      .select('title description difficulty tags')
      .lean();
    if (p) {
      problemContext = `Problem: ${p.title} (${p.difficulty})\nTags: ${(p.tags ?? []).join(', ')}\n\n${p.description}`;
    }
  }
  // Pre-compute the cheap static signals (functions, depth, data structures)
  // and feed them as hints to Gemini — keeps the LLM from spending tokens
  // re-deriving facts our parser already has.
  let staticHints: string | undefined;
  if (STATIC_LANGS.has(input.language as StaticLanguage)) {
    try {
      const a = runStaticAnalysis(input.code, input.language as StaticLanguage);
      staticHints = formatAnalysisHints(a);
    } catch {
      /* ignore parse failures; the LLM still has the raw code */
    }
  }
  // Use flash (faster, cheaper, ample for code review). Pro reserved for progress insights.
  const out = await geminiJSON<CodeAnalysisResponse>(
    codeAnalysisPrompt({
      code: input.code,
      language: input.language,
      problemContext,
      staticHints,
    })
  );
  // Normalize line numbers (clamp to actual line count)
  const lineCount = input.code.split('\n').length;
  out.problem_lines = (out.problem_lines ?? [])
    .filter((p) => Number.isFinite(p.line))
    .map((p) => ({ ...p, line: Math.max(1, Math.min(lineCount, Math.round(p.line))) }));
  return out;
}

/**
 * Cross-platform recommendation pass: pulls platform pulse + progress context,
 * asks Gemini for 5 picks spread across the user's connected platforms with
 * direct URLs. Distinct from `recommendNextProblem`, which is constrained to
 * the LearnHub catalog.
 */
export async function recommendCrossPlatform(userId: string) {
  const ctx = await buildProgressContext(userId);
  const { getLastSubmissionPerPlatform } = await import('./integrationService.js');
  const platformsRaw = await getLastSubmissionPerPlatform(userId);
  const pulses = platformsRaw.map((p) => ({
    platform: p.platform,
    handle: p.handle,
    rating: p.rating,
    rank: p.rank,
    submissionCount: p.submissionCount,
    acceptedCount: p.acceptedCount,
    lastSubmission: p.lastSubmission
      ? {
          problemTitle: p.lastSubmission.problemTitle,
          status: p.lastSubmission.status,
          daysSince: p.lastSubmission.daysSince,
        }
      : null,
  }));
  const { crossPlatformRecsPrompt } = await import('../prompts/crossPlatformRecs.js');
  type CrossPlatformRecResponse =
    import('../prompts/crossPlatformRecs.js').CrossPlatformRecResponse;
  const out = await geminiJSON<CrossPlatformRecResponse>(
    crossPlatformRecsPrompt({ ctx, pulses })
  );
  // Filter recs to ones with plausible URLs (basic sanity — drop anything
  // that doesn't even start with http). Don't fetch them; that's expensive
  // and would slow this endpoint down unacceptably.
  out.recommendations = (out.recommendations ?? []).filter(
    (r) =>
      typeof r.problemUrl === 'string' &&
      /^https?:\/\//.test(r.problemUrl) &&
      typeof r.problemTitle === 'string' &&
      r.problemTitle.length > 0
  );
  return { ...out, platformsConnected: pulses.length, cfRatingZone: ctx.cfRatingZone };
}

export async function recommendNextProblem(userId: string): Promise<{
  recommendation: RecommendationResponse;
  pickedProblem: { slug: string; title: string; difficulty: string; tags: string[] } | null;
  cfRatingZone: Awaited<ReturnType<typeof buildProgressContext>>['cfRatingZone'];
}> {
  const overview = await computeOverview(userId);
  if (overview.unattempted.length === 0) {
    throw ApiError.badRequest('You have attempted every available problem — nothing to recommend.');
  }
  const ctx = await buildProgressContext(userId);
  const recommendation = await geminiJSON<RecommendationResponse>(
    recommendNextProblemPrompt({ ctx, unattempted: overview.unattempted })
  );

  let pickedProblem: { slug: string; title: string; difficulty: string; tags: string[] } | null = null;
  if (recommendation.pickedSlug) {
    const p = overview.unattempted.find((u) => u.slug === recommendation.pickedSlug);
    if (p) pickedProblem = p;
    else {
      // Gemini returned a slug not in the list — pick the first alternative that IS in the list.
      const alt = recommendation.alternatives.find((s) => overview.unattempted.some((u) => u.slug === s));
      if (alt) {
        recommendation.pickedSlug = alt;
        pickedProblem = overview.unattempted.find((u) => u.slug === alt) ?? null;
      } else {
        // Fallback: just take the first unattempted
        recommendation.pickedSlug = overview.unattempted[0].slug;
        pickedProblem = overview.unattempted[0];
      }
    }
  }
  return { recommendation, pickedProblem, cfRatingZone: ctx.cfRatingZone };
}
