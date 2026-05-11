import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listRecommended,
  enrollInTemplate,
  listCompanyGoals,
  listQuestGoals,
  exportGoalMarkdown,
} from '../controllers/recommendedController.js';

const r = Router();

r.get('/recommended', requireAuth, asyncHandler(listRecommended));
r.post('/recommended/:templateId/enroll', requireAuth, asyncHandler(enrollInTemplate));
r.get('/company/:company', requireAuth, asyncHandler(listCompanyGoals));
r.get('/quests', requireAuth, asyncHandler(listQuestGoals));
r.get('/:goalId/export', requireAuth, asyncHandler(exportGoalMarkdown));

export default r;
