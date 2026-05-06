import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/codeReviewService.js';

export const listMine = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const reviews = await svc.listMyReviews(req.userId);
  res.json({ reviews });
});

export const getOne = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const review = await svc.getReviewById(req.userId, req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  res.json({ review });
});

export const unreviewed = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const submissions = await svc.listUnreviewedAccepted(req.userId);
  res.json({ submissions });
});
