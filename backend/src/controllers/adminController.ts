import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/adminService.js';
import { InterviewQuestion, IQ_CATEGORIES, iqToJSON } from '../models/InterviewQuestion.js';

const ctxFromReq = (req: any) => ({
  actorId: req.userId as string,
  actorRole: req.userRole as 'user' | 'moderator' | 'admin' | undefined,
  ip: (req.ip as string) ?? '',
});

export const overview = asyncHandler(async (_req, res) => {
  const data = await svc.adminAnalytics();
  res.json(data);
});

export const listProblems = asyncHandler(async (req, res) => {
  const out = await svc.listProblemsAdmin({
    search: req.query.search as string | undefined,
    difficulty: req.query.difficulty as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(out);
});

export const getProblem = asyncHandler(async (req, res) => {
  const out = await svc.getProblemAdmin(req.params.slug);
  res.json({ problem: out });
});

const exampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});
const testCaseSchema = z.object({
  stdin: z.string(),
  expectedStdout: z.string(),
  isHidden: z.boolean().optional(),
});

export const createProblemSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  title: z.string().min(2).max(200),
  description: z.string().min(1),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  tags: z.array(z.string().max(40)).max(20).optional(),
  companyTags: z.array(z.string().max(40)).max(20).optional(),
  inputFormat: z.string().max(2000).optional(),
  outputFormat: z.string().max(2000).optional(),
  constraints: z.string().max(2000).optional(),
  examples: z.array(exampleSchema).max(20).optional(),
  testCases: z.array(testCaseSchema).max(200).optional(),
  starterCode: z
    .object({
      python: z.string().max(20_000).optional(),
      javascript: z.string().max(20_000).optional(),
      java: z.string().max(20_000).optional(),
      cpp: z.string().max(20_000).optional(),
    })
    .optional(),
  timeLimitMs: z.number().int().min(100).max(30_000).optional(),
  memoryLimitKb: z.number().int().min(1024).max(2_000_000).optional(),
});

export const createProblem = asyncHandler(async (req, res) => {
  const out = await svc.createProblemAdmin(ctxFromReq(req), req.body);
  res.status(201).json({ problem: out });
});

export const updateProblemSchema = createProblemSchema.partial().omit({ slug: true });

export const updateProblem = asyncHandler(async (req, res) => {
  const out = await svc.updateProblemAdmin(ctxFromReq(req), req.params.slug, req.body);
  res.json({ problem: out });
});

export const deleteProblem = asyncHandler(async (req, res) => {
  await svc.deleteProblemAdmin(ctxFromReq(req), req.params.slug);
  res.status(204).end();
});

export const bulkImportSchema = z.object({
  problems: z.array(createProblemSchema).min(1).max(500),
});
export const bulkImport = asyncHandler(async (req, res) => {
  const out = await svc.bulkImportProblemsAdmin(ctxFromReq(req), req.body.problems);
  res.json(out);
});

// Recommended goal template management
const goalResourceSchema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().url(),
  type: z.enum(['youtube', 'docs', 'blog', 'github', 'practice', 'cheatsheet', 'pdf', 'article']),
});

export const createRecommendedGoalSchema = z
  .object({
    name: z.string().min(2).max(120),
    icon: z.string().max(20).default('🎯'),
    description: z.string().max(2000).default(''),
    topic: z.string().min(1).max(160),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']).default('Intermediate'),
    priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
    goalType: z.enum(['custom', 'recommended', 'company_prep', 'quest', 'ai_generated']).default('recommended'),
    category: z
      .enum(['dsa', 'system_design', 'sql', 'dbms', 'fullstack', 'ai_ml', 'aptitude', 'company', 'other'])
      .default('other'),
    companyTarget: z.string().max(80).nullable().optional(),
    roleTarget: z.string().max(80).nullable().optional(),
    questOrder: z.number().int().min(0).default(0),
    isLocked: z.boolean().default(false),
    resources: z.array(goalResourceSchema).max(40).default([]),
    xpReward: z.number().int().min(0).max(10000).default(100),
    badgeKey: z.string().max(80).nullable().optional(),
    estimatedHours: z.number().min(0).max(2000).default(0),
    modules: z
      .array(
        z.object({
          title: z.string().min(2).max(160),
          description: z.string().max(2000).default(''),
          topics: z.array(z.string().min(1).max(80)).max(30).default([]),
          difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
          estimatedHours: z.number().min(0.25).max(200).default(1),
        })
      )
      .max(50)
      .default([]),
  })
  .strict();

export const updateRecommendedGoalSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    icon: z.string().max(20).optional(),
    description: z.string().max(2000).optional(),
    topic: z.string().min(1).max(160).optional(),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']).optional(),
    priority: z.enum(['P0', 'P1', 'P2']).optional(),
    goalType: z.enum(['custom', 'recommended', 'company_prep', 'quest', 'ai_generated']).optional(),
    category: z
      .enum(['dsa', 'system_design', 'sql', 'dbms', 'fullstack', 'ai_ml', 'aptitude', 'company', 'other'])
      .optional(),
    companyTarget: z.string().max(80).nullable().optional(),
    roleTarget: z.string().max(80).nullable().optional(),
    questOrder: z.number().int().min(0).optional(),
    isLocked: z.boolean().optional(),
    resources: z.array(goalResourceSchema).max(40).optional(),
    xpReward: z.number().int().min(0).max(10000).optional(),
    badgeKey: z.string().max(80).nullable().optional(),
    estimatedHours: z.number().min(0).max(2000).optional(),
  })
  .strict();

export const goalModuleSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  topics: z.array(z.string().min(1).max(80)).max(30).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  estimatedHours: z.number().min(0.25).max(200).optional(),
  recalculateEstimatedHours: z.boolean().optional(),
});

export const updateGoalModuleSchema = goalModuleSchema.partial().extend({
  recalculateEstimatedHours: z.boolean().optional(),
});

export const addGoalTopicSchema = z.object({
  topic: z.string().min(1).max(80),
});

export const listRecommendedGoalTemplates = asyncHandler(async (req, res) => {
  const out = await svc.listRecommendedGoalTemplatesAdmin({
    search: req.query.search as string | undefined,
    goalType: req.query.goalType as string | undefined,
    category: req.query.category as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(out);
});

export const getRecommendedGoalTemplate = asyncHandler(async (req, res) => {
  const goal = await svc.getRecommendedGoalTemplateAdmin(req.params.goalId);
  res.json({ goal });
});

export const updateRecommendedGoalTemplate = asyncHandler(async (req, res) => {
  const goal = await svc.updateRecommendedGoalTemplateAdmin(ctxFromReq(req), req.params.goalId, req.body);
  res.json({ goal });
});

export const addRecommendedGoalModule = asyncHandler(async (req, res) => {
  const goal = await svc.addRecommendedGoalModuleAdmin(ctxFromReq(req), req.params.goalId, req.body);
  res.status(201).json({ goal });
});

export const updateRecommendedGoalModule = asyncHandler(async (req, res) => {
  const goal = await svc.updateRecommendedGoalModuleAdmin(
    ctxFromReq(req),
    req.params.goalId,
    req.params.moduleId,
    req.body
  );
  res.json({ goal });
});

export const addRecommendedGoalModuleTopic = asyncHandler(async (req, res) => {
  const goal = await svc.addRecommendedGoalModuleTopicAdmin(
    ctxFromReq(req),
    req.params.goalId,
    req.params.moduleId,
    req.body.topic
  );
  res.status(201).json({ goal });
});

export const createRecommendedGoalTemplate = asyncHandler(async (req, res) => {
  const goal = await svc.createRecommendedGoalTemplateAdmin(ctxFromReq(req), req.body);
  res.status(201).json({ goal });
});

export const deleteRecommendedGoalTemplate = asyncHandler(async (req, res) => {
  await svc.deleteRecommendedGoalTemplateAdmin(ctxFromReq(req), req.params.goalId);
  res.status(204).end();
});

export const setRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});
export const setUserRole = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  if (req.params.userId === req.userId && req.body.role !== 'admin') {
    throw ApiError.badRequest("Refusing to demote yourself — ask another admin");
  }
  const out = await svc.setUserRoleAdmin(ctxFromReq(req), req.params.userId, req.body.role);
  res.json({ user: out });
});

export const auditLog = asyncHandler(async (req, res) => {
  const out = await svc.listAuditLog({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    action: req.query.action as string | undefined,
  });
  res.json(out);
});

export const addModuleProblemSlugSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const addModuleProblemSlug = asyncHandler(async (req, res) => {
  const goal = await svc.addModuleProblemSlugAdmin(
    ctxFromReq(req),
    req.params.goalId,
    req.params.moduleId,
    req.body.slug
  );
  res.status(201).json({ goal });
});

export const removeModuleProblemSlug = asyncHandler(async (req, res) => {
  const goal = await svc.removeModuleProblemSlugAdmin(
    ctxFromReq(req),
    req.params.goalId,
    req.params.moduleId,
    req.params.slug
  );
  res.json({ goal });
});

export const deleteRecommendedGoalModule = asyncHandler(async (req, res) => {
  const goal = await svc.deleteRecommendedGoalModuleAdmin(
    ctxFromReq(req),
    req.params.goalId,
    req.params.moduleId
  );
  res.json({ goal });
});

/* ═══════════════════════ Interview Question Bank ═══════════════════════ */

const iqExampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().optional(),
  explanation: z.string().optional(),
});

const platformLinkSchema = z.object({
  platform: z.string().min(1).max(60),
  url: z.string().url(),
  problemId: z.string().max(80).optional(),
});

export const createIQSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(1),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  category: z.enum(IQ_CATEGORIES),
  topic: z.string().min(1).max(100),
  tags: z.array(z.string().max(40)).max(20).optional(),
  companies: z.array(z.string().max(60)).max(30).optional(),
  platforms: z.array(z.string().max(60)).max(10).optional(),
  platformLinks: z.array(platformLinkSchema).max(10).optional(),
  constraints: z.string().max(2000).optional(),
  examples: z.array(iqExampleSchema).max(10).optional(),
  hints: z.array(z.string().max(500)).max(10).optional(),
  solution: z.string().max(10_000).optional(),
  expectedComplexity: z.object({ time: z.string().max(50), space: z.string().max(50) }).optional(),
  frequency: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const updateIQSchema = createIQSchema.partial();

export const bulkImportIQSchema = z.object({
  questions: z.array(createIQSchema).min(1).max(500),
});

export const listInterviewQuestions = asyncHandler(async (req, res) => {
  const { search, category, difficulty, company, topic, page = '1', limit = '50' } = req.query as Record<string, string>;
  const filter: Record<string, any> = { isActive: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (company) filter.companies = { $in: [new RegExp(company, 'i')] };
  if (topic) filter.topic = new RegExp(topic, 'i');
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [questions, total] = await Promise.all([
    InterviewQuestion.find(filter).sort({ frequency: -1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    InterviewQuestion.countDocuments(filter),
  ]);
  res.json({ questions: questions.map(iqToJSON), total, page: Number(page) });
});

export const getInterviewQuestion = asyncHandler(async (req, res) => {
  const q = await InterviewQuestion.findById(req.params.id).lean();
  if (!q) throw ApiError.notFound('Interview question not found');
  res.json({ question: iqToJSON(q) });
});

export const createInterviewQuestion = asyncHandler(async (req, res) => {
  const q = await InterviewQuestion.create(req.body);
  res.status(201).json({ question: iqToJSON(q.toObject()) });
});

export const updateInterviewQuestion = asyncHandler(async (req, res) => {
  const q = await InterviewQuestion.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).lean();
  if (!q) throw ApiError.notFound('Interview question not found');
  res.json({ question: iqToJSON(q) });
});

export const deleteInterviewQuestion = asyncHandler(async (req, res) => {
  await InterviewQuestion.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export const bulkImportInterviewQuestions = asyncHandler(async (req, res) => {
  const items: any[] = req.body.questions;
  const ops = items.map((q) => ({
    updateOne: {
      filter: { title: q.title, category: q.category },
      update: { $set: { ...q, isActive: q.isActive ?? true } },
      upsert: true,
    },
  }));
  const result = await InterviewQuestion.bulkWrite(ops as any, { ordered: false });
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
});
