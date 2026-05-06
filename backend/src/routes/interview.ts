import { Router } from 'express';
import * as c from '../controllers/interviewController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.post('/', aiLimiter, validateBody(c.startSchema), c.start);

router.get('/:id', c.get);
router.delete('/:id', c.remove);

router.patch('/:id/code', validateBody(c.saveCodeSchema), c.saveCode);
router.post('/:id/approach', aiLimiter, validateBody(c.approachSchema), c.approach);
router.post('/:id/submit', aiLimiter, validateBody(c.submitSchema), c.submit);
router.post('/:id/follow-up', aiLimiter, validateBody(c.followUpSchema), c.followUp);
router.post('/:id/end', c.endSession);

export default router;
