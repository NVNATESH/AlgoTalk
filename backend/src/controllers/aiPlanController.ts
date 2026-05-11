import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { Goal, goalToJSON } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';
import { emitNotification } from '../services/notificationService.js';

/**
 * POST /api/goals/from-ai-plan
 *
 * Create a goal from an AI-generated learning plan.
 * Accepts a structured plan object and turns it into a trackable goal.
 */
export async function createFromAIPlan(req: Request, res: Response) {
  const userId = (req as any).userId;
  if (!userId) throw ApiError.unauthorized();

  const {
    name,
    description = '',
    modules = [],
    resources = [],
    estimatedHours = 10,
    difficulty = 'Intermediate',
    category = 'other',
    sourcePrompt = '',
    deadlineDays = 30,
    weeklyHours = 8,
  } = req.body;

  if (!name || typeof name !== 'string' || name.length < 2) {
    throw ApiError.badRequest('Plan name is required (min 2 chars)');
  }

  const startDate = new Date();
  const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
  const perModuleDays = deadlineDays / Math.max(modules.length, 1);

  const goal = await Goal.create({
    userId,
    name: name.slice(0, 120),
    icon: '🤖',
    description: (description ?? '').slice(0, 2000),
    topic: name,
    difficulty,
    priority: 'P1',
    goalType: 'ai_generated',
    category,
    aiPlanSource: 'gemini',
    sourcePrompt: (sourcePrompt ?? '').slice(0, 2000),
    resources: (resources ?? []).slice(0, 20).map((r: any) => ({
      title: (r.title ?? 'Resource').slice(0, 200),
      url: (r.url ?? '').slice(0, 500),
      type: r.type ?? 'docs',
    })),
    xpReward: Math.min(500, Math.max(50, modules.length * 30)),
    isPublic: false,
    weeklyHours,
    estimatedHours,
    startDate,
    deadline,
    modules: (modules ?? []).slice(0, 30).map((m: any, i: number) => ({
      moduleId: crypto.randomUUID(),
      title: (m.title ?? `Module ${i + 1}`).slice(0, 200),
      description: (m.description ?? '').slice(0, 1000),
      topics: (m.topics ?? []).slice(0, 10).map((t: string) => String(t).slice(0, 50)),
      difficulty: m.difficulty ?? 'Medium',
      status: 'not_started',
      estimatedHours: Math.min(50, Math.max(0.5, m.estimatedHours ?? 1)),
      actualMinutes: 0,
      quizScore: null,
      problemsSolved: 0,
      completedAt: null,
      dueDate: new Date(Date.now() + Math.round(perModuleDays * (i + 1)) * 24 * 60 * 60 * 1000),
    })),
    rationale: `AI-generated learning plan`,
  });

  // Emit notification
  void emitNotification({
    userId,
    type: 'ai_plan_ready',
    title: '🤖 AI plan added to your goals!',
    message: `"${name}" is now tracked on your dashboard.`,
    icon: '🤖',
    link: `/goals/${String(goal._id)}`,
    priority: 'medium',
  });

  res.status(201).json({ goal: goalToJSON(goal.toObject()) });
}
