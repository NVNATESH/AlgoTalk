import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import * as svc from '../services/badgeService.js';
import { BADGES } from '../services/badgeCatalog.js';

/** GET /api/badges/catalog — public list of all badges (no auth-specific data). */
export const catalog = asyncHandler(async (_req, res) => {
  res.json({
    badges: BADGES.map((b) => ({
      key: b.key,
      name: b.name,
      description: b.description,
      icon: b.icon,
      tier: b.tier,
      category: b.category,
    })),
  });
});

/** GET /api/badges/me — auth required, runs check-and-award then returns full badge state. */
export const mine = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const result = await svc.checkAndAwardBadges(req.userId);
  res.json(result);
});

/** GET /api/badges/user/:username — public, read-only earned badges for someone else. */
export const ofUser = asyncHandler(async (req, res) => {
  const username = req.params.username?.toLowerCase().trim();
  if (!username) throw ApiError.badRequest('Username required');
  const user = await User.findOne({ username }).select('_id').lean();
  if (!user) throw ApiError.notFound('User not found');
  const badges = await svc.listEarnedBadges(String(user._id));
  res.json({ badges });
});
