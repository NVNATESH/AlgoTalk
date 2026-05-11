import { Router } from 'express';
import * as c from '../controllers/rewindController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.get);
// New (Wave D): period-scoped + multi-platform aggregations. Coexists with the
// year-level GET / above so existing UI keeps working.
router.get('/range', c.getRange);
// Centralized historical dashboards (per-platform stats + analyzer rollup)
router.get('/dashboard', c.dashboard);
router.post('/insights', aiLimiter, validateBody(c.insightsSchema), c.insights);

export default router;
