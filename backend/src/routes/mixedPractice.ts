import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { generateMixedPractice } from '../services/mixedPracticeService.js';

const router = Router();
router.use(requireAuth);

const generateSchema = z.object({
  topics: z.array(z.string().min(1).max(40)).min(1).max(6),
  difficulty: z.array(z.enum(['Easy', 'Medium', 'Hard'])).optional(),
  count: z.number().int().min(3).max(20).optional(),
  mode: z.enum(['practice', 'timed', 'contest']).optional(),
  durationMinutes: z.number().int().min(15).max(360).optional(),
  companies: z.array(z.string().min(1).max(40)).max(10).optional(),
});

router.post(
  '/generate',
  validateBody(generateSchema),
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const out = await generateMixedPractice(req.userId, req.body);
    res.json(out);
  })
);

export default router;
