import { Router } from 'express';
import * as c from '../controllers/badgeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/catalog', c.catalog);

router.use(requireAuth);
router.get('/me', c.mine);
router.get('/user/:username', c.ofUser);

export default router;
