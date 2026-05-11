/**
 * automationService.ts
 *
 * In-process cron-like automation for email reminders, weekly reports,
 * streak alerts, and deadline warnings. Plugs into syncScheduler.
 *
 * Hard cap: max 3 automated emails per user per day so we never spam.
 */

import { Goal } from '../models/Goal.js';
import { User, rankForXP } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Badge } from '../models/Badge.js';
import { logger } from '../config/logger.js';
import { emitNotification } from './notificationService.js';
import { mailer } from './mailer.js';

// ── In-memory per-day email budget per user ────────────────────────────
const dailyEmailBudget = new Map<string, { date: string; count: number }>();
const MAX_DAILY_EMAILS = 3;

function canEmailToday(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyEmailBudget.get(userId);
  if (!entry || entry.date !== today) {
    dailyEmailBudget.set(userId, { date: today, count: 0 });
    return true;
  }
  return entry.count < MAX_DAILY_EMAILS;
}

function recordEmail(userId: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyEmailBudget.get(userId);
  if (!entry || entry.date !== today) {
    dailyEmailBudget.set(userId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

// ── Daily inactivity reminder ──────────────────────────────────────────
export async function runDailyReminders(): Promise<{ reminded: number }> {
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const goals = await Goal.find({
    status: 'active',
    $or: [
      { lastActivityAt: { $lt: cutoff48h } },
      { lastActivityAt: null },
    ],
  }).select('userId name _id lastActivityAt').lean();

  const userGoals = new Map<string, string[]>();
  for (const g of goals) {
    const uid = String(g.userId);
    if (!userGoals.has(uid)) userGoals.set(uid, []);
    userGoals.get(uid)!.push(g.name);
  }

  let reminded = 0;
  for (const [userId, goalNames] of userGoals) {
    void emitNotification({
      userId,
      type: 'goal_reminder',
      title: `📚 Time to study!`,
      message: `You haven't worked on ${goalNames.length === 1 ? `"${goalNames[0]}"` : `${goalNames.length} goals`} in 2+ days. A little progress goes a long way.`,
      icon: '⏰',
      link: '/dashboard',
      priority: 'medium',
    });
    reminded++;
  }

  if (reminded > 0) {
    logger.info({ reminded }, 'daily inactivity reminders sent');
  }
  return { reminded };
}

// ── Streak risk alerts ─────────────────────────────────────────────────
export async function runStreakAlerts(): Promise<{ alerted: number }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const goals = await Goal.find({
    status: 'active',
    streak: { $gte: 3 },
    lastActivityAt: { $lt: startOfDay },
  }).select('userId name streak _id').lean();

  let alerted = 0;
  for (const g of goals) {
    void emitNotification({
      userId: String(g.userId),
      type: 'streak_alert',
      title: `🔥 ${g.streak}-day streak at risk!`,
      message: `Complete any activity on "${g.name}" today to keep your streak alive.`,
      icon: '🔥',
      link: `/goals/${String(g._id)}`,
      priority: 'high',
    });
    alerted++;
  }

  if (alerted > 0) logger.info({ alerted }, 'streak risk alerts sent');
  return { alerted };
}

// ── Deadline proximity warnings ────────────────────────────────────────
export async function runDeadlineWarnings(): Promise<{ warned: number }> {
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const threeDaysLater = new Date(now + threeDaysMs);

  const goals = await Goal.find({
    status: 'active',
    deadline: { $lte: threeDaysLater, $gt: new Date() },
    progress: { $lt: 90 },
  }).select('userId name deadline progress _id').lean();

  let warned = 0;
  for (const g of goals) {
    const daysLeft = Math.ceil((new Date(g.deadline).getTime() - now) / (24 * 60 * 60 * 1000));
    void emitNotification({
      userId: String(g.userId),
      type: 'goal_deadline_near',
      title: `⚠️ "${g.name}" deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      message: `You're at ${g.progress}% — push through to finish on time!`,
      icon: '⚠️',
      link: `/goals/${String(g._id)}`,
      priority: 'high',
    });
    warned++;
  }

  if (warned > 0) logger.info({ warned }, 'deadline proximity warnings sent');
  return { warned };
}

// ── Weekly progress report ─────────────────────────────────────────────
export interface WeeklyReport {
  userId: string;
  userName: string;
  weekStart: string;
  weekEnd: string;
  goalsActive: number;
  goalsCompleted: number;
  totalMinutes: number;
  xpEarned: number;
  rank: string;
  streakBest: number;
  topGoals: Array<{ name: string; progress: number; icon: string }>;
  upcomingDeadlines: Array<{ name: string; deadline: string; progress: number }>;
}

export async function generateWeeklyReport(userId: string): Promise<WeeklyReport> {
  const user = await User.findById(userId).select('name xp').lean();
  if (!user) throw new Error('User not found');

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const goals = await Goal.find({ userId }).lean();
  const active = goals.filter(g => g.status === 'active');
  const completedThisWeek = goals.filter(
    g => g.status === 'completed' && g.completedAt && new Date(g.completedAt) >= weekAgo
  );

  const totalMinutes = active.reduce((s, g) => s + (g.actualMinutes ?? 0), 0);
  const streakBest = goals.reduce((m, g) => Math.max(m, g.streak ?? 0), 0);

  const topGoals = active
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 5)
    .map(g => ({ name: g.name, progress: g.progress ?? 0, icon: g.icon ?? '🎯' }));

  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = active
    .filter(g => g.deadline && new Date(g.deadline) <= fourteenDays)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
    .map(g => ({
      name: g.name,
      deadline: new Date(g.deadline).toISOString(),
      progress: g.progress ?? 0,
    }));

  return {
    userId,
    userName: (user as any).name ?? 'Learner',
    weekStart: weekAgo.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
    goalsActive: active.length,
    goalsCompleted: completedThisWeek.length,
    totalMinutes,
    xpEarned: (user as any).xp ?? 0,
    rank: rankForXP((user as any).xp ?? 0),
    streakBest,
    topGoals,
    upcomingDeadlines,
  };
}

export async function runWeeklyReports(): Promise<{ sent: number }> {
  // Find all users with at least 1 active goal
  const userIds = await Goal.distinct('userId', { status: 'active' });
  let sent = 0;

  for (const uid of userIds) {
    const userId = String(uid);
    try {
      if (!canEmailToday(userId)) continue;

      const report = await generateWeeklyReport(userId);
      const user = await User.findById(userId).select('email name isVerified preferences').lean();
      if (!user || !(user as any).isVerified) continue;

      const prefs: any = (user as any).preferences ?? {};
      if (prefs.emailNotifications === false) continue;

      void emitNotification({
        userId,
        type: 'weekly_report',
        title: '📈 Your weekly progress report',
        message: `${report.goalsCompleted} goals completed, ${Math.round(report.totalMinutes / 60)}h studied this week.`,
        icon: '📈',
        link: '/dashboard',
        priority: 'medium',
      });

      await mailer.sendWeeklyReport(
        (user as any).email,
        (user as any).name,
        report
      );
      recordEmail(userId);
      sent++;
    } catch (err) {
      logger.warn({ err: (err as Error).message, userId }, 'weekly report failed');
    }
  }

  if (sent > 0) logger.info({ sent }, 'weekly reports sent');
  return { sent };
}
