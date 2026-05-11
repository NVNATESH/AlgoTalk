import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/rewindService.js';
import * as ai from '../services/rewindAiService.js';
import { getPlatformDashboard } from '../services/integrationService.js';
import { computeOverview } from '../services/analyzerService.js';

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

const rangeQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('week'),
  // Optional anchor — defaults to today. ISO date or YYYY-MM-DD.
  anchor: z.string().optional(),
});

export const getRange = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const parsed = rangeQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Invalid query');
  const anchor = parsed.data.anchor ? new Date(parsed.data.anchor) : new Date();
  if (Number.isNaN(anchor.getTime())) throw ApiError.badRequest('Invalid anchor date');
  const data = await svc.getRewindForRange(req.userId, parsed.data.period, anchor);
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

/**
 * Aggregated dashboard payload for the centralized Rewind page (#10):
 *   - per-platform stats (LeetCode/CF/CC/HR/AtCoder…)
 *   - topic mastery + heatmap + rating distribution from analyzer overview
 * Returned in one call so the dashboard renders without a fan-out from the
 * client.
 */
export const dashboard = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const [platforms, overview] = await Promise.all([
    getPlatformDashboard(req.userId),
    computeOverview(req.userId).catch(() => null),
  ]);
  res.setHeader('Cache-Control', 'private, max-age=20');
  res.json({
    platforms,
    overview: overview
      ? {
          topicMastery: overview.topicMastery,
          peakHours: overview.peakHours,
          peakHourMax: overview.peakHourMax,
          bestHourBucket: overview.bestHourBucket,
          ratingDistribution: overview.ratingDistribution,
          byLanguage: overview.byLanguage,
          failurePatterns: overview.failurePatterns,
        }
      : null,
  });
});
