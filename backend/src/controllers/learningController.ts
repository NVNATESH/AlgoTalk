import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as learningSvc from '../services/learningService.js';

export const getContent = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const content = await learningSvc.getOrGenerateContent(
    req.userId,
    req.params.id,
    req.params.moduleId
  );
  res.json({ content });
});

export const regenerate = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const content = await learningSvc.getOrGenerateContent(
    req.userId,
    req.params.id,
    req.params.moduleId,
    { force: true }
  );
  res.json({ content });
});

const answerSchema = z.union([
  z.object({ type: z.literal('mcq_single'), choice: z.number().int().min(0) }),
  z.object({ type: z.literal('mcq_multi'), choices: z.array(z.number().int().min(0)) }),
  z.object({ type: z.literal('fill_blank'), values: z.array(z.string()) }),
  z.object({
    type: z.literal('match'),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  }),
  z.object({ type: z.literal('true_false'), value: z.boolean() }),
]);

export const submitQuizSchema = z.object({
  answers: z.record(z.string(), answerSchema),
});

export const submitQuiz = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const result = await learningSvc.submitQuiz(
    req.userId,
    req.params.id,
    req.params.moduleId,
    req.body.answers
  );
  res.json({ result });
});
