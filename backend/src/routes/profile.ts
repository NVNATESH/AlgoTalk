import { Router } from 'express';
import * as c from '../controllers/profileController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// PATCH /me requires auth; GET requires auth too (so we can mark isSelf and show email)
router.use(requireAuth);

router.patch('/me', validateBody(c.updateSchema), c.updateMe);
router.get('/:username', c.getByUsername);
router.get('/:username/followers', c.listFollowers);
router.get('/:username/following', c.listFollowing);
router.post('/:username/follow', c.follow);
router.delete('/:username/follow', c.unfollow);

export default router;
