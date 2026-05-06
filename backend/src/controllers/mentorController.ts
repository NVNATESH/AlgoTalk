import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as mentor from '../services/mentorService.js';

const querySchema = z.object({
  goalId: z.string().min(1),
  moduleId: z.string().optional().default(''),
});

export const getConversation = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('goalId is required');
  const { goalId, moduleId } = parsed.data;
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.badRequest('Invalid goalId');
  const conversation = await mentor.getOrCreateConversation(req.userId, goalId, moduleId);
  res.json({ conversation });
});

export const clearConversation = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('goalId is required');
  const { goalId, moduleId } = parsed.data;
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.badRequest('Invalid goalId');
  await mentor.clearConversation(req.userId, goalId, moduleId);
  res.json({ ok: true });
});

export const sendSchema = z.object({
  goalId: z.string().min(1),
  moduleId: z.string().optional().default(''),
  message: z.string().min(1).max(4000),
});

export const sendMessage = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const { goalId, moduleId, message } = req.body;
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.badRequest('Invalid goalId');

  await mentor.streamMentorReply({
    userId: req.userId,
    goalId,
    moduleId,
    userMessage: message,
    res,
  });
});
