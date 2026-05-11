import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Goal, goalToJSON } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';
import { emitNotification } from '../services/notificationService.js';

/** GET /api/goals/recommended — list all public templates */
export async function listRecommended(req: Request, res: Response) {
  const { category, goalType, company, difficulty, search } = req.query;
  const filter: Record<string, unknown> = { isPublic: true };

  if (category) filter.category = category;
  if (goalType) filter.goalType = goalType;
  if (company) filter.companyTarget = { $regex: new RegExp(String(company), 'i') };
  if (difficulty) filter.difficulty = difficulty;
  if (search) {
    const s = String(search);
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { description: { $regex: s, $options: 'i' } },
      { topic: { $regex: s, $options: 'i' } },
    ];
  }

  const templates = await Goal.find(filter)
    .sort({ goalType: 1, category: 1, name: 1 })
    .lean();

  // Check which templates the user already enrolled in
  const userId = (req as any).userId;
  const enrolled = userId
    ? await Goal.find({ userId, templateId: { $ne: null } }).select('templateId').lean()
    : [];
  const enrolledSet = new Set(enrolled.map(g => String((g as any).templateId)));

  const goals = templates.map(g => ({
    ...goalToJSON(g),
    enrolled: enrolledSet.has(String(g._id)),
  }));

  res.json({ goals, total: goals.length });
}

/** POST /api/goals/recommended/:templateId/enroll — clone template into user goals */
export async function enrollInTemplate(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { templateId } = req.params;
  const { deadlineDays = 30, weeklyHours = 8, priority = 'P1' } = req.body ?? {};

  if (!Types.ObjectId.isValid(templateId)) throw ApiError.notFound('Template not found');

  const template = await Goal.findOne({ _id: templateId, isPublic: true }).lean();
  if (!template) throw ApiError.notFound('Template not found');

  // Check if already enrolled
  const existing = await Goal.findOne({ userId, templateId }).lean();
  if (existing) {
    return res.json({ goal: goalToJSON(existing), alreadyEnrolled: true });
  }

  const startDate = new Date();
  const deadline = new Date(Date.now() + (deadlineDays ?? 30) * 24 * 60 * 60 * 1000);
  const perModuleDays = (deadlineDays ?? 30) / Math.max((template.modules ?? []).length, 1);

  const goal = await Goal.create({
    userId,
    name: template.name,
    icon: template.icon,
    description: template.description,
    topic: template.topic,
    difficulty: template.difficulty,
    priority,
    goalType: (template as any).goalType ?? 'recommended',
    category: (template as any).category ?? 'other',
    companyTarget: (template as any).companyTarget ?? null,
    roleTarget: (template as any).roleTarget ?? null,
    resources: (template as any).resources ?? [],
    xpReward: (template as any).xpReward ?? 100,
    badgeKey: (template as any).badgeKey ?? null,
    templateId: template._id,
    isPublic: false,
    weeklyHours,
    estimatedHours: template.estimatedHours,
    startDate,
    deadline,
    modules: (template.modules ?? []).map((m: any, i: number) => ({
      moduleId: crypto.randomUUID(),
      title: m.title,
      description: m.description,
      topics: m.topics ?? [],
      difficulty: m.difficulty ?? 'Medium',
      status: 'not_started',
      estimatedHours: m.estimatedHours ?? 1,
      actualMinutes: 0,
      quizScore: null,
      problemsSolved: 0,
      completedAt: null,
      dueDate: new Date(Date.now() + Math.round(perModuleDays * (i + 1)) * 24 * 60 * 60 * 1000),
    })),
    rationale: `Enrolled from recommended template "${template.name}"`,
  });

  res.status(201).json({ goal: goalToJSON(goal.toObject()), alreadyEnrolled: false });
}

/** GET /api/goals/company/:company — list goals targeting a specific company */
export async function listCompanyGoals(req: Request, res: Response) {
  const userId = (req as any).userId;
  const company = decodeURIComponent(req.params.company);

  const [userGoals, templateGoals] = await Promise.all([
    Goal.find({ userId, companyTarget: { $regex: new RegExp(`^${company}$`, 'i') } }).lean(),
    Goal.find({ isPublic: true, companyTarget: { $regex: new RegExp(`^${company}$`, 'i') } }).lean(),
  ]);

  res.json({
    company,
    userGoals: userGoals.map(goalToJSON),
    templates: templateGoals.map(g => goalToJSON(g)),
  });
}

/** GET /api/goals/quests — list quest-type goals for the user */
export async function listQuestGoals(req: Request, res: Response) {
  const userId = (req as any).userId;

  const [userQuests, templateQuests] = await Promise.all([
    Goal.find({ userId, goalType: 'quest' }).sort({ questOrder: 1 }).lean(),
    Goal.find({ isPublic: true, goalType: 'quest' }).sort({ questOrder: 1 }).lean(),
  ]);

  res.json({
    userQuests: userQuests.map(goalToJSON),
    templates: templateQuests.map(g => goalToJSON(g)),
  });
}

/** GET /api/goals/:goalId/export — export a goal as Markdown */
export async function exportGoalMarkdown(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { goalId } = req.params;
  const format = (req.query.format as string) ?? 'markdown';

  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  if (!goal) throw ApiError.notFound('Goal not found');

  if (format === 'json') {
    return res.json({ goal: goalToJSON(goal) });
  }

  // Markdown export
  const lines: string[] = [];
  lines.push(`# ${goal.icon ?? '🎯'} ${goal.name}\n`);
  if (goal.description) lines.push(`${goal.description}\n`);
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Difficulty | ${goal.difficulty} |`);
  lines.push(`| Estimated Hours | ${goal.estimatedHours ?? 0} |`);
  lines.push(`| Progress | ${goal.progress ?? 0}% |`);
  lines.push(`| Status | ${goal.status} |`);
  if ((goal as any).companyTarget) lines.push(`| Company | ${(goal as any).companyTarget} |`);
  lines.push('');

  if ((goal.modules ?? []).length > 0) {
    lines.push(`## Modules\n`);
    for (const m of goal.modules as any[]) {
      const status = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⬜';
      lines.push(`### ${status} ${m.title}`);
      if (m.description) lines.push(`${m.description}\n`);
      if (m.topics?.length) lines.push(`**Topics:** ${m.topics.join(', ')}\n`);
      lines.push(`- Difficulty: ${m.difficulty ?? 'Medium'}`);
      lines.push(`- Estimated: ${m.estimatedHours ?? 1}h`);
      if (m.quizScore != null) lines.push(`- Quiz Score: ${m.quizScore}%`);
      lines.push('');
    }
  }

  const resources = (goal as any).resources ?? [];
  if (resources.length > 0) {
    lines.push(`## Resources\n`);
    for (const r of resources) {
      lines.push(`- [${r.title}](${r.url}) (${r.type ?? 'docs'})`);
    }
    lines.push('');
  }

  lines.push(`\n---\n*Generated by LearnHub on ${new Date().toISOString().slice(0, 10)}*`);

  const markdown = lines.join('\n');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${goal.name.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
  res.send(markdown);
}
