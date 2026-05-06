import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ExtensionToken } from '../models/ExtensionToken.js';
import { Contest } from '../models/Contest.js';
import { UserContest } from '../models/UserContest.js';
import { parseExternalUrl } from '../extractors/urlParser.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * UNauthenticated route hit by the browser extension. Auth is via the pairing
 * token in `X-LearnHub-Token` (one per user, mintable + revocable below).
 *
 * NOTE: This route MUST be registered before any `requireAuth` middleware on
 * this router — Express runs middleware in declaration order.
 */

const eventSchema = z.object({
  platform: z.string().max(20),
  problemUrl: z.string().min(8).max(500),
  verdict: z.string().max(80),
  rawVerdict: z.string().max(200).optional(),
  language: z.string().max(60).optional(),
  submissionUrl: z.string().max(500).optional(),
  timestamp: z.number(),
  location: z.string().max(500).optional(),
});

router.post(
  '/submission-event',
  validateBody(eventSchema),
  asyncHandler(async (req, res) => {
    const headerToken = String(req.header('x-learnhub-token') || '').trim();
    if (!headerToken) throw ApiError.unauthorized('Missing X-LearnHub-Token');
    const tok = await ExtensionToken.findOne({ token: headerToken, revokedAt: null });
    if (!tok) throw ApiError.unauthorized('Invalid or revoked token');

    void ExtensionToken.updateOne({ _id: tok._id }, { $set: { lastUsedAt: new Date() } }).catch(
      () => undefined
    );

    const userId = tok.userId as unknown as Types.ObjectId;
    const evt = req.body as z.infer<typeof eventSchema>;

    const parsed = parseExternalUrl(evt.problemUrl);
    if (!parsed || !parsed.problemId) {
      logger.debug({ url: evt.problemUrl }, 'extension event with unrecognized URL');
      return res.json({ accepted: false, reason: 'unrecognized URL' });
    }

    const now = new Date();
    const userContests = await UserContest.find({
      userId,
      status: { $in: ['registered', 'live'] },
    });
    if (userContests.length === 0) {
      return res.json({ accepted: true, matched: 0 });
    }
    const contestIds = userContests.map((u: any) => u.contestId);
    const contests = await Contest.find({
      _id: { $in: contestIds },
      platform: parsed.platform,
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();
    if (contests.length === 0) {
      return res.json({ accepted: true, matched: 0 });
    }

    const contestById = new Map(contests.map((c: any) => [String(c._id), c]));
    let matched = 0;

    for (const reg of userContests) {
      const c = contestById.get(String(reg.contestId));
      if (!c) continue;

      let idx: string | null = null;
      const indices: string[] = (c.problems ?? []).map((p: any) => p.index);
      if (parsed.platform === 'codeforces') {
        const ext = String(c.externalId);
        if (parsed.problemId.startsWith(ext)) {
          const tail = parsed.problemId.slice(ext.length).toUpperCase();
          if (indices.includes(tail)) idx = tail;
        }
      } else if (indices.includes(parsed.problemId)) {
        idx = parsed.problemId;
      }
      if (!idx) continue;

      const verdict = normalizeVerdict(evt.verdict);
      const start = new Date(c.startTime);
      const timeFromStartSec = Math.max(
        0,
        Math.round((evt.timestamp - start.getTime()) / 1000)
      );

      const dupKey = `${idx}|${verdict}|${timeFromStartSec}`;
      const exists = (reg.submissions ?? []).some(
        (s: any) => `${s.problemIndex}|${s.verdict}|${s.timeFromStartSec}` === dupKey
      );
      if (exists) continue;

      reg.submissions.push({
        problemIndex: idx,
        verdict,
        timeFromStartSec,
        code: '',
        language: evt.language ?? '',
        runtimeMs: 0,
      } as any);
      if (reg.status === 'registered') reg.status = 'live';
      await reg.save();
      matched++;
    }

    res.json({ accepted: true, matched });
  })
);

/**
 * Authenticated routes — used by the LearnHub web UI to mint / list / revoke
 * extension pairing tokens. Mounted AFTER the unauthenticated event route so
 * the requireAuth middleware doesn't intercept extension POSTs.
 */
router.use(requireAuth);

router.get(
  '/tokens',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const tokens = await ExtensionToken.find({
      userId: new Types.ObjectId(req.userId),
      revokedAt: null,
    })
      .select('token label lastUsedAt createdAt')
      .lean();
    res.json({
      tokens: tokens.map((t: any) => ({
        id: String(t._id),
        label: t.label,
        tokenPreview: `${String(t.token).slice(0, 6)}…`,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
      })),
    });
  })
);

router.post(
  '/tokens',
  validateBody(z.object({ label: z.string().max(80).optional() })),
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const token = crypto.randomBytes(24).toString('hex');
    const doc = await ExtensionToken.create({
      userId: new Types.ObjectId(req.userId),
      token,
      label: req.body?.label || 'Browser extension',
    });
    res.json({
      id: String(doc._id),
      token,
      label: doc.label,
      createdAt: (doc as any).createdAt,
    });
  })
);

router.delete(
  '/tokens/:id',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    if (!Types.ObjectId.isValid(req.params.id)) {
      throw ApiError.notFound('Token not found');
    }
    await ExtensionToken.updateOne(
      { _id: new Types.ObjectId(req.params.id), userId: new Types.ObjectId(req.userId) },
      { $set: { revokedAt: new Date() } }
    );
    res.status(204).end();
  })
);

function normalizeVerdict(v: string): string {
  const s = (v ?? '').trim().toLowerCase();
  if (/^accept|^ac$/.test(s)) return 'AC';
  if (/^wrong|^wa/.test(s)) return 'WA';
  if (/time limit|^tle/.test(s)) return 'TLE';
  if (/memory limit|^mle/.test(s)) return 'MLE';
  if (/runtime|^re/.test(s)) return 'RE';
  if (/compil|^ce/.test(s)) return 'CE';
  return v.toUpperCase();
}

export default router;
