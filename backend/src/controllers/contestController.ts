import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/contestService.js';
import { CONTEST_PLATFORMS } from '../models/Contest.js';

const platformQuery = z.enum(CONTEST_PLATFORMS).optional();

export const listUpcoming = asyncHandler(async (req, res) => {
  const platform = platformQuery.safeParse(req.query.platform);
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const contests = await svc.listUpcoming({
    platform: platform.success ? platform.data : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  res.json({ contests });
});

export const listLive = asyncHandler(async (req, res) => {
  const platform = platformQuery.safeParse(req.query.platform);
  const contests = await svc.listLive({
    platform: platform.success ? platform.data : undefined,
  });
  res.json({ contests });
});

export const listMine = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const items = await svc.listMyRegistrations(req.userId);
  res.json({ items });
});

export const register = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await svc.registerForContest(req.userId, req.params.id);
  res.json(out);
});

export const unregister = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.unregisterFromContest(req.userId, req.params.id);
  res.status(204).end();
});

export const analyzeSchema = z.object({ force: z.boolean().optional() });
export const analyze = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await svc.generateContestReport(req.userId, req.params.id, {
    force: !!req.body?.force,
  });
  res.json(out);
});

export const getReport = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const report = await svc.getReport(req.userId, req.params.id);
  res.json({ report });
});

export const refresh = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  if (req.userRole !== 'admin') throw ApiError.forbidden('Admin only');
  const out = await svc.refreshUpcoming();
  res.json(out);
});
