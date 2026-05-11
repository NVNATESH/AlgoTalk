import { Router } from 'express';
import * as c from '../controllers/goalController.js';
import * as l from '../controllers/learningController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.post('/', aiLimiter, validateBody(c.createGoalSchema), c.create);
router.post('/preview', aiLimiter, validateBody(c.previewSchema), c.preview);
// Single-segment literal route — must be declared BEFORE the catch-all `/:id`.
router.get('/burnout-status', c.burnoutStatus);

router.get('/:id', c.get);
router.delete('/:id', c.remove);
router.post('/:id/focus', c.focus);
router.post('/:id/unfocus', c.unfocus);
router.post('/:id/archive', c.archive);
router.post('/:id/pause', validateBody(c.pauseSchema), c.pause);
router.post('/:id/log-time', validateBody(c.logTimeSchema), c.logTime);
router.patch('/:id/dates', validateBody(c.updateDatesSchema), c.updateDates);

router.patch('/:id/modules/:moduleId', validateBody(c.moduleStatusSchema), c.updateModule);

// Module problems with solve status
router.get('/:id/modules/:moduleId/problems', c.moduleProblems);

// Module learning content + quiz
router.get('/:id/modules/:moduleId/content', aiLimiter, l.getContent);
router.post('/:id/modules/:moduleId/content/regenerate', aiLimiter, l.regenerate);
router.post(
  '/:id/modules/:moduleId/quiz/submit',
  validateBody(l.submitQuizSchema),
  l.submitQuiz
);

export default router;
