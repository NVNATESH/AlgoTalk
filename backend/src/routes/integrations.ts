import { Router } from 'express';
import * as c from '../controllers/integrationController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.post('/', validateBody(c.connectSchema), c.connect);
router.delete('/:platform', c.disconnect);
router.post('/:platform/sync', c.sync);

router.get('/submissions', c.submissions);
router.get('/stats', c.stats);
router.get('/scheduler', c.schedulerStatus);
router.get('/last-by-platform', c.lastByPlatform);
router.get('/heatmap', c.heatmap);
router.get('/sync-health', c.syncHealth);

export default router;
