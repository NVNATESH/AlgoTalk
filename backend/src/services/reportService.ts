/**
 * reportService.ts
 *
 * Generates per-user and per-goal reports with learning analytics.
 */

import { Types } from 'mongoose';
import { Goal, goalToJSON } from '../models/Goal.js';
import { User, rankForXP } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { LearningContent } from '../models/LearningContent.js';
import { Badge } from '../models/Badge.js';
import { ApiError } from '../utils/ApiError.js';

export interface GoalReport {
  goalId: string;
  name: string;
  icon: string;
  progress: number;
  status: string;
  modulesCompleted: number;
  totalModules: number;
  hoursLogged: number;
  streak: number;
  quizScores: Array<{ moduleTitle: string; bestScore: number }>;
  weakTopics: string[];
  strongTopics: string[];
}

export async function getGoalReport(userId: string, goalId: string): Promise<GoalReport> {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  if (!goal) throw ApiError.notFound('Goal not found');

  const contents = await LearningContent.find({ userId, goalId }).lean();
  const contentsMap = new Map(contents.map(c => [c.moduleId, c]));

  const quizScores: Array<{ moduleTitle: string; bestScore: number }> = [];
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const m of goal.modules) {
    const content = contentsMap.get((m as any).moduleId);
    const bestPct = (content as any)?.bestPercentage ?? (m as any).quizScore ?? 0;
    quizScores.push({ moduleTitle: (m as any).title, bestScore: bestPct });

    for (const t of ((m as any).topics ?? []) as string[]) {
      if (bestPct >= 70) {
        if (!strongTopics.includes(t)) strongTopics.push(t);
      } else if (bestPct > 0 && bestPct < 50) {
        if (!weakTopics.includes(t)) weakTopics.push(t);
      }
    }
  }

  return {
    goalId: String(goal._id),
    name: goal.name,
    icon: goal.icon ?? '🎯',
    progress: goal.progress ?? 0,
    status: goal.status ?? 'active',
    modulesCompleted: goal.modules.filter((m: any) => m.status === 'completed').length,
    totalModules: goal.modules.length,
    hoursLogged: Math.round((goal.actualMinutes ?? 0) / 60 * 10) / 10,
    streak: goal.streak ?? 0,
    quizScores,
    weakTopics,
    strongTopics,
  };
}

export interface DashboardReport {
  user: {
    name: string;
    xp: number;
    rank: string;
    level: string;
  };
  summary: {
    activeGoals: number;
    completedGoals: number;
    totalHoursLogged: number;
    bestStreak: number;
    badgesEarned: number;
    problemsSolved: number;
  };
  topGoals: Array<{ name: string; icon: string; progress: number; goalType: string }>;
  upcomingDeadlines: Array<{ name: string; deadline: string; progress: number; daysLeft: number }>;
  weeklyProgress: {
    goalsWorkedOn: number;
    minutesThisWeek: number;
  };
}

export async function getDashboardReport(userId: string): Promise<DashboardReport> {
  const [user, goals, badgeCount, solvedCount] = await Promise.all([
    User.findById(userId).select('name xp level').lean(),
    Goal.find({ userId }).lean(),
    Badge.countDocuments({ userId }),
    Submission.distinct('problemId', { userId, status: 'accepted' }).then(ids => ids.length),
  ]);

  if (!user) throw ApiError.notFound('User not found');

  const u = user as any;
  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  const now = Date.now();
  const fourteenDays = now + 14 * 24 * 60 * 60 * 1000;

  const topGoals = active
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 6)
    .map(g => ({
      name: g.name,
      icon: g.icon ?? '🎯',
      progress: g.progress ?? 0,
      goalType: (g as any).goalType ?? 'custom',
    }));

  const upcomingDeadlines = active
    .filter(g => g.deadline && new Date(g.deadline).getTime() <= fourteenDays)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
    .map(g => ({
      name: g.name,
      deadline: new Date(g.deadline).toISOString(),
      progress: g.progress ?? 0,
      daysLeft: Math.ceil((new Date(g.deadline).getTime() - now) / (24 * 60 * 60 * 1000)),
    }));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const goalsWorkedOn = active.filter(
    g => g.lastActivityAt && new Date(g.lastActivityAt).getTime() >= weekAgo
  ).length;

  return {
    user: {
      name: u.name,
      xp: u.xp ?? 0,
      rank: rankForXP(u.xp ?? 0),
      level: u.level ?? 'Beginner',
    },
    summary: {
      activeGoals: active.length,
      completedGoals: completed.length,
      totalHoursLogged: Math.round(goals.reduce((s, g) => s + (g.actualMinutes ?? 0), 0) / 60 * 10) / 10,
      bestStreak: goals.reduce((m, g) => Math.max(m, g.streak ?? 0), 0),
      badgesEarned: badgeCount,
      problemsSolved: solvedCount,
    },
    topGoals,
    upcomingDeadlines,
    weeklyProgress: {
      goalsWorkedOn,
      minutesThisWeek: active
        .filter(g => g.lastActivityAt && new Date(g.lastActivityAt).getTime() >= weekAgo)
        .reduce((s, g) => s + (g.actualMinutes ?? 0), 0),
    },
  };
}
