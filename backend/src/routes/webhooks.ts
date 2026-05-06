import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Webhook, IncomingWebhookToken } from '../models/Webhook.js';
import { ExtractedSubmission } from '../models/ExtractedSubmission.js';
import { parseExternalUrl } from '../extractors/urlParser.js';
import {
  newIncomingToken,
  newWebhookSecret,
  recordIncomingUsage,
} from '../services/webhookService.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * UNauthenticated incoming webhook ingress.
 *
 *   POST /api/webhooks/incoming/:token
 *
 * Body shape (all optional except `kind`):
 *   { kind: 'submission' | 'event',
 *     platform?: string, problemUrl?: string, status?: string,
 *     language?: string, submittedAt?: string|number,
 *     payload?: any   // free-form for 'event' kind, stored as metadata }
 *
 * Power-user automation hook — lets users POST from n8n / Make / curl scripts
 * to log submissions or events on their account without going through OAuth.
 *
 * MUST be declared before `router.use(requireAuth)` below.
 */

const incomingSchema = z
  .object({
    kind: z.enum(['submission', 'event']).default('event'),
    platform: z.string().max(40).optional(),
    problemUrl: z.string().max(500).optional(),
    problemId: z.string().max(120).optional(),
    problemTitle: z.string().max(300).optional(),
    status: z.string().max(40).optional(),
    language: z.string().max(60).optional(),
    submittedAt: z.union([z.string(), z.number()]).optional(),
    payload: z.record(z.unknown()).optional(),
  })
  .passthrough();

router.post(
  '/incoming/:token',
  validateBody(incomingSchema),
  asyncHandler(async (req, res) => {
    const tok = await IncomingWebhookToken.findOne({
      token: req.params.token,
      active: true,
    }).lean();
    if (!tok) throw ApiError.unauthorized('Invalid or revoked incoming token');
    void recordIncomingUsage(String(tok._id));

    const body = req.body as z.infer<typeof incomingSchema>;

    if (body.kind === 'submission') {
      // Try to extract a real platform / problem ID from the URL when given.
      let platform = body.platform ?? '';
      let problemId = body.problemId ?? '';
      let problemUrl = body.problemUrl ?? '';
      if (problemUrl && (!platform || !problemId)) {
        const parsed = parseExternalUrl(problemUrl);
        if (parsed) {
          platform = platform || parsed.platform;
          problemId = problemId || parsed.problemId || '';
        }
      }
      if (!platform || !problemId) {
        return res
          .status(400)
          .json({ ok: false, error: 'submission requires platform + problemId (or a parseable problemUrl)' });
      }

      const submittedAt = body.submittedAt
        ? new Date(body.submittedAt as any)
        : new Date();
      const externalId = `webhook:${problemId}:${submittedAt.getTime()}`;

      try {
        await ExtractedSubmission.updateOne(
          { userId: tok.userId, platform, externalId },
          {
            $set: {
              userId: tok.userId,
              platform,
              externalId,
              problemId,
              problemTitle: body.problemTitle ?? problemId,
              problemUrl: problemUrl || '',
              status: (body.status ?? 'accepted').toLowerCase(),
              language: body.language ?? 'unknown',
              submittedAt,
              source: 'webhook',
            },
          },
          { upsert: true }
        );
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, userId: String(tok.userId) },
          'incoming webhook submission upsert failed'
        );
        // Still return 200 — don't let model errors break the integration.
      }
      return res.json({ ok: true, kind: 'submission', platform, problemId });
    }

    // Generic event — just acknowledged. The user's outgoing webhooks (if any
    // subscribed to `incoming.event`) will already have been notified upstream
    // by other systems; here we just log + ack.
    logger.info(
      { userId: String(tok.userId), payload: body.payload ?? {} },
      'incoming webhook event received'
    );
    res.json({ ok: true, kind: 'event' });
  })
);

// ---------------- Authenticated management routes ----------------
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const hooks = await Webhook.find({ userId: new Types.ObjectId(req.userId) })
      .select('-secret')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      webhooks: hooks.map((h: any) => ({
        id: String(h._id),
        url: h.url,
        label: h.label,
        events: h.events,
        active: h.active,
        lastDeliveredAt: h.lastDeliveredAt,
        lastStatus: h.lastStatus,
        failureCount: h.failureCount,
        createdAt: h.createdAt,
      })),
    });
  })
);

const createSchema = z.object({
  url: z.string().url(),
  label: z.string().max(80).optional(),
  events: z.array(z.string().min(1).max(80)).max(40).optional(),
});

router.post(
  '/',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const body = req.body as z.infer<typeof createSchema>;
    const secret = newWebhookSecret();
    const doc = await Webhook.create({
      userId: new Types.ObjectId(req.userId),
      url: body.url,
      label: body.label ?? '',
      events: body.events && body.events.length > 0 ? body.events : ['*'],
      secret,
    });
    // Secret is returned ONCE on creation. We never echo it on subsequent reads.
    res.status(201).json({
      id: String(doc._id),
      url: doc.url,
      label: doc.label,
      events: doc.events,
      active: doc.active,
      secret,
    });
  })
);

const patchSchema = z.object({
  active: z.boolean().optional(),
  events: z.array(z.string().min(1).max(80)).max(40).optional(),
  label: z.string().max(80).optional(),
});

router.patch(
  '/:id',
  validateBody(patchSchema),
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    if (!Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Webhook not found');
    const updated = await Webhook.findOneAndUpdate(
      { _id: req.params.id, userId: new Types.ObjectId(req.userId) },
      { $set: req.body },
      { new: true }
    )
      .select('-secret')
      .lean();
    if (!updated) throw ApiError.notFound('Webhook not found');
    res.json({ webhook: updated });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    if (!Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Webhook not found');
    const r = await Webhook.deleteOne({
      _id: req.params.id,
      userId: new Types.ObjectId(req.userId),
    });
    if (r.deletedCount === 0) throw ApiError.notFound('Webhook not found');
    res.status(204).end();
  })
);

// Incoming-token management
router.get(
  '/incoming-tokens',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const tokens = await IncomingWebhookToken.find({
      userId: new Types.ObjectId(req.userId),
      active: true,
    }).lean();
    res.json({
      tokens: tokens.map((t: any) => ({
        id: String(t._id),
        label: t.label,
        tokenPreview: `${String(t.token).slice(0, 6)}…`,
        lastUsedAt: t.lastUsedAt,
        usageCount: t.usageCount,
        createdAt: t.createdAt,
      })),
    });
  })
);

router.post(
  '/incoming-tokens',
  validateBody(z.object({ label: z.string().max(80).optional() })),
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    const token = newIncomingToken();
    const doc = await IncomingWebhookToken.create({
      userId: new Types.ObjectId(req.userId),
      token,
      label: req.body?.label ?? 'Incoming token',
    });
    res.status(201).json({
      id: String(doc._id),
      token,
      label: doc.label,
      url: `/api/webhooks/incoming/${token}`,
    });
  })
);

router.delete(
  '/incoming-tokens/:id',
  asyncHandler(async (req, res) => {
    if (!req.userId) throw ApiError.unauthorized();
    if (!Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Token not found');
    await IncomingWebhookToken.updateOne(
      { _id: req.params.id, userId: new Types.ObjectId(req.userId) },
      { $set: { active: false } }
    );
    res.status(204).end();
  })
);

export default router;
