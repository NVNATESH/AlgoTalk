import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/integrationService.js';
import { SUPPORTED_PLATFORMS } from '../models/Integration.js';
import { getSchedulerStatus } from '../services/syncScheduler.js';

const platformSchema = z.enum(SUPPORTED_PLATFORMS);

export const list = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const integrations = await svc.listIntegrations(req.userId);
  res.json({ integrations });
});

export const connectSchema = z.object({
  platform: platformSchema,
  handle: z.string().min(1).max(60),
});

export const connect = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const integration = await svc.connect(req.userId, req.body.platform, req.body.handle);
  res.status(201).json({ integration });
});

export const disconnect = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const platform = platformSchema.safeParse(req.params.platform);
  if (!platform.success) throw ApiError.badRequest('Invalid platform');
  await svc.disconnect(req.userId, platform.data);
  res.status(204).end();
});

export const sync = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const platform = platformSchema.safeParse(req.params.platform);
  if (!platform.success) throw ApiError.badRequest('Invalid platform');
  const result = await svc.manualSync(req.userId, platform.data);
  res.json(result);
});

export const submissions = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const platformParam =
    typeof req.query.platform === 'string' ? req.query.platform : undefined;
  const platform = platformParam ? platformSchema.safeParse(platformParam) : null;
  const status =
    typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const out = await svc.listSubmissions(req.userId, {
    platform: platform && platform.success ? platform.data : undefined,
    status,
    limit,
  });
  res.json({ submissions: out });
});

export const stats = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const stats = await svc.getExtractionStats(req.userId);
  res.json({ stats });
});

export const schedulerStatus = asyncHandler(async (_req, res) => {
  res.json({ scheduler: getSchedulerStatus() });
});

export const lastByPlatform = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const platforms = await svc.getLastSubmissionPerPlatform(req.userId);
  res.json({ platforms });
});

export const heatmap = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const days = req.query.days ? Math.max(30, Math.min(366, Number(req.query.days))) : 365;
  const out = await svc.getCrossPlatformHeatmap(req.userId, days);
  res.json(out);
});
