import { Router } from 'express';
import * as c from '../controllers/rewindController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.get);
router.post('/insights', aiLimiter, validateBody(c.insightsSchema), c.insights);

export default router;
