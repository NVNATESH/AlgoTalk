import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/analyzerService.js';
import * as ai from '../services/analyzerAiService.js';

export const overview = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const overview = await svc.computeOverview(req.userId);
  res.json({ overview });
});

export const analyzeProgress = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await ai.analyzeProgress(req.userId);
  res.json(out);
});

export const analyzeCodeSchema = z.object({
  code: z.string().min(1).max(100_000),
  language: z.enum(['python', 'javascript', 'java', 'cpp']),
  problemSlug: z.string().min(1).max(100).optional(),
});

export const analyzeCode = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await ai.analyzeCode(req.body);
  res.json({ analysis: out });
});

export const recommend = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await ai.recommendNextProblem(req.userId);
  res.json(out);
});

export const recommendCrossPlatform = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await ai.recommendCrossPlatform(req.userId);
  res.json(out);
});
