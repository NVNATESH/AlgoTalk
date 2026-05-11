import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Goal, goalToJSON } from '../models/Goal.js';
import { Problem } from '../models/Problem.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON } from './gemini.js';
import {
  roadmapPrompt,
  type GeneratedRoadmap,
  type RoadmapInput,
} from '../prompts/learning.js';
import { emitNotification } from './notificationService.js';
import { Integration } from '../models/Integration.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';

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
  generateFromProfile?: boolean;
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  // Fetch platform data to personalize the AI-generated roadmap
  const userContext = await buildUserContext(userId);

  // If generateFromProfile is true and no topic specified, derive from weak areas
  let topic = input.topic;
  if (input.generateFromProfile && userContext) {
    const weakMatch = userContext.match(/Identified weak areas:\s*(.+)/);
    if (weakMatch) {
      // Use the first 2-3 weak topics as the goal topic
      const weakTopics = weakMatch[1].split(',').map(t => t.trim()).slice(0, 3);
      topic = weakTopics.join(' + ') || input.topic;
    }
  }

  const roadmap = input.customRoadmap ?? (await generateRoadmap({ ...input, topic, userContext }));

  const startDate = new Date();
  const deadline = new Date(Date.now() + (input.deadlineDays ?? 30) * 24 * 60 * 60 * 1000);

  const totalEstimated = roadmap.modules.reduce((sum, m) => sum + (m.estimatedHours || 0), 0);
  const perModuleDays = (input.deadlineDays ?? 30) / Math.max(roadmap.modules.length, 1);

  // Auto-match problems from the Problem DB based on each module's topics
  const moduleProblems = await matchProblemsForModules(roadmap.modules);

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
    problemSlugs: moduleProblems[i] ?? [],
    problemsSolved: 0,
    completedAt: null,
    dueDate: new Date(Date.now() + Math.round(perModuleDays * (i + 1)) * 24 * 60 * 60 * 1000),
  }));

  const goal = await Goal.create({
    userId,
    name: roadmap.name,
    icon: roadmap.icon,
    description: roadmap.description,
    topic,
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
  // Cache key: normalized topic + difficulty
  const cacheKey = `${input.topic.trim().toLowerCase().replace(/\s+/g, ' ')}::${input.difficulty}`;

  // Check in-memory cache first
  const cached = roadmapCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ROADMAP_CACHE_TTL) {
    return structuredClone(cached.roadmap);
  }

  // Check DB: reuse roadmap from another goal with the same topic+difficulty (created within 7 days)
  const recentGoal = await Goal.findOne({
    topic: { $regex: new RegExp(`^${input.topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    difficulty: input.difficulty,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (recentGoal?.modules?.length) {
    const reused: GeneratedRoadmap = {
      name: recentGoal.name as string,
      icon: (recentGoal.icon as string) ?? '📚',
      description: (recentGoal.description as string) ?? '',
      estimatedHours: (recentGoal.estimatedHours as number) ?? 0,
      modules: (recentGoal.modules as any[]).map((m: any) => ({
        title: m.title,
        description: m.description,
        topics: m.topics ?? [],
        estimatedHours: m.estimatedHours ?? 2,
        difficulty: m.difficulty ?? 'Medium',
      })),
      rationale: (recentGoal.rationale as string) ?? 'Reused from a recent identical roadmap.',
    };
    roadmapCache.set(cacheKey, { roadmap: reused, ts: Date.now() });
    return structuredClone(reused);
  }

  const prompt = roadmapPrompt(input);
  const roadmap = await geminiJSON<GeneratedRoadmap>(prompt);

  if (!roadmap?.modules?.length) {
    throw ApiError.badRequest('AI returned an invalid roadmap — try a more specific topic');
  }
  // hard cap modules
  if (roadmap.modules.length > 12) roadmap.modules = roadmap.modules.slice(0, 12);

  // Store in cache
  roadmapCache.set(cacheKey, { roadmap: structuredClone(roadmap), ts: Date.now() });

  return roadmap;
}

// In-memory roadmap cache (topic::difficulty -> roadmap), TTL 24h
const ROADMAP_CACHE_TTL = 24 * 60 * 60 * 1000;
const roadmapCache = new Map<string, { roadmap: GeneratedRoadmap; ts: number }>();

/**
 * For each generated module, find matching problems from the Problem DB
 * based on the module's topic tags and difficulty. Returns an array of
 * slug arrays (one per module).
 */
async function matchProblemsForModules(
  modules: Array<{ topics: string[]; difficulty: string }>
): Promise<string[][]> {
  // Collect all unique topic tags across modules (case-insensitive)
  const allTopics = [...new Set(modules.flatMap((m) => m.topics.map((t) => t.toLowerCase())))];
  if (allTopics.length === 0) return modules.map(() => []);

  // Fetch all problems that match any of the topics (single DB query)
  const topicRegexes = allTopics.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  const matchingProblems = await Problem.find({ tags: { $in: topicRegexes } })
    .select('slug tags difficulty')
    .lean();

  if (matchingProblems.length === 0) return modules.map(() => []);

  // Track which slugs have been assigned to avoid duplicates across modules
  const usedSlugs = new Set<string>();

  return modules.map((mod) => {
    const modTopics = new Set(mod.topics.map((t) => t.toLowerCase()));

    // Score each problem by how many of the module's topics it matches
    const scored = matchingProblems
      .filter((p) => !usedSlugs.has(p.slug))
      .map((p) => {
        const pTags = (p.tags as string[]).map((t) => t.toLowerCase());
        const overlap = pTags.filter((t) => modTopics.has(t)).length;
        // Bonus for matching difficulty
        const diffBonus = p.difficulty === mod.difficulty ? 1 : 0;
        return { slug: p.slug as string, score: overlap + diffBonus };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Pick up to 4 problems per module
    const selected = scored.slice(0, 4).map((s) => s.slug);
    selected.forEach((s) => usedSlugs.add(s));
    return selected;
  });
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

  const modIndex = goal.modules.findIndex((m: any) => m.moduleId === moduleId);
  if (modIndex === -1) throw ApiError.notFound('Module not found');
  const mod = goal.modules[modIndex];

  // ─── Sequential unlock: cannot start a module until the previous one is completed ───
  if (status === 'in_progress' && modIndex > 0) {
    const prevMod = goal.modules[modIndex - 1];
    if ((prevMod as any).status !== 'completed') {
      throw ApiError.badRequest(
        `Complete the previous module "${(prevMod as any).title}" before starting this one.`
      );
    }
  }

  // Enforce: cannot complete a module unless the quiz has been passed (≥70%)
  // AND all assigned problems have been solved
  if (status === 'completed') {
    // Also enforce sequential: previous module must be completed
    if (modIndex > 0) {
      const prevMod = goal.modules[modIndex - 1];
      if ((prevMod as any).status !== 'completed') {
        throw ApiError.badRequest(
          `Complete the previous module "${(prevMod as any).title}" first.`
        );
      }
    }

    const { LearningContent } = await import('../models/LearningContent.js');

    // Quest-type goals have NO concepts, NO examples, NO quizzes — only problems
    const isQuest = (goal as any).goalType === 'quest';

    if (!isQuest) {
      const content = await LearningContent.findOne({ userId, goalId, moduleId }).lean();
      if (!content || (content.bestPercentage ?? 0) < 70) {
        throw ApiError.badRequest(
          'Complete the quiz with at least 70% before marking this module as done.'
        );
      }
    }

    // Check that all assigned problems are solved
    const slugs = (mod.problemSlugs ?? []) as string[];
    if (slugs.length > 0) {
      const { Submission } = await import('../models/Submission.js');
      const problems = await Problem.find({ slug: { $in: slugs } }).select('_id slug').lean();
      const problemIds = problems.map((p) => p._id);
      const acceptedProblemIds = await Submission.distinct('problemId', {
        userId,
        problemId: { $in: problemIds },
        status: 'accepted',
      });
      if (acceptedProblemIds.length < slugs.length) {
        const remaining = slugs.length - acceptedProblemIds.length;
        throw ApiError.badRequest(
          `Solve all assigned problems before completing this module. ${remaining} problem${remaining > 1 ? 's' : ''} remaining.`
        );
      }
    }
  }

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

/**
 * Called after a successful problem submission. Finds all active goals whose
/**
 * Build a context string from the user's platform integrations and submission history.
 * This is passed to Gemini to personalise the roadmap based on weaknesses.
 */
async function buildUserContext(userId: string): Promise<string | undefined> {
  try {
    const integrations = await Integration.find({ userId, isActive: true }).lean();
    if (integrations.length === 0) return undefined;

    const lines: string[] = ['Connected coding platforms:'];

    for (const integ of integrations) {
      const parts = [`- ${integ.platform}: handle "${integ.handle}"`];
      if (integ.rating) parts.push(`rating ${integ.rating}`);
      if (integ.rank) parts.push(`rank "${integ.rank}"`);
      if (integ.solvedCount) parts.push(`${integ.solvedCount} problems solved`);
      if (integ.submissionCount) parts.push(`${integ.submissionCount} total submissions`);
      lines.push(parts.join(', '));
    }

    // Aggregate topic-level stats from extracted submissions
    const topicStats = await ExtractedSubmission.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $unwind: '$topics' },
      { $group: {
        _id: '$topics',
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
      }},
      { $sort: { total: -1 } },
      { $limit: 15 },
    ]);

    if (topicStats.length > 0) {
      lines.push('\nTopic-wise performance (from submissions):');
      for (const t of topicStats) {
        const rate = t.total > 0 ? Math.round((t.accepted / t.total) * 100) : 0;
        lines.push(`- ${t._id}: ${t.accepted}/${t.total} accepted (${rate}%)`);
      }
      // Identify weaknesses (topics with < 50% acceptance rate)
      const weak = topicStats.filter((t) => t.total >= 3 && (t.accepted / t.total) < 0.5);
      if (weak.length > 0) {
        lines.push(`\nIdentified weak areas: ${weak.map((w) => w._id).join(', ')}`);
      }
      // Identify strengths (topics with >= 80% acceptance rate)
      const strong = topicStats.filter((t) => t.total >= 5 && (t.accepted / t.total) >= 0.8);
      if (strong.length > 0) {
        lines.push(`Strong areas (can skip basics): ${strong.map((s) => s._id).join(', ')}`);
      }
    }

    // Difficulty distribution
    const diffStats = await ExtractedSubmission.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: {
        _id: '$difficulty',
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);

    if (diffStats.length > 0) {
      lines.push('\nDifficulty distribution:');
      for (const d of diffStats) {
        if (!d._id) continue;
        lines.push(`- ${d._id}: ${d.accepted}/${d.total} accepted`);
      }
    }

    return lines.join('\n');
  } catch {
    // Non-critical — fall back to un-personalized roadmap
    return undefined;
  }
}

/**
 * After a user solves a problem (accepted submission), check if any of their
 * modules reference this problem slug and updates the problemsSolved counter.
 * Fire-and-forget — errors are swallowed so they don't break the submission flow.
 */
export async function syncProblemSolved(userId: string, problemSlug: string): Promise<void> {
  try {
    const goals = await Goal.find({
      userId,
      status: { $in: ['active', 'paused'] },
      'modules.problemSlugs': problemSlug,
    });

    for (const goal of goals) {
      let changed = false;
      for (const mod of goal.modules) {
        const slugs = (mod as any).problemSlugs as string[];
        if (!slugs?.includes(problemSlug)) continue;

        // Recount accepted problems for accuracy
        const { Submission } = await import('../models/Submission.js');
        const problems = await Problem.find({ slug: { $in: slugs } }).select('_id').lean();
        const problemIds = problems.map((p) => p._id);
        const acceptedCount = (
          await Submission.distinct('problemId', {
            userId,
            problemId: { $in: problemIds },
            status: 'accepted',
          })
        ).length;

        if (acceptedCount !== (mod as any).problemsSolved) {
          (mod as any).problemsSolved = acceptedCount;
          changed = true;
        }
      }
      if (changed) {
        goal.lastActivityAt = new Date();
        await goal.save();
      }
    }
  } catch {
    // Swallow — this is a background sync
  }
}
