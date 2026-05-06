import { Router } from 'express';
import * as c from '../controllers/problemController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.get('/companies', c.companies);
router.get('/:slug', c.getBySlug);
router.post('/:slug/run', validateBody(c.runSchema), c.run);
router.post('/:slug/submit', validateBody(c.submitSchema), c.submit);
router.get('/:slug/submissions', c.submissions);

// Code review (Module 11)
router.get('/:slug/submissions/:submissionId/review', c.getReview);
router.post(
  '/:slug/submissions/:submissionId/review',
  aiLimiter,
  validateBody(c.reviewSchema),
  c.generateReview
);

// Admin: bulk-estimate CF-equivalent ratings for all problems via Gemini.
router.post(
  '/admin/estimate-ratings',
  aiLimiter,
  validateBody(c.estimateRatingsSchema),
  c.estimateRatings
);

export default router;
