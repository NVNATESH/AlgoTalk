import { Router } from 'express';
import * as c from '../controllers/analyzerController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', c.overview);
router.post('/progress', aiLimiter, c.analyzeProgress);
router.post('/code', aiLimiter, validateBody(c.analyzeCodeSchema), c.analyzeCode);
router.post('/recommend', aiLimiter, c.recommend);
router.post('/recommend/cross-platform', aiLimiter, c.recommendCrossPlatform);

export default router;
