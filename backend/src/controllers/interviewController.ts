import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/interviewService.js';
import {
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_ROLES,
} from '../models/InterviewSession.js';
import { InterviewQuestion, iqToJSON } from '../models/InterviewQuestion.js';

/* ── Admin-curated Question Bank (user-facing read endpoints) ── */
export const listQuestions = asyncHandler(async (req, res) => {
  const { category, difficulty, company, topic, search, page = '1', limit = '50' } = req.query as Record<string, string>;
  const filter: Record<string, any> = { isActive: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (company) filter.companies = { $in: [new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')] };
  if (topic) filter.topic = new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [questions, total] = await Promise.all([
    InterviewQuestion.find(filter).sort({ frequency: -1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    InterviewQuestion.countDocuments(filter),
  ]);
  res.json({ questions: questions.map(iqToJSON), total, page: Number(page) });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const q = await InterviewQuestion.findById(req.params.id).lean();
  if (!q || !q.isActive) throw ApiError.notFound('Interview question not found');
  res.json({ question: iqToJSON(q) });
});

const INTERVIEW_MODES = [
  'dsa',
  'system_design',
  'sql',
  'frontend',
  'backend',
  'fullstack',
  'behavioral',
  'cs_fundamentals',
] as const;

export const startSchema = z
  .object({
    topic: z.string().min(2).max(160).optional(),
    topics: z.array(z.string().min(1).max(40)).max(6).optional(),
    difficulty: z.enum(INTERVIEW_DIFFICULTIES),
    role: z.enum(INTERVIEW_ROLES).optional(),
    notes: z.string().max(500).optional(),
    mode: z.enum(INTERVIEW_MODES).optional(),
    company: z.string().max(60).optional(),
  })
  .refine(
    (v) => !!v.topic || (v.topics && v.topics.length > 0),
    'Provide at least one topic'
  );

export const start = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const body = req.body as {
    topic?: string;
    topics?: string[];
    difficulty: typeof INTERVIEW_DIFFICULTIES[number];
    role?: typeof INTERVIEW_ROLES[number];
    notes?: string;
    mode?: typeof INTERVIEW_MODES[number];
    company?: string;
  };
  const topic = body.topic ?? (body.topics ?? []).join(' + ');
  const session = await svc.startSession(req.userId, {
    topic,
    topics: body.topics,
    difficulty: body.difficulty,
    role: body.role,
    notes: body.notes,
    mode: body.mode,
    company: body.company,
  });
  res.status(201).json({ session });
});

export const list = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const sessions = await svc.listSessions(req.userId);
  res.json({ sessions });
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.getSession(req.userId, req.params.id);
  res.json({ session });
});

export const saveCodeSchema = z.object({
  code: z.string().max(50_000),
  language: z.string().min(1).max(20),
});

export const saveCode = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.saveCode(
    req.userId,
    req.params.id,
    req.body.code,
    req.body.language
  );
  res.json({ session });
});

export const approachSchema = z.object({
  transcript: z.string().min(5).max(8000),
});

export const approach = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.submitApproach(req.userId, req.params.id, req.body.transcript);
  res.json({ session });
});

export const submitSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.string().min(1).max(20),
});

export const submit = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.submitCode(
    req.userId,
    req.params.id,
    req.body.code,
    req.body.language
  );
  res.json({ session });
});

export const followUpSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const followUp = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.followUp(req.userId, req.params.id, req.body.message);
  res.json({ session });
});

export const endSession = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.endSession(req.userId, req.params.id);
  res.json({ session });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.deleteSession(req.userId, req.params.id);
  res.status(204).end();
});

/* ── Add Interview Questions to Learning Path (create a Quest goal) ── */
export const addToLearningPathSchema = z.object({
  questionIds: z.array(z.string()).min(1).max(50),
  deadlineDays: z.number().int().min(3).max(365).default(30),
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
});

export const addToLearningPath = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const { questionIds, deadlineDays, priority } = req.body as {
    questionIds: string[];
    deadlineDays: number;
    priority: 'P0' | 'P1' | 'P2';
  };

  const questions = await InterviewQuestion.find({
    _id: { $in: questionIds },
    isActive: true,
  }).lean();

  if (questions.length === 0) {
    throw ApiError.notFound('No valid interview questions found');
  }

  // Group questions by category/topic to form modules
  const grouped = new Map<string, typeof questions>();
  for (const q of questions) {
    const key = q.category || 'general';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(q);
  }

  const crypto = await import('node:crypto');
  const { Goal, goalToJSON } = await import('../models/Goal.js');

  const perModuleDays = deadlineDays / Math.max(grouped.size, 1);
  const modules = Array.from(grouped.entries()).map(([category, qs], i) => ({
    moduleId: crypto.randomUUID(),
    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Questions`,
    description: `${qs.length} interview question${qs.length > 1 ? 's' : ''} on ${category}`,
    topics: [...new Set(qs.map(q => q.topic).filter(Boolean))],
    difficulty: qs[0]?.difficulty ?? 'Medium',
    status: 'not_started' as const,
    estimatedHours: qs.length * 1.5,
    actualMinutes: 0,
    quizScore: null,
    problemSlugs: qs.flatMap(q => (q as any).platformLinks?.map((l: any) => l.slug) ?? []),
    problemsSolved: 0,
    completedAt: null,
    dueDate: new Date(Date.now() + Math.round(perModuleDays * (i + 1)) * 24 * 60 * 60 * 1000),
  }));

  const topCategories = [...grouped.keys()].slice(0, 3).join(', ');

  const goal = await Goal.create({
    userId: req.userId,
    name: `Interview Prep: ${topCategories}`,
    icon: '🎯',
    description: `Practice ${questions.length} curated interview questions across ${grouped.size} categories`,
    topic: topCategories,
    difficulty: 'Intermediate',
    priority,
    goalType: 'quest',
    category: 'interview_prep',
    isPublic: false,
    weeklyHours: 8,
    estimatedHours: modules.reduce((s, m) => s + m.estimatedHours, 0),
    startDate: new Date(),
    deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000),
    modules,
    rationale: `Created from ${questions.length} interview questions added to learning path`,
  });

  res.status(201).json({ goal: goalToJSON(goal.toObject()) });
});
