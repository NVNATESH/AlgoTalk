import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getTodayMissions,
  getLeaderboard,
  getWeeklyLeaderboard,
} from '../services/dailyMissionService.js';
import { createFromAIPlan } from '../controllers/aiPlanController.js';

const r = Router();

// Daily missions
r.get('/missions/today', requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const missions = await getTodayMissions(userId);
  res.json({ missions });
}));

// Leaderboard
r.get('/leaderboard', requireAuth, asyncHandler(async (req, res) => {
  const type = req.query.type === 'weekly' ? 'weekly' : 'global';
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const data = type === 'weekly'
    ? await getWeeklyLeaderboard(limit)
    : await getLeaderboard(limit);
  res.json({ leaderboard: data, type });
}));

// AI Plan to Goal
r.post('/from-ai-plan', requireAuth, asyncHandler(createFromAIPlan));

export default r;
