import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { weeklyReport, dashboardReport, goalReport } from '../controllers/reportController.js';

const r = Router();

r.get('/weekly', requireAuth, asyncHandler(weeklyReport));
r.get('/dashboard', requireAuth, asyncHandler(dashboardReport));
r.get('/goal/:goalId', requireAuth, asyncHandler(goalReport));

export default r;
