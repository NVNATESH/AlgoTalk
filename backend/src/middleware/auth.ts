import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: 'user' | 'moderator' | 'admin';
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(ApiError.unauthorized('Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.userRole !== 'admin') return next(ApiError.forbidden('Admin only'));
  next();
};
