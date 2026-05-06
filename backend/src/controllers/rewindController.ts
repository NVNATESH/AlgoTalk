import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/rewindService.js';
import * as ai from '../services/rewindAiService.js';

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const parsed = yearQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Invalid year');
  const year = parsed.data.year ?? new Date().getFullYear();
  const data = await svc.getRewindForYear(req.userId, year);
  res.json({ rewind: data });
});

export const insightsSchema = z.object({
  year: z.number().int().min(2000).max(3000).optional(),
});

export const insights = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const year = req.body.year ?? new Date().getFullYear();
  const result = await ai.generateRewindInsights(req.userId, year);
  res.json(result);
});
