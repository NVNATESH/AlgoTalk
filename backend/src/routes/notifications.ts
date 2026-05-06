import { Router } from 'express';
import * as c from '../controllers/notificationController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.post('/mark-read', validateBody(c.markReadSchema), c.markRead);
router.post('/mark-all-read', c.markAllRead);
router.post('/emit-test', c.emitTest); // admin-only diagnostic
router.delete('/all', c.clearAll);
router.delete('/:id', c.remove);

export default router;
