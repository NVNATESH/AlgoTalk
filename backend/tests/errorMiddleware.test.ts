import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ZodError, z } from 'zod';

// Mock env before imports
vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_REFRESH_SECRET: 'b'.repeat(64),
  },
  isProd: false,
}));

vi.mock('../src/config/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { notFound, errorHandler } from '../src/middleware/error.js';
import { ApiError } from '../src/utils/ApiError.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/api/nonexistent',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status?: number; _json?: unknown } {
  const res: any = {};
  res._status = 200;
  res.status = (s: number) => { res._status = s; return res; };
  res.json = (body: unknown) => { res._json = body; return res; };
  return res;
}

describe('error middleware', () => {
  describe('notFound', () => {
    it('calls next with a 404 ApiError', () => {
      const req = mockReq({ method: 'GET', originalUrl: '/api/unknown' });
      const next = vi.fn();
      notFound(req, mockRes() as any, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          message: expect.stringContaining('/api/unknown'),
        })
      );
    });
  });

  describe('errorHandler', () => {
    it('handles ZodError with 400 and flattened details', () => {
      const schema = z.object({ name: z.string().min(1), email: z.string().email() });
      let zodError: ZodError | undefined;
      try {
        schema.parse({ name: '', email: 'bad' });
      } catch (e) {
        zodError = e as ZodError;
      }
      const res = mockRes();
      errorHandler(zodError!, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(400);
      expect((res._json as any).error).toBe('ValidationError');
      expect((res._json as any).details).toBeDefined();
    });

    it('handles ApiError with correct status and message', () => {
      const err = ApiError.badRequest('Invalid input');
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(400);
      expect((res._json as any).message).toBe('Invalid input');
    });

    it('handles ApiError with details', () => {
      const err = new ApiError(422, 'Validation failed', { field: 'email' });
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(422);
      expect((res._json as any).details).toEqual({ field: 'email' });
    });

    it('handles unknown errors with 500', () => {
      const err = new Error('Something unexpected');
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(500);
      expect((res._json as any).error).toBe('InternalServerError');
    });

    it('handles 401 unauthorized', () => {
      const err = ApiError.unauthorized('Token expired');
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(401);
      expect((res._json as any).message).toBe('Token expired');
    });

    it('handles 403 forbidden', () => {
      const err = ApiError.forbidden('Admin only');
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(403);
      expect((res._json as any).message).toBe('Admin only');
    });

    it('handles 409 conflict', () => {
      const err = ApiError.conflict('Username taken');
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(409);
      expect((res._json as any).message).toBe('Username taken');
    });

    it('handles 429 too many requests', () => {
      const err = ApiError.tooMany();
      const res = mockRes();
      errorHandler(err, mockReq(), res as any, vi.fn());
      expect(res._status).toBe(429);
    });
  });
});
