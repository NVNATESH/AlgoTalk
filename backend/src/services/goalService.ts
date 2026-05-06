import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Goal, goalToJSON } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON } from './gemini.js';
import {
  roadmapPrompt,
  type GeneratedRoadmap,
  type RoadmapInput,
} from '../prompts/learning.js';
import { emitNotification } from './notificationService.js';

export async function listGoals(userId: string, opts: { status?: string } = {}) {
  const filter: Record<string, unknown> = { userId };
  if (opts.status) filter.status = opts.status;
  const goals = await Goal.find(filter).sort({ isFocus: -1, priority: 1, deadline: 1 }).lean();
  return goals.map(goalToJSON);
}

export async function getGoal(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

interface CreateGoalInput {
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  weeklyHours?: number;
  deadlineDays?: number;
  priority?: 'P0' | 'P1' | 'P2';
  notes?: string;
  customRoadmap?: GeneratedRoadmap;
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  const roadmap = input.customRoadmap ?? (await generateRoadmap(input));

  const startDate = new Date();
  const deadline = new Date(Date.now() + (input.deadlineDays ?? 30) * 24 * 60 * 60 * 1000);

  const totalEstimated = roadmap.modules.reduce((sum, m) => sum + (m.estimatedHours || 0), 0);
  const perModuleDays = (input.deadlineDays ?? 30) / Math.max(roadmap.modules.length, 1);

  const modules = roadmap.modules.map((m, i) => ({
    moduleId: crypto.randomUUID(),
    title: m.title,
    description: m.description,
    topics: m.topics ?? [],
    difficulty: m.difficulty ?? 'Medium',
    status: 'not_started' as const,
    estimatedHours: m.estimatedHours,
    actualMinutes: 0,
    quizScore: null,
    problemsSolved: 0,
    completedAt: null,
    dueDate: new Date(Date.now() + Math.round(perModuleDays * (i + 1)) * 24 * 60 * 60 * 1000),
  }));

  const goal = await Goal.create({
    userId,
    name: roadmap.name,
    icon: roadmap.icon,
    description: roadmap.description,
    topic: input.topic,
    difficulty: input.difficulty,
    priority: input.priority ?? 'P1',
    weeklyHours: input.weeklyHours ?? 8,
    estimatedHours: roadmap.estimatedHours || totalEstimated,
    startDate,
    deadline,
    modules,
    rationale: roadmap.rationale,
  });

  return goalToJSON(goal.toObject());
}

export async function previewRoadmap(input: RoadmapInput) {
  return generateRoadmap(input);
}

async function generateRoadmap(input: RoadmapInput) {
  const prompt = roadmapPrompt(input);
  const roadmap = await geminiJSON<GeneratedRoadmap>(prompt);

  if (!roadmap?.modules?.length) {
    throw ApiError.badRequest('AI returned an invalid roadmap — try a more specific topic');
  }
  // hard cap modules
  if (roadmap.modules.length > 12) roadmap.modules = roadmap.modules.slice(0, 12);
  return roadmap;
}

export async function setFocus(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  // exclusive: only one goal in focus per user
  await Goal.updateMany({ userId, isFocus: true }, { $set: { isFocus: false } });
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    { $set: { isFocus: true } },
    { new: true }
  ).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

export async function clearFocus(userId: string, goalId: string) {
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    { $set: { isFocus: false } },
    { new: true }
  ).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

export async function updateModuleStatus(
  userId: string,
  goalId: string,
  moduleId: string,
  status: 'not_started' | 'in_progress' | 'completed'
) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw ApiError.notFound('Goal not found');

  const mod = goal.modules.find((m: any) => m.moduleId === moduleId);
  if (!mod) throw ApiError.notFound('Module not found');

  const wasCompleted = mod.status === 'completed';
  mod.status = status;
  if (status === 'completed') {
    mod.completedAt = new Date();
  } else {
    mod.completedAt = null;
  }

  // recompute progress
  const total = goal.modules.length;
  const done = goal.modules.filter((m: any) => m.status === 'completed').length;
  goal.progress = total === 0 ? 0 : Math.round((done / total) * 100);

  let goalJustCompleted = false;
  if (goal.progress === 100 && goal.status === 'active') {
    goal.status = 'completed';
    goal.completedAt = new Date();
    goal.isFocus = false;
    goalJustCompleted = true;
  }

  goal.lastActivityAt = new Date();
  await goal.save();

  // Notifications (fire-and-forget)
  if (status === 'completed' && !wasCompleted) {
    void emitNotification({
      userId,
      type: 'goal_module_completed',
      title: `Module complete: ${mod.title}`,
      message: `${done} / ${total} modules done in "${goal.name}"`,
      icon: '✅',
      link: `/goals/${goal._id}`,
      priority: 'low',
      metadata: { goalId: String(goal._id), moduleId: mod.moduleId },
    });
  }
  if (goalJustCompleted) {
    void emitNotification({
      userId,
      type: 'goal_completed',
      title: `🎉 Goal completed: ${goal.name}`,
      message: `You finished all ${total} modules. Onwards.`,
      icon: '🎯',
      link: `/goals/${goal._id}`,
      priority: 'high',
      metadata: { goalId: String(goal._id) },
    });
  }

  return goalToJSON(goal.toObject());
}

export async function deleteGoal(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const res = await Goal.findOneAndDelete({ _id: goalId, userId });
  if (!res) throw ApiError.notFound('Goal not found');
}

export async function archiveGoal(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    { $set: { status: 'archived', isFocus: false } },
    { new: true }
  ).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

export async function updateGoalDates(
  userId: string,
  goalId: string,
  input: { startDate?: Date; deadline?: Date }
) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const set: Record<string, unknown> = {};
  if (input.startDate) set.startDate = input.startDate;
  if (input.deadline) set.deadline = input.deadline;
  if (input.startDate && input.deadline && input.startDate >= input.deadline) {
    throw ApiError.badRequest('Start date must be before deadline');
  }
  if (Object.keys(set).length === 0) {
    throw ApiError.badRequest('Provide startDate and/or deadline');
  }
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    { $set: set },
    { new: true }
  ).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

export async function pauseGoal(userId: string, goalId: string, paused: boolean) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    { $set: { status: paused ? 'paused' : 'active', ...(paused ? { isFocus: false } : {}) } },
    { new: true }
  ).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goalToJSON(goal);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPreviousDay(prev: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(prev, yesterday);
}

export async function logFocusTime(
  userId: string,
  goalId: string,
  moduleId: string | null,
  minutes: number
) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
    throw ApiError.badRequest('Invalid minutes (1-240)');
  }
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw ApiError.notFound('Goal not found');

  if (moduleId) {
    const mod = goal.modules.find((m: any) => m.moduleId === moduleId);
    if (!mod) throw ApiError.notFound('Module not found');
    mod.actualMinutes = (mod.actualMinutes ?? 0) + minutes;
  }

  goal.actualMinutes = (goal.actualMinutes ?? 0) + minutes;

  // Bump per-day roll-up for burnout detection.
  void (async () => {
    const { DailyFocus } = await import('../models/DailyFocus.js');
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    await DailyFocus.updateOne(
      { userId, date: ymd },
      { $inc: { minutes }, $setOnInsert: { userId, date: ymd } },
      { upsert: true }
    ).catch(() => undefined);
  })();

  // streak: bump on first activity of the day, reset if a day was skipped
  const now = new Date();
  const last = goal.lastActivityAt ? new Date(goal.lastActivityAt) : null;
  const currentStreak = goal.streak ?? 0;
  if (!last) {
    goal.streak = 1;
  } else if (isSameDay(last, now)) {
    if (currentStreak === 0) goal.streak = 1; // initialize if never tracked
  } else if (isPreviousDay(last, now)) {
    goal.streak = currentStreak + 1;
  } else {
    goal.streak = 1;
  }
  goal.lastActivityAt = now;

  await goal.save();
  return goalToJSON(goal.toObject());
}
