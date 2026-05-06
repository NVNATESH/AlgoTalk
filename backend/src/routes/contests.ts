import { Router } from 'express';
import * as c from '../controllers/contestController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/upcoming', c.listUpcoming);
router.get('/live', c.listLive);
router.get('/mine', c.listMine);
router.post('/refresh', c.refresh); // admin: manually re-pull from kontests.net

router.post('/:id/register', c.register);
router.delete('/:id/register', c.unregister);
router.post('/:id/analyze', aiLimiter, validateBody(c.analyzeSchema), c.analyze);
router.get('/:id/report', c.getReport);

export default router;
