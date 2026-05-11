import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

// Mock env before importing
vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32) + '-test-access-secret-key-long',
    JWT_REFRESH_SECRET: 'b'.repeat(32) + '-test-refresh-secret-key-long',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  },
}));

import { requireAuth, requireAdmin } from '../src/middleware/auth.js';
import { signAccessToken } from '../src/utils/tokens.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('auth middleware', () => {
  describe('requireAuth', () => {
    it('calls next with error when no Authorization header', () => {
      const req = mockReq({ headers: {} });
      const next = vi.fn();
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    });

    it('calls next with error for invalid bearer format', () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } });
      const next = vi.fn();
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    });

    it('calls next with error for invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
      const next = vi.fn();
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    });

    it('sets userId and role for valid token', () => {
      const token = signAccessToken({ sub: 'user123', role: 'admin' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const next = vi.fn();
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.userId).toBe('user123');
      expect(req.userRole).toBe('admin');
    });
  });

  describe('requireAdmin', () => {
    it('calls next without error for admin role', () => {
      const req = mockReq();
      (req as any).userRole = 'admin';
      const next = vi.fn();
      requireAdmin(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it('calls next with 403 for non-admin role', () => {
      const req = mockReq();
      (req as any).userRole = 'user';
      const next = vi.fn();
      requireAdmin(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });

    it('calls next with 403 for moderator role', () => {
      const req = mockReq();
      (req as any).userRole = 'moderator';
      const next = vi.fn();
      requireAdmin(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });
  });
});
