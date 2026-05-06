import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/problemService.js';
import * as reviewSvc from '../services/codeReviewService.js';
import { estimateProblemRatings } from '../services/ratingEstimatorService.js';

const langSchema = z.enum(['python', 'javascript', 'java', 'cpp']);

const arrayQ = (v: unknown): string[] | undefined => {
  if (typeof v !== 'string') return undefined;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
};

export const list = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const difficulty = arrayQ(req.query.difficulty)?.filter((d) =>
    ['Easy', 'Medium', 'Hard'].includes(d)
  ) as ('Easy' | 'Medium' | 'Hard')[] | undefined;
  const tags = arrayQ(req.query.tags);
  const companies = arrayQ(req.query.companies);
  const status = typeof req.query.status === 'string'
    ? (req.query.status as 'solved' | 'attempted' | 'unsolved')
    : undefined;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  const out = await svc.listProblems({
    search,
    difficulty,
    tags,
    companies,
    status,
    page,
    limit,
    userId: req.userId,
  });
  res.json(out);
});

export const companies = asyncHandler(async (_req, res) => {
  const list = await svc.listCompanies();
  res.json({ companies: list });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const problem = await svc.getProblemBySlug(req.params.slug, req.userId);
  res.json({ problem });
});

export const runSchema = z.object({
  language: langSchema,
  code: z.string().min(1).max(100_000),
  customStdin: z.string().max(20_000).optional(),
});

export const run = asyncHandler(async (req, res) => {
  const result = await svc.runVisibleTests(
    req.params.slug,
    req.body.language,
    req.body.code,
    req.body.customStdin
  );
  res.json({ result });
});

export const submitSchema = z.object({
  language: langSchema,
  code: z.string().min(1).max(100_000),
});

export const submit = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await svc.submit(req.userId, req.params.slug, req.body.language, req.body.code);
  res.json(out);
});

export const submissions = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const list = await svc.listSubmissions(req.userId, req.params.slug);
  res.json({ submissions: list });
});

export const reviewSchema = z.object({ force: z.boolean().optional() });

export const generateReview = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const { force } = req.body ?? {};
  const out = await reviewSvc.getOrGenerateReview(
    req.userId,
    req.params.slug,
    req.params.submissionId,
    { force: !!force }
  );
  res.json(out);
});

export const getReview = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const review = await reviewSvc.getReviewIfExists(req.userId, req.params.submissionId);
  res.json({ review });
});

export const estimateRatingsSchema = z.object({
  force: z.boolean().optional(),
});

export const estimateRatings = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  // Admin-only — only role=admin users can trigger the sweep.
  if (req.userRole !== 'admin') {
    throw ApiError.forbidden('Admin only');
  }
  const result = await estimateProblemRatings({ force: !!req.body?.force });
  res.json(result);
});
