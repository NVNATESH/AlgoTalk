import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { AuditLog } from '../models/AuditLog.js';
import { Goal, goalToJSON } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';
import { invalidateProblemCatalogCache } from './analyzerService.js';

interface AdminContext {
  actorId: string;
  actorRole: 'user' | 'moderator' | 'admin' | undefined;
  ip?: string;
}

async function logAction(
  ctx: AdminContext,
  action: string,
  entity: string,
  entityId: string,
  diff: unknown
) {
  await AuditLog.create({
    actorId: new Types.ObjectId(ctx.actorId),
    actorRole: ctx.actorRole ?? 'user',
    action,
    entity,
    entityId,
    diff,
    ip: ctx.ip ?? '',
  }).catch(() => {});
}

const PROBLEM_FIELDS =
  'slug title description difficulty tags companyTags inputFormat outputFormat constraints examples testCases starterCode timeLimitMs memoryLimitKb totalSubmissions totalAccepted createdAt updatedAt';

export async function listProblemsAdmin(opts: { search?: string; difficulty?: string; page?: number; limit?: number }) {
  const filter: Record<string, unknown> = {};
  if (opts.search) {
    filter.$or = [
      { title: { $regex: opts.search, $options: 'i' } },
      { slug: { $regex: opts.search, $options: 'i' } },
    ];
  }
  if (opts.difficulty) filter.difficulty = opts.difficulty;
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const page = Math.max(1, opts.page ?? 1);
  const [docs, total] = await Promise.all([
    Problem.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('slug title difficulty tags companyTags totalSubmissions totalAccepted updatedAt')
      .lean(),
    Problem.countDocuments(filter),
  ]);
  return { problems: docs, total, page, limit };
}

export async function getProblemAdmin(slug: string) {
  const doc = await Problem.findOne({ slug }).select(PROBLEM_FIELDS).lean();
  if (!doc) throw ApiError.notFound('Problem not found');
  return doc;
}

const REQUIRED_PROBLEM_FIELDS = ['slug', 'title', 'description', 'difficulty'];

export async function createProblemAdmin(ctx: AdminContext, body: any) {
  for (const f of REQUIRED_PROBLEM_FIELDS) {
    if (!body[f]) throw ApiError.badRequest(`Missing required field: ${f}`);
  }
  const existing = await Problem.findOne({ slug: body.slug }).select('_id').lean();
  if (existing) throw ApiError.conflict(`A problem with slug "${body.slug}" already exists`);

  const doc = await Problem.create({
    slug: body.slug,
    title: body.title,
    description: body.description,
    difficulty: body.difficulty,
    tags: body.tags ?? [],
    companyTags: body.companyTags ?? [],
    inputFormat: body.inputFormat ?? '',
    outputFormat: body.outputFormat ?? '',
    constraints: body.constraints ?? '',
    examples: body.examples ?? [],
    testCases: body.testCases ?? [],
    starterCode: body.starterCode ?? {},
    timeLimitMs: body.timeLimitMs ?? 2000,
    memoryLimitKb: body.memoryLimitKb ?? 256 * 1024,
  });
  invalidateProblemCatalogCache();
  await logAction(ctx, 'problem.create', 'Problem', String(doc._id), { slug: doc.slug });
  return doc.toObject();
}

export async function updateProblemAdmin(ctx: AdminContext, slug: string, body: any) {
  const doc = await Problem.findOne({ slug });
  if (!doc) throw ApiError.notFound('Problem not found');
  const updatable = [
    'title',
    'description',
    'difficulty',
    'tags',
    'companyTags',
    'inputFormat',
    'outputFormat',
    'constraints',
    'examples',
    'testCases',
    'starterCode',
    'timeLimitMs',
    'memoryLimitKb',
  ];
  const before: Record<string, unknown> = {};
  for (const k of updatable) {
    if (body[k] !== undefined) {
      before[k] = (doc as any)[k];
      (doc as any)[k] = body[k];
    }
  }
  await doc.save();
  invalidateProblemCatalogCache();
  await logAction(ctx, 'problem.update', 'Problem', String(doc._id), { slug, before, after: body });
  return doc.toObject();
}

export async function deleteProblemAdmin(ctx: AdminContext, slug: string) {
  const doc = await Problem.findOne({ slug }).select('_id slug title').lean();
  if (!doc) throw ApiError.notFound('Problem not found');
  await Problem.deleteOne({ _id: doc._id });
  invalidateProblemCatalogCache();
  await logAction(ctx, 'problem.delete', 'Problem', String(doc._id), { slug });
}

export async function bulkImportProblemsAdmin(ctx: AdminContext, items: any[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Provide a non-empty array of problems');
  }
  const ops = items.map((p: any) => ({
    updateOne: {
      filter: { slug: p.slug },
      update: {
        $set: {
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          tags: p.tags ?? [],
          companyTags: p.companyTags ?? [],
          inputFormat: p.inputFormat ?? '',
          outputFormat: p.outputFormat ?? '',
          constraints: p.constraints ?? '',
          examples: p.examples ?? [],
          testCases: p.testCases ?? [],
          starterCode: p.starterCode ?? {},
        },
        $setOnInsert: { slug: p.slug },
      },
      upsert: true,
    },
  }));
  const result = await Problem.bulkWrite(ops as any, { ordered: false });
  invalidateProblemCatalogCache();
  await logAction(ctx, 'problem.bulk_import', 'Problem', '', {
    count: items.length,
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
  });
  return { upserted: result.upsertedCount, modified: result.modifiedCount };
}

const TEMPLATE_FIELDS =
  'name icon description topic difficulty priority goalType category companyTarget roleTarget questOrder isLocked resources xpReward badgeKey estimatedHours modules createdAt updatedAt';

function ensureObjectId(id: string, label: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound(`${label} not found`);
}

export async function listRecommendedGoalTemplatesAdmin(opts: {
  search?: string;
  goalType?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const filter: Record<string, unknown> = { isPublic: true };
  if (opts.goalType) filter.goalType = opts.goalType;
  if (opts.category) filter.category = opts.category;
  if (opts.search) {
    const s = opts.search;
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { topic: { $regex: s, $options: 'i' } },
      { description: { $regex: s, $options: 'i' } },
      { companyTarget: { $regex: s, $options: 'i' } },
    ];
  }

  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const [docs, total] = await Promise.all([
    Goal.find(filter)
      .sort({ goalType: 1, category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(TEMPLATE_FIELDS)
      .lean(),
    Goal.countDocuments(filter),
  ]);

  return { goals: docs.map(goalToJSON), total, page, limit };
}

export async function getRecommendedGoalTemplateAdmin(goalId: string) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true }).select(TEMPLATE_FIELDS).lean();
  if (!doc) throw ApiError.notFound('Template not found');
  return goalToJSON(doc);
}

export async function updateRecommendedGoalTemplateAdmin(
  ctx: AdminContext,
  goalId: string,
  body: any
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const updatable = [
    'name',
    'icon',
    'description',
    'topic',
    'difficulty',
    'priority',
    'goalType',
    'category',
    'companyTarget',
    'roleTarget',
    'questOrder',
    'isLocked',
    'resources',
    'xpReward',
    'badgeKey',
    'estimatedHours',
  ];
  const before: Record<string, unknown> = {};
  for (const key of updatable) {
    if (body[key] !== undefined) {
      before[key] = (doc as any)[key];
      (doc as any)[key] = body[key];
    }
  }

  await doc.save();
  await logAction(ctx, 'goal_template.update', 'Goal', goalId, { before, after: body });
  return goalToJSON(doc.toObject());
}

export async function addRecommendedGoalModuleAdmin(
  ctx: AdminContext,
  goalId: string,
  body: any
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const module = {
    moduleId: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? '',
    topics: body.topics ?? [],
    difficulty: body.difficulty ?? 'Medium',
    estimatedHours: body.estimatedHours ?? 1,
    status: 'not_started',
    actualMinutes: 0,
    quizScore: null,
    problemsSolved: 0,
    completedAt: null,
    dueDate: null,
  };

  (doc.modules as any).push(module);
  if (body.recalculateEstimatedHours !== false) {
    doc.estimatedHours = (doc.modules as any[]).reduce(
      (sum, item) => sum + Number(item.estimatedHours ?? 0),
      0
    );
  }
  await doc.save();
  await logAction(ctx, 'goal_template.module_add', 'Goal', goalId, { module });
  return goalToJSON(doc.toObject());
}

export async function updateRecommendedGoalModuleAdmin(
  ctx: AdminContext,
  goalId: string,
  moduleId: string,
  body: any
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const modules = doc.modules as any[];
  const idx = modules.findIndex((item) => item.moduleId === moduleId);
  if (idx < 0) throw ApiError.notFound('Module not found');

  const before = { ...modules[idx] };
  for (const key of ['title', 'description', 'topics', 'difficulty', 'estimatedHours']) {
    if (body[key] !== undefined) modules[idx][key] = body[key];
  }
  if (body.recalculateEstimatedHours !== false) {
    doc.estimatedHours = modules.reduce((sum, item) => sum + Number(item.estimatedHours ?? 0), 0);
  }

  await doc.save();
  await logAction(ctx, 'goal_template.module_update', 'Goal', goalId, {
    moduleId,
    before,
    after: modules[idx],
  });
  return goalToJSON(doc.toObject());
}

export async function addRecommendedGoalModuleTopicAdmin(
  ctx: AdminContext,
  goalId: string,
  moduleId: string,
  topic: string
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const module = (doc.modules as any[]).find((item) => item.moduleId === moduleId);
  if (!module) throw ApiError.notFound('Module not found');

  const normalized = topic.trim();
  if (!normalized) throw ApiError.badRequest('Topic is required');
  const exists = (module.topics ?? []).some(
    (item: string) => item.toLowerCase() === normalized.toLowerCase()
  );
  if (!exists) module.topics = [...(module.topics ?? []), normalized];

  await doc.save();
  await logAction(ctx, 'goal_template.topic_add', 'Goal', goalId, { moduleId, topic: normalized });
  return goalToJSON(doc.toObject());
}

export async function createRecommendedGoalTemplateAdmin(ctx: AdminContext, body: any) {
  const deadline = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const modules = (body.modules ?? []).map((m: any) => ({
    moduleId: crypto.randomUUID(),
    title: m.title,
    description: m.description ?? '',
    topics: m.topics ?? [],
    difficulty: m.difficulty ?? 'Medium',
    estimatedHours: m.estimatedHours ?? 1,
    status: 'not_started',
    actualMinutes: 0,
    quizScore: null,
    problemsSolved: 0,
    completedAt: null,
    dueDate: null,
  }));

  const estimatedHours =
    body.estimatedHours > 0
      ? body.estimatedHours
      : modules.reduce((sum: number, m: any) => sum + Number(m.estimatedHours ?? 0), 0);

  const doc = await Goal.create({
    userId: '000000000000000000000000',
    name: body.name,
    icon: body.icon ?? '🎯',
    description: body.description ?? '',
    topic: body.topic,
    difficulty: body.difficulty ?? 'Intermediate',
    priority: body.priority ?? 'P1',
    goalType: body.goalType ?? 'recommended',
    category: body.category ?? 'other',
    companyTarget: body.companyTarget ?? null,
    roleTarget: body.roleTarget ?? null,
    questOrder: body.questOrder ?? 0,
    isLocked: body.isLocked ?? false,
    resources: body.resources ?? [],
    xpReward: body.xpReward ?? 100,
    badgeKey: body.badgeKey ?? null,
    estimatedHours,
    isPublic: true,
    deadline,
    modules,
  });

  await logAction(ctx, 'goal_template.create', 'Goal', String(doc._id), {
    name: doc.name,
    goalType: body.goalType,
    category: body.category,
  });
  return goalToJSON(doc.toObject());
}

export async function deleteRecommendedGoalTemplateAdmin(ctx: AdminContext, goalId: string) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true }).select('_id name').lean();
  if (!doc) throw ApiError.notFound('Template not found');
  await Goal.deleteOne({ _id: doc._id });
  await logAction(ctx, 'goal_template.delete', 'Goal', goalId, { name: (doc as any).name });
}

export async function setUserRoleAdmin(ctx: AdminContext, userId: string, role: 'user' | 'admin') {
  if (!Types.ObjectId.isValid(userId)) throw ApiError.notFound('User not found');
  const u = await User.findById(userId).select('role username');
  if (!u) throw ApiError.notFound('User not found');
  const before = u.role;
  u.role = role;
  await u.save();
  await logAction(ctx, 'user.role_change', 'User', userId, { username: u.username, before, after: role });
  return { id: String(u._id), username: u.username, role: u.role };
}

export async function adminAnalytics() {
  const [users, admins, problems, submissions, recentLogs] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    Problem.countDocuments({}),
    Submission.countDocuments({}),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return {
    counts: { users, admins, problems, submissions },
    recentActivity: recentLogs.map((l: any) => ({
      id: String(l._id),
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      actorId: String(l.actorId),
      createdAt: l.createdAt,
    })),
  };
}

export async function listAuditLog(opts: { page?: number; limit?: number; action?: string }) {
  const filter: Record<string, unknown> = {};
  if (opts.action) filter.action = opts.action;
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, total, page, limit };
}

export async function addModuleProblemSlugAdmin(
  ctx: AdminContext,
  goalId: string,
  moduleId: string,
  slug: string
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const module = (doc.modules as any[]).find((item) => item.moduleId === moduleId);
  if (!module) throw ApiError.notFound('Module not found');

  const normalized = slug.trim();
  if (!normalized) throw ApiError.badRequest('Problem slug is required');

  // Verify problem exists
  const problem = await Problem.findOne({ slug: normalized }).select('_id').lean();
  if (!problem) throw ApiError.notFound(`Problem "${normalized}" not found`);

  if (!(module.problemSlugs ?? []).includes(normalized)) {
    module.problemSlugs = [...(module.problemSlugs ?? []), normalized];
  }

  await doc.save();
  await logAction(ctx, 'goal_template.module_problem_add', 'Goal', goalId, { moduleId, slug: normalized });
  return goalToJSON(doc.toObject());
}

export async function removeModuleProblemSlugAdmin(
  ctx: AdminContext,
  goalId: string,
  moduleId: string,
  slug: string
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const module = (doc.modules as any[]).find((item) => item.moduleId === moduleId);
  if (!module) throw ApiError.notFound('Module not found');

  module.problemSlugs = (module.problemSlugs ?? []).filter((s: string) => s !== slug);

  await doc.save();
  await logAction(ctx, 'goal_template.module_problem_remove', 'Goal', goalId, { moduleId, slug });
  return goalToJSON(doc.toObject());
}

export async function deleteRecommendedGoalModuleAdmin(
  ctx: AdminContext,
  goalId: string,
  moduleId: string
) {
  ensureObjectId(goalId, 'Template');
  const doc = await Goal.findOne({ _id: goalId, isPublic: true });
  if (!doc) throw ApiError.notFound('Template not found');

  const modules = doc.modules as any[];
  const idx = modules.findIndex((item) => item.moduleId === moduleId);
  if (idx < 0) throw ApiError.notFound('Module not found');

  const removed = modules[idx];
  modules.splice(idx, 1);
  doc.estimatedHours = modules.reduce((sum, item) => sum + Number(item.estimatedHours ?? 0), 0);

  await doc.save();
  await logAction(ctx, 'goal_template.module_delete', 'Goal', goalId, { moduleId, title: removed.title });
  return goalToJSON(doc.toObject());
}
