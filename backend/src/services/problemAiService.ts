import { Problem } from '../models/Problem.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON, proModel } from './gemini.js';
import {
  hintPrompt,
  explainProblemPrompt,
  explainCodePrompt,
  optimizePrompt,
} from '../prompts/problem.js';

async function loadProblem(slug: string) {
  const p = await Problem.findOne({ slug }).lean();
  if (!p) throw ApiError.notFound('Problem not found');
  return p;
}

const ctxFromProblem = (p: any) => ({
  title: p.title,
  description: p.description,
  difficulty: p.difficulty,
  tags: p.tags ?? [],
});

export async function generateHint(slug: string, code?: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ hint: string }>(hintPrompt(ctxFromProblem(p), code));
  return out;
}

export async function generateExplanation(slug: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ explanation: string }>(explainProblemPrompt(ctxFromProblem(p)));
  return out;
}

export async function generateCodeExplanation(slug: string, code: string, language: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{ explanation: string }>(
    explainCodePrompt(ctxFromProblem(p), code, language)
  );
  return out;
}

export async function generateOptimization(slug: string, code: string, language: string) {
  const p = await loadProblem(slug);
  const out = await geminiJSON<{
    currentComplexity: { time: string; space: string };
    targetComplexity: { time: string; space: string };
    suggestions: string[];
    optimizedCode: string;
  }>(optimizePrompt(ctxFromProblem(p), code, language), { model: proModel() });
  return out;
}
