import { Router } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

const router = Router();
router.use(requireAuth);

/**
 * Active session audit log. Each successful login creates a row here. The
 * underlying refresh token system is per-user (one `refreshTokenVersion`),
 * so revoking a single session today bumps that counter and signs everyone
 * out — same outcome as `revoke-all`. We still expose the per-row endpoint
 * because the user-facing semantics are unambiguous ("invalidate this login")
 * and the model can carry per-session granularity later without a contract
 * break.
 */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const user = await User.findById(req.userId).select('refreshTokenVersion').lean();
    const currentVersion = user?.refreshTokenVersion ?? 0;
    const rows = await Session.find({
      userId: new Types.ObjectId(req.userId),
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
    res.json({
      sessions: rows.map((r: any) => ({
        id: String(r._id),
        device: r.device || 'Unknown device',
        ip: r.ip,
        // A session whose tokenVersion no longer matches the user's current
        // version is effectively dead — surface that in the UI.
        active: (r.tokenVersion ?? 0) === currentVersion,
        createdAt: r.createdAt,
        lastSeenAt: r.lastSeenAt,
      })),
    });
  })
);

router.delete(
  '/all',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    await User.updateOne(
      { _id: new Types.ObjectId(req.userId) },
      { $inc: { refreshTokenVersion: 1 } }
    );
    await Session.updateMany(
      { userId: new Types.ObjectId(req.userId), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    res.json({ ok: true });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    if (!Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Session not found');
    const session = await Session.findOne({
      _id: req.params.id,
      userId: new Types.ObjectId(req.userId),
    });
    if (!session) throw ApiError.notFound('Session not found');
    // Bumping refreshTokenVersion invalidates every token for this user. With
    // the current single-counter scheme that's the only way to actually log
    // a session out — see the file header for why.
    await User.updateOne(
      { _id: new Types.ObjectId(req.userId) },
      { $inc: { refreshTokenVersion: 1 } }
    );
    session.revokedAt = new Date();
    await session.save();
    res.status(204).end();
  })
);

export default router;
