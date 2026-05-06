import { Router } from 'express';
import * as c from '../controllers/codeReviewController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.listMine);
router.get('/unreviewed', c.unreviewed);
router.get('/:id', c.getOne);

export default router;
