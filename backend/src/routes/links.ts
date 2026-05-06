import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { parseExternalUrl } from '../extractors/urlParser.js';
import { fetchLeetCodeProblemMeta } from '../extractors/leetcode.js';

const router = Router();

router.use(requireAuth);

const bodySchema = z.object({ url: z.string().min(8).max(500) });

router.post(
  '/parse',
  validateBody(bodySchema),
  asyncHandler(async (req, res) => {
    const parsed = parseExternalUrl(req.body.url);
    if (!parsed) {
      throw ApiError.badRequest('Unrecognized URL — supported: LeetCode, Codeforces, CodeChef, HackerRank, AtCoder, GFG, HackerEarth');
    }
    res.json({ parsed });
  })
);

/**
 * Same as parse, plus a best-effort fetch of upstream metadata (title, tags,
 * difficulty) — currently wired for LeetCode only since LC has a clean
 * GraphQL surface; other platforms would each need a dedicated meta fetcher.
 */
router.post(
  '/resolve',
  validateBody(bodySchema),
  asyncHandler(async (req, res) => {
    const parsed = parseExternalUrl(req.body.url);
    if (!parsed) {
      throw ApiError.badRequest('Unrecognized URL');
    }

    let meta: { title?: string; difficulty?: string; tags?: string[] } = {};
    if (parsed.platform === 'leetcode' && parsed.problemId) {
      try {
        const m = await fetchLeetCodeProblemMeta(parsed.problemId);
        if (m) {
          meta = {
            title: parsed.problemId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            difficulty: m.difficulty,
            tags: m.topics,
          };
        }
      } catch {
        // upstream fetch failed — return parsed URL only
      }
    }

    res.json({ parsed, meta });
  })
);

export default router;
