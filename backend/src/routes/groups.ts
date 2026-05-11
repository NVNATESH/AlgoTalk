import { Router } from 'express';
import * as c from '../controllers/groupController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Group CRUD + membership
router.get('/', c.listMine);
router.get('/explore', c.listPublic);
router.post('/', validateBody(c.createSchema), c.create);
router.post('/join', validateBody(c.joinSchema), c.joinByCode);

router.get('/:id', c.get);
router.delete('/:id', c.remove);
router.post('/:id/join', c.joinPublicById);
router.post('/:id/leave', c.leave);
router.delete('/:id/members/:userId', c.removeMember);

// Challenges nested under group
router.get('/:id/challenges', c.listChallenges);
router.post('/:id/challenges', validateBody(c.postChallengeSchema), c.postChallenge);
router.get('/:id/leaderboard', c.leaderboard);

// Single challenge by id (groupId param still required by route to enforce membership cleanly)
router.get('/:id/challenges/:challengeId', c.getChallenge);
router.post(
  '/:id/challenges/:challengeId/respond',
  validateBody(c.respondSchema),
  c.respondAptitude
);
router.delete('/:id/challenges/:challengeId', c.deleteChallenge);
router.post('/:id/challenges/:challengeId/verify', c.verifyExternal);

// Meet system — challenge-anchored pair-coding requests that create a Room on accept
router.get('/:id/meets', c.listMeets);
router.post('/:id/meets', validateBody(c.requestMeetSchema), c.requestMeet);
router.post('/:id/meets/:meetId/accept', c.acceptMeet);
router.post('/:id/meets/:meetId/cancel', c.cancelMeet);

// Pinned active meeting per group (at most one)
router.get('/:id/active-meeting', c.activeMeeting);
router.post('/:id/active-meeting/end', c.endMeeting);

export default router;
