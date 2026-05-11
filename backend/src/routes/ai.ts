import { Router } from 'express';
import * as mentor from '../controllers/mentorController.js';
import * as pai from '../controllers/problemAiController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/mentor', mentor.getConversation);
router.delete('/mentor', mentor.clearConversation);
router.post('/mentor', aiLimiter, validateBody(mentor.sendSchema), mentor.sendMessage);

// Problem-solving AI helpers
router.post('/hint', aiLimiter, validateBody(pai.hintSchema), pai.hint);
router.post('/explain', aiLimiter, validateBody(pai.explainSchema), pai.explain);
router.post('/explain-code', aiLimiter, validateBody(pai.explainCodeSchema), pai.explainCode);
router.post('/optimize', aiLimiter, validateBody(pai.optimizeSchema), pai.optimize);
router.post('/upsolve', aiLimiter, validateBody(pai.upsolveSchema), pai.upsolve);

export default router;
