import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request body',
      details: err.flatten(),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error({ err, path: req.originalUrl }, 'unhandled error');
  return res.status(500).json({
    error: 'InternalServerError',
    message: isProd ? 'Something went wrong' : err?.message ?? 'Unknown error',
  });
};
