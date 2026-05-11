/**
 * dailyMissionService.ts
 *
 * Generates and tracks daily missions for gamification.
 * Each user gets 3 missions per day based on their active goals.
 */

import { DailyMission, dailyMissionToJSON } from '../models/DailyMission.js';
import { Goal } from '../models/Goal.js';
import { User, rankForXP } from '../models/User.js';
import { logger } from '../config/logger.js';
import { emitNotification } from './notificationService.js';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MissionTemplate {
  type: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  xpReward: number;
}

function generateMissions(activeGoalCount: number): MissionTemplate[] {
  const pool: MissionTemplate[] = [
    { type: 'solve_problem', title: 'Solve a Problem', description: 'Solve any coding problem', icon: '💻', target: 1, xpReward: 20 },
    { type: 'solve_problem', title: 'Solve 2 Problems', description: 'Solve 2 coding problems', icon: '💻', target: 2, xpReward: 35 },
    { type: 'complete_module', title: 'Complete a Module', description: 'Finish any goal module', icon: '📦', target: 1, xpReward: 30 },
    { type: 'study_time', title: 'Study for 30min', description: 'Log at least 30 minutes of study time', icon: '⏱️', target: 30, xpReward: 20 },
    { type: 'study_time', title: 'Study for 1 hour', description: 'Log at least 60 minutes of study time', icon: '⏱️', target: 60, xpReward: 40 },
    { type: 'quiz_score', title: 'Score 80%+ on Quiz', description: 'Get at least 80% on any module quiz', icon: '🧠', target: 80, xpReward: 35 },
    { type: 'login_streak', title: 'Keep Your Streak', description: 'Log in and do any learning activity', icon: '🔥', target: 1, xpReward: 15 },
  ];

  // Deterministic-ish daily shuffle using date as seed
  const day = Number(todayKey().replace(/-/g, ''));
  const shuffled = pool.sort((a, b) => {
    const ha = (day * 31 + a.title.length * 17) % 100;
    const hb = (day * 31 + b.title.length * 17) % 100;
    return ha - hb;
  });

  // Pick 3 diverse missions (no duplicate types)
  const picked: MissionTemplate[] = [];
  const usedTypes = new Set<string>();
  for (const m of shuffled) {
    if (picked.length >= 3) break;
    if (usedTypes.has(m.type)) continue;
    usedTypes.add(m.type);
    picked.push(m);
  }

  // If we don't have 3 yet, fill from remaining
  for (const m of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.includes(m)) picked.push(m);
  }

  return picked.slice(0, 3);
}

export async function getOrCreateTodayMissions(userId: string) {
  const date = todayKey();
  let doc = await DailyMission.findOne({ userId, date }).lean();

  if (!doc) {
    const activeCount = await Goal.countDocuments({ userId, status: 'active' });
    const missions = generateMissions(activeCount);

    doc = await DailyMission.create({
      userId,
      date,
      missions: missions.map(m => ({
        type: m.type,
        title: m.title,
        description: m.description,
        icon: m.icon,
        target: m.target,
        progress: 0,
        completed: false,
        completedAt: null,
        xpReward: m.xpReward,
      })),
      allCompleted: false,
      bonusXP: 50,
      bonusClaimed: false,
    });
    doc = (doc as any).toObject ? (doc as any).toObject() : doc;
  }

  return dailyMissionToJSON(doc);
}

export async function updateMissionProgress(
  userId: string,
  missionType: string,
  progressDelta: number
): Promise<void> {
  const date = todayKey();
  const doc = await DailyMission.findOne({ userId, date });
  if (!doc) return;

  let changed = false;
  let xpToAward = 0;

  for (const m of doc.missions as any[]) {
    if (m.type === missionType && !m.completed) {
      m.progress = Math.min(m.target, (m.progress ?? 0) + progressDelta);
      if (m.progress >= m.target) {
        m.completed = true;
        m.completedAt = new Date();
        xpToAward += m.xpReward ?? 0;
      }
      changed = true;
    }
  }

  if (changed) {
    const allDone = doc.missions.every((m: any) => m.completed);
    if (allDone && !doc.allCompleted) {
      doc.allCompleted = true;
      if (!doc.bonusClaimed) {
        xpToAward += doc.bonusXP ?? 50;
        doc.bonusClaimed = true;
      }
    }

    await doc.save();

    if (xpToAward > 0) {
      await User.updateOne({ _id: userId }, { $inc: { xp: xpToAward } });
      const user = await User.findById(userId).select('xp').lean();
      if (user) {
        const newRank = rankForXP((user as any).xp ?? 0);
        await User.updateOne({ _id: userId }, { $set: { level: newRank } });
      }
    }

    if (allDone && doc.bonusClaimed) {
      void emitNotification({
        userId,
        type: 'badge_earned',
        title: '🎉 All daily missions completed!',
        message: `You earned ${doc.bonusXP} bonus XP for completing all missions today!`,
        icon: '🎉',
        link: '/dashboard',
        priority: 'medium',
      });
    }
  }
}

/** GET /api/missions/today */
export async function getTodayMissions(userId: string) {
  return getOrCreateTodayMissions(userId);
}

/** Leaderboard: top users by XP */
export async function getLeaderboard(limit = 50) {
  const users = await User.find()
    .select('name username profilePic xp level')
    .sort({ xp: -1 })
    .limit(limit)
    .lean();

  return users.map((u: any, i: number) => ({
    rank: i + 1,
    id: String(u._id),
    name: u.name,
    username: u.username,
    profilePic: u.profilePic ?? '',
    xp: u.xp ?? 0,
    level: u.level ?? 'Beginner',
  }));
}

/** Weekly leaderboard: top performers this week */
export async function getWeeklyLeaderboard(limit = 20) {
  // Approximate weekly XP by finding users who were recently active
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await User.find({ lastLoginAt: { $gte: weekAgo } })
    .select('name username profilePic xp level')
    .sort({ xp: -1 })
    .limit(limit)
    .lean();

  return users.map((u: any, i: number) => ({
    rank: i + 1,
    id: String(u._id),
    name: u.name,
    username: u.username,
    profilePic: u.profilePic ?? '',
    xp: u.xp ?? 0,
    level: u.level ?? 'Beginner',
  }));
}
