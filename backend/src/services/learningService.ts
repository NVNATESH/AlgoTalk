import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { LearningContent, contentToJSON } from '../models/LearningContent.js';
import { Goal, goalToJSON } from '../models/Goal.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON } from './gemini.js';
import { emitNotification } from './notificationService.js';
import {
  conceptsPrompt,
  quizPrompt,
  type ConceptsResponse,
  type GeneratedQuestion,
  type ModuleContext,
} from '../prompts/learning.js';

const PASS_THRESHOLD = 70; // percentage
const XP_PER_POINT = 5;
const XP_PASS_BONUS = 50;

async function loadGoalAndModule(userId: string, goalId: string, moduleId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw ApiError.notFound('Goal not found');
  const mod = goal.modules.find((m: any) => m.moduleId === moduleId);
  if (!mod) throw ApiError.notFound('Module not found');
  return { goal, mod };
}

function buildModuleContext(goal: any, mod: any): ModuleContext {
  return {
    goalName: goal.name,
    goalDifficulty: goal.difficulty,
    moduleTitle: mod.title,
    moduleDescription: mod.description,
    topics: mod.topics ?? [],
    difficulty: mod.difficulty,
  };
}

export async function getOrGenerateContent(
  userId: string,
  goalId: string,
  moduleId: string,
  opts: { force?: boolean } = {}
) {
  const existing = await LearningContent.findOne({ userId, goalId, moduleId });
  if (existing && !opts.force) {
    return contentToJSON(existing.toObject());
  }

  const { goal, mod } = await loadGoalAndModule(userId, goalId, moduleId);
  const ctx = buildModuleContext(goal, mod);

  // run concepts + quiz in parallel
  const [concepts, quizResp] = await Promise.all([
    geminiJSON<ConceptsResponse>(conceptsPrompt(ctx)),
    geminiJSON<{ questions: GeneratedQuestion[] }>(quizPrompt(ctx)),
  ]);

  if (!concepts?.concepts) {
    throw ApiError.badRequest('AI returned an empty concepts payload');
  }
  if (!quizResp?.questions?.length) {
    throw ApiError.badRequest('AI returned an empty quiz');
  }

  const validQuestions = quizResp.questions
    .filter(isStructurallyValid)
    .map((q, i) => ({ ...q, id: q.id || `q${i + 1}`, points: q.points ?? 1 }));

  if (validQuestions.length < 4) {
    throw ApiError.badRequest('AI quiz had too few valid questions — try regenerating');
  }

  const update = {
    userId,
    goalId,
    moduleId,
    concepts: concepts.concepts,
    examples: (concepts.examples ?? []).slice(0, 5),
    quiz: validQuestions,
    generatedAt: new Date(),
    generationVersion: (existing?.generationVersion ?? 0) + 1,
  };

  const saved = await LearningContent.findOneAndUpdate(
    { userId, goalId, moduleId },
    {
      $set: update,
      ...(existing ? {} : { $setOnInsert: { quizAttempts: [], bestPercentage: 0 } }),
    },
    { upsert: true, new: true }
  );

  return contentToJSON(saved!.toObject());
}

function isStructurallyValid(q: GeneratedQuestion): boolean {
  if (!q?.type || !q.prompt) return false;
  switch (q.type) {
    case 'mcq_single':
      return Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctIndex === 'number';
    case 'mcq_multi':
      return (
        Array.isArray(q.options) &&
        q.options.length >= 3 &&
        Array.isArray(q.correctIndices) &&
        q.correctIndices.length >= 1
      );
    case 'fill_blank':
      return Array.isArray(q.blanks) && q.blanks.length >= 1 && q.blanks.every((b) => typeof b === 'string' && b.trim().length > 0);
    case 'match':
      return Array.isArray(q.pairs) && q.pairs.length >= 2 && q.pairs.every((p) => p.left && p.right);
    case 'true_false':
      return typeof q.correct === 'boolean';
    default:
      return false;
  }
}

export interface SubmitAnswers {
  [questionId: string]:
    | { type: 'mcq_single'; choice: number }
    | { type: 'mcq_multi'; choices: number[] }
    | { type: 'fill_blank'; values: string[] }
    | { type: 'match'; pairs: Array<{ left: string; right: string }> }
    | { type: 'true_false'; value: boolean };
}

export interface QuestionResult {
  id: string;
  type: string;
  correct: boolean;
  pointsEarned: number;
  pointsAvailable: number;
  explanation: string;
  // type-specific reveal info
  expected: unknown;
}

export async function submitQuiz(
  userId: string,
  goalId: string,
  moduleId: string,
  answers: SubmitAnswers
) {
  const content = await LearningContent.findOne({ userId, goalId, moduleId });
  if (!content) throw ApiError.notFound('Generate the quiz before submitting');

  const results: QuestionResult[] = [];
  let earned = 0;
  let max = 0;

  for (const q of content.quiz as any[]) {
    const pointsAvailable = q.points ?? 1;
    max += pointsAvailable;
    const ans = answers[q.id];
    let correct = false;

    if (ans && ans.type === q.type) {
      correct = grade(q, ans);
    }

    if (correct) earned += pointsAvailable;
    results.push({
      id: q.id,
      type: q.type,
      correct,
      pointsEarned: correct ? pointsAvailable : 0,
      pointsAvailable,
      explanation: q.explanation || '',
      expected: revealExpected(q),
    });
  }

  const percentage = max === 0 ? 0 : Math.round((earned / max) * 100);
  const passed = percentage >= PASS_THRESHOLD;

  // XP: per-point reward + first-time-pass bonus
  let xp = earned * XP_PER_POINT;
  const firstPass = passed && (content.bestPercentage ?? 0) < PASS_THRESHOLD;
  if (firstPass) xp += XP_PASS_BONUS;

  content.quizAttempts.push({
    attemptedAt: new Date(),
    score: earned,
    maxScore: max,
    percentage,
    passed,
    xpAwarded: xp,
  } as any);
  content.bestPercentage = Math.max(content.bestPercentage ?? 0, percentage);
  await content.save();

  // sync into goal module + award XP on user
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (goal) {
    const m = goal.modules.find((m: any) => m.moduleId === moduleId);
    if (m) {
      m.quizScore = Math.max(m.quizScore ?? 0, percentage);
      goal.lastActivityAt = new Date();
      await goal.save();
    }
  }

  if (xp > 0) {
    await User.updateOne({ _id: userId }, { $inc: { xp } });
  }

  // Notification on first-time pass
  if (firstPass) {
    const moduleTitle =
      goal?.modules.find((m: any) => m.moduleId === moduleId)?.title ?? 'this module';
    void emitNotification({
      userId,
      type: 'quiz_passed',
      title: `Quiz passed — ${moduleTitle}`,
      message: `Scored ${percentage}% · +${xp} XP earned`,
      icon: '🧠',
      link: `/goals/${goalId}/modules/${moduleId}`,
      priority: 'medium',
      metadata: { goalId, moduleId, percentage, xpAwarded: xp },
    });
  }

  return {
    score: earned,
    maxScore: max,
    percentage,
    passed,
    passThreshold: PASS_THRESHOLD,
    xpAwarded: xp,
    firstPass,
    bestPercentage: content.bestPercentage,
    attemptCount: content.quizAttempts.length,
    results,
  };
}

function grade(q: any, ans: any): boolean {
  switch (q.type) {
    case 'mcq_single':
      return ans.choice === q.correctIndex;
    case 'mcq_multi': {
      const a = new Set<number>(ans.choices ?? []);
      const c = new Set<number>(q.correctIndices ?? []);
      if (a.size !== c.size) return false;
      for (const v of a) if (!c.has(v)) return false;
      return true;
    }
    case 'fill_blank': {
      const expected: string[] = q.blanks ?? [];
      const got: string[] = ans.values ?? [];
      if (expected.length !== got.length) return false;
      return expected.every((e: string, i: number) => {
        const accepted = e.split('|').map((s) => normalize(s));
        return accepted.includes(normalize(got[i] ?? ''));
      });
    }
    case 'match': {
      const expected = (q.pairs as Array<{ left: string; right: string }>) ?? [];
      const got = (ans.pairs as Array<{ left: string; right: string }>) ?? [];
      if (got.length !== expected.length) return false;
      // map left -> right
      const expectedMap = new Map<string, string>(expected.map((p) => [p.left, p.right]));
      return got.every((p) => expectedMap.get(p.left) === p.right);
    }
    case 'true_false':
      return ans.value === q.correct;
    default:
      return false;
  }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function revealExpected(q: any): unknown {
  switch (q.type) {
    case 'mcq_single':
      return { correctIndex: q.correctIndex, correctOption: q.options?.[q.correctIndex] };
    case 'mcq_multi':
      return {
        correctIndices: q.correctIndices,
        correctOptions: (q.correctIndices ?? []).map((i: number) => q.options?.[i]),
      };
    case 'fill_blank':
      return { acceptedAnswers: q.blanks };
    case 'match':
      return { pairs: q.pairs };
    case 'true_false':
      return { correct: q.correct };
    default:
      return null;
  }
}
