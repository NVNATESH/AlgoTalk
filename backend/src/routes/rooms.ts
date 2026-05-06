import { Router } from 'express';
import * as c from '../controllers/roomController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.listMine);
router.post('/', validateBody(c.createSchema), c.create);
router.post('/join', validateBody(c.joinByCodeSchema), c.joinByCode);

router.get('/:id', c.get);
router.delete('/:id', c.remove);
router.get('/:id/participants', c.participants);
router.post('/:id/join', c.joinById);
router.post('/:id/leave', c.leave);
router.post('/:id/grant-write', validateBody(c.grantSchema), c.grant);
router.post('/:id/revoke-write', validateBody(c.grantSchema), c.revoke);

router.get('/:id/snapshots', c.listSnapshots);

export default router;
