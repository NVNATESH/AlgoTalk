import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module before importing tokens
vi.mock('../src/config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32) + '-test-access-secret-key-long',
    JWT_REFRESH_SECRET: 'b'.repeat(32) + '-test-refresh-secret-key-long',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  },
}));

import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  randomToken,
  hashToken,
} from '../src/utils/tokens.js';

describe('token utilities', () => {
  describe('access tokens', () => {
    it('signs and verifies a valid access token', () => {
      const token = signAccessToken({ sub: 'user123', role: 'user' });
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('user123');
      expect(payload.role).toBe('user');
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('preserves admin role in token', () => {
      const token = signAccessToken({ sub: 'admin1', role: 'admin' });
      const payload = verifyAccessToken(token);
      expect(payload.role).toBe('admin');
    });

    it('throws on tampered token', () => {
      const token = signAccessToken({ sub: 'user1', role: 'user' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('signs and verifies a valid refresh token', () => {
      const token = signRefreshToken({ sub: 'user123', v: 0 });
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe('user123');
      expect(payload.v).toBe(0);
    });

    it('includes token version for revocation', () => {
      const token = signRefreshToken({ sub: 'user1', v: 5 });
      const payload = verifyRefreshToken(token);
      expect(payload.v).toBe(5);
    });

    it('access secret cannot verify refresh token', () => {
      const token = signRefreshToken({ sub: 'user1', v: 0 });
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('randomToken', () => {
    it('generates hex string of expected length', () => {
      const token = randomToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('generates unique tokens', () => {
      const t1 = randomToken();
      const t2 = randomToken();
      expect(t1).not.toBe(t2);
    });

    it('defaults to 32 bytes (64 hex chars)', () => {
      const token = randomToken();
      expect(token).toHaveLength(64);
    });
  });

  describe('hashToken', () => {
    it('produces consistent SHA-256 hash', () => {
      const hash1 = hashToken('test-token');
      const hash2 = hashToken('test-token');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });

    it('produces 64-char hex string', () => {
      const hash = hashToken('any-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});
