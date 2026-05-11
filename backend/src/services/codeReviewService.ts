import { Types } from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Problem } from '../models/Problem.js';
import { CodeReview, codeReviewToJSON } from '../models/CodeReview.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON } from './gemini.js';
import { codeReviewPrompt } from '../prompts/review.js';
import { sanitizeResources, type LearningResource } from './learningResourceService.js';

type ReviewSeverityCounts = { critical: number; warning: number; suggestion: number; info: number };

interface AiReviewShape {
  overall: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  lineComments: Array<{
    line: number;
    severity: 'critical' | 'warning' | 'suggestion' | 'info';
    comment: string;
  }>;
  resources?: unknown; // shape validated by sanitizeResources
}

const VALID_SEVERITY = new Set(['critical', 'warning', 'suggestion', 'info']);

type SanitizedReview = Omit<AiReviewShape, 'resources'> & { resources: LearningResource[] };

function sanitize(raw: AiReviewShape, lineCount: number): SanitizedReview {
  // Clamp + drop comments that point at lines outside the file or have garbage severity.
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  const lineComments = (Array.isArray(raw.lineComments) ? raw.lineComments : [])
    .filter(
      (c) =>
        Number.isInteger(c.line) &&
        c.line >= 1 &&
        c.line <= lineCount &&
        VALID_SEVERITY.has(c.severity) &&
        typeof c.comment === 'string' &&
        c.comment.trim().length > 0
    )
    .slice(0, 8);
  return {
    overall: typeof raw.overall === 'string' ? raw.overall.slice(0, 1500) : '',
    score,
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).slice(0, 4),
    weaknesses: (Array.isArray(raw.weaknesses) ? raw.weaknesses : []).slice(0, 6),
    lineComments,
    resources: sanitizeResources(raw.resources, { max: 5 }),
  };
}

export async function getOrGenerateReview(
  userId: string,
  slug: string,
  submissionId: string,
  opts: { force?: boolean } = {}
) {
  if (!Types.ObjectId.isValid(submissionId)) {
    throw ApiError.notFound('Submission not found');
  }

  const submission = await Submission.findById(submissionId).lean();
  if (!submission) throw ApiError.notFound('Submission not found');
  if (String(submission.userId) !== userId) {
    throw ApiError.forbidden('You can only review your own submissions');
  }

  const problem = await Problem.findOne({ slug }).select('_id title description difficulty tags').lean();
  if (!problem) throw ApiError.notFound('Problem not found');
  if (String(submission.problemId) !== String(problem._id)) {
    throw ApiError.badRequest('Submission does not belong to this problem');
  }

  if (!opts.force) {
    const existing = await CodeReview.findOne({ submissionId }).lean();
    if (existing) return { review: codeReviewToJSON(existing), cached: true };
  }

  const prompt = codeReviewPrompt(
    {
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      tags: problem.tags ?? [],
    },
    submission.code,
    submission.language,
    submission.status,
    submission.passedCount ?? 0,
    submission.totalCount ?? 0
  );

  const raw = await geminiJSON<AiReviewShape>(prompt);
  const lineCount = submission.code.split('\n').length;
  const clean = sanitize(raw, lineCount);

  // upsert — `force` should overwrite
  const saved = await CodeReview.findOneAndUpdate(
    { submissionId },
    {
      $set: {
        userId: new Types.ObjectId(userId),
        problemId: problem._id,
        language: submission.language,
        model: 'gemini-2.5-flash',
        overall: clean.overall,
        score: clean.score,
        strengths: clean.strengths,
        weaknesses: clean.weaknesses,
        lineComments: clean.lineComments,
        resources: clean.resources,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { review: codeReviewToJSON(saved!), cached: false };
}

export async function getReviewIfExists(userId: string, submissionId: string) {
  if (!Types.ObjectId.isValid(submissionId)) return null;
  const r = await CodeReview.findOne({ submissionId, userId: new Types.ObjectId(userId) }).lean();
  return r ? codeReviewToJSON(r) : null;
}

export interface ReviewListItem {
  id: string;
  submissionId: string;
  score: number;
  language: string;
  createdAt: Date;
  severityCounts: {
    critical: number;
    warning: number;
    suggestion: number;
    info: number;
  };
  commentCount: number;
  problem: {
    slug: string;
    title: string;
    difficulty: string;
  } | null;
  submission: {
    status: string;
  } | null;
}

export async function listMyReviews(userId: string): Promise<ReviewListItem[]> {
  const userObjId = new Types.ObjectId(userId);
  const reviews = await CodeReview.find({ userId: userObjId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  if (reviews.length === 0) return [];

  const problemIds = Array.from(new Set(reviews.map((r) => String(r.problemId))));
  const submissionIds = Array.from(new Set(reviews.map((r) => String(r.submissionId))));

  const [problems, submissions] = await Promise.all([
    Problem.find({
      _id: { $in: problemIds.map((id) => new Types.ObjectId(id)) },
    })
      .select('slug title difficulty')
      .lean(),
    Submission.find({
      _id: { $in: submissionIds.map((id) => new Types.ObjectId(id)) },
    })
      .select('status')
      .lean(),
  ]);
  const problemById = new Map(problems.map((p: any) => [String(p._id), p]));
  const submissionById = new Map(submissions.map((s: any) => [String(s._id), s]));

  return reviews.map((r: any) => {
    const counts: ReviewSeverityCounts = { critical: 0, warning: 0, suggestion: 0, info: 0 };
    for (const c of r.lineComments ?? []) {
      if (c.severity in counts) counts[c.severity as keyof ReviewSeverityCounts]++;
    }
    const p = problemById.get(String(r.problemId));
    const s = submissionById.get(String(r.submissionId));
    return {
      id: String(r._id),
      submissionId: String(r.submissionId),
      score: r.score,
      language: r.language,
      createdAt: r.createdAt as Date,
      severityCounts: counts,
      commentCount: (r.lineComments ?? []).length,
      problem: p
        ? { slug: p.slug, title: p.title, difficulty: p.difficulty }
        : null,
      submission: s ? { status: s.status } : null,
    };
  });
}

export async function getReviewById(userId: string, reviewId: string) {
  if (!Types.ObjectId.isValid(reviewId)) return null;
  const r = await CodeReview.findOne({
    _id: new Types.ObjectId(reviewId),
    userId: new Types.ObjectId(userId),
  }).lean();
  return r ? codeReviewToJSON(r) : null;
}

export interface UnreviewedSubmission {
  submissionId: string;
  problem: { slug: string; title: string; difficulty: string };
  status: string;
  language: string;
  createdAt: Date;
}

/**
 * List the user's most recent unreviewed submission per problem (any status).
 * Used by the "Review all" batch flow on /reviews — keyed by latest-per-problem
 * so we don't enqueue 50 reviews of duplicate broken code on the same task.
 */
export async function listUnreviewedAccepted(userId: string): Promise<UnreviewedSubmission[]> {
  const userObjId = new Types.ObjectId(userId);
  const [allSubs, reviewed] = await Promise.all([
    Submission.find({ userId: userObjId })
      .select('problemId language status createdAt')
      .sort({ createdAt: -1 }) // newest first per user
      .lean(),
    CodeReview.find({ userId: userObjId }).select('submissionId').lean(),
  ]);
  if (allSubs.length === 0) return [];

  const reviewedIds = new Set(reviewed.map((r: any) => String(r.submissionId)));
  // Walk newest-first; first time we see a problem, take that submission.
  const seenProblems = new Set<string>();
  const unreviewed: typeof allSubs = [];
  for (const s of allSubs) {
    const pid = String(s.problemId);
    if (seenProblems.has(pid)) continue;
    seenProblems.add(pid);
    if (reviewedIds.has(String(s._id))) continue;
    unreviewed.push(s);
  }
  if (unreviewed.length === 0) return [];

  const problemIds = Array.from(new Set(unreviewed.map((s: any) => String(s.problemId))));
  const problems = await Problem.find({
    _id: { $in: problemIds.map((id) => new Types.ObjectId(id)) },
  })
    .select('slug title difficulty')
    .lean();
  const problemById = new Map(problems.map((p: any) => [String(p._id), p]));

  return unreviewed
    .map((s: any) => {
      const p = problemById.get(String(s.problemId));
      if (!p) return null;
      return {
        submissionId: String(s._id),
        problem: { slug: p.slug, title: p.title, difficulty: p.difficulty },
        status: s.status,
        language: s.language,
        createdAt: s.createdAt as Date,
      };
    })
    .filter((x): x is UnreviewedSubmission => x !== null);
}
