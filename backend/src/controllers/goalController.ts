import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as goalSvc from '../services/goalService.js';
import { getBurnoutStatus } from '../services/burnoutService.js';
import { Problem, problemSummary } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { Goal } from '../models/Goal.js';

const difficultyEnum = z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']);
const priorityEnum = z.enum(['P0', 'P1', 'P2']);

export const createGoalSchema = z.object({
  topic: z.string().min(2).max(120),
  difficulty: difficultyEnum.default('Intermediate'),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  deadlineDays: z.number().int().min(3).max(365).optional(),
  priority: priorityEnum.optional(),
  notes: z.string().max(500).optional(),
  generateFromProfile: z.boolean().optional(),
});

export const previewSchema = z.object({
  topic: z.string().min(2).max(120),
  difficulty: difficultyEnum.default('Intermediate'),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  deadlineDays: z.number().int().min(3).max(365).optional(),
  notes: z.string().max(500).optional(),
});

export const moduleStatusSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

export const pauseSchema = z.object({ paused: z.boolean() });

export const updateDatesSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
  })
  .refine((d) => d.startDate || d.deadline, {
    message: 'Provide startDate and/or deadline',
  });

export const updateDates = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.updateGoalDates(req.userId, req.params.id, {
    startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
    deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
  });
  res.json({ goal });
});

export const burnoutStatus = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const status = await getBurnoutStatus(req.userId);
  res.json(status);
});

export const logTimeSchema = z.object({
  minutes: z.number().int().min(1).max(240),
  moduleId: z.string().min(1).optional(),
});

export const list = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const goals = await goalSvc.listGoals(req.userId, { status });
  res.json({ goals });
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.getGoal(req.userId, req.params.id);
  res.json({ goal });
});

export const create = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.createGoal(req.userId, req.body);
  res.status(201).json({ goal });
});

export const preview = asyncHandler(async (req, res) => {
  const roadmap = await goalSvc.previewRoadmap(req.body);
  res.json({ roadmap });
});

export const focus = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.setFocus(req.userId, req.params.id);
  res.json({ goal });
});

export const unfocus = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.clearFocus(req.userId, req.params.id);
  res.json({ goal });
});

export const updateModule = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.updateModuleStatus(
    req.userId,
    req.params.id,
    req.params.moduleId,
    req.body.status
  );
  res.json({ goal });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await goalSvc.deleteGoal(req.userId, req.params.id);
  res.status(204).end();
});

export const archive = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.archiveGoal(req.userId, req.params.id);
  res.json({ goal });
});

export const pause = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.pauseGoal(req.userId, req.params.id, req.body.paused);
  res.json({ goal });
});

export const logTime = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.logFocusTime(
    req.userId,
    req.params.id,
    req.body.moduleId ?? null,
    req.body.minutes
  );
  res.json({ goal });
});

/** GET /goals/:id/modules/:moduleId/problems — list problems with solve status */
export const moduleProblems = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const goal = await goalSvc.getGoal(req.userId, req.params.id);
  const mod = goal.modules.find((m: any) => m.moduleId === req.params.moduleId);
  if (!mod) throw ApiError.notFound('Module not found');

  const slugs = (mod as any).problemSlugs as string[] ?? [];
  if (slugs.length === 0) {
    res.json({ problems: [], solved: 0, total: 0 });
    return;
  }

  const problems = await Problem.find({ slug: { $in: slugs } }).lean();

  // Get user's accepted problem IDs
  const problemIds = problems.map((p) => p._id);
  const acceptedIds = await Submission.distinct('problemId', {
    userId: req.userId,
    problemId: { $in: problemIds },
    status: 'accepted',
  });
  const acceptedSet = new Set(acceptedIds.map(String));

  const result = problems.map((p) => ({
    ...problemSummary(p),
    solved: acceptedSet.has(String(p._id)),
  }));

  // Sort to match the order in problemSlugs
  const slugOrder = new Map(slugs.map((s, i) => [s, i]));
  result.sort((a, b) => (slugOrder.get(a.slug) ?? 99) - (slugOrder.get(b.slug) ?? 99));

  res.json({
    problems: result,
    solved: result.filter((r) => r.solved).length,
    total: result.length,
  });
});

