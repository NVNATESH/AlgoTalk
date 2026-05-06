import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as svc from '../services/problemAiService.js';

const langSchema = z.enum(['python', 'javascript', 'java', 'cpp']);

export const hintSchema = z.object({
  slug: z.string().min(1),
  code: z.string().max(100_000).optional(),
});

export const explainSchema = z.object({
  slug: z.string().min(1),
});

export const explainCodeSchema = z.object({
  slug: z.string().min(1),
  code: z.string().min(1).max(100_000),
  language: langSchema,
});

export const optimizeSchema = z.object({
  slug: z.string().min(1),
  code: z.string().min(1).max(100_000),
  language: langSchema,
});

export const hint = asyncHandler(async (req, res) => {
  const out = await svc.generateHint(req.body.slug, req.body.code);
  res.json(out);
});

export const explain = asyncHandler(async (req, res) => {
  const out = await svc.generateExplanation(req.body.slug);
  res.json(out);
});

export const explainCode = asyncHandler(async (req, res) => {
  const out = await svc.generateCodeExplanation(req.body.slug, req.body.code, req.body.language);
  res.json(out);
});

export const optimize = asyncHandler(async (req, res) => {
  const out = await svc.generateOptimization(req.body.slug, req.body.code, req.body.language);
  res.json(out);
});
