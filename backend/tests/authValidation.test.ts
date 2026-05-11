import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the validation schemas from authController to test them in isolation
const registerSchema = z.object({
  name: z.string().min(1).max(80),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
  recoveryCode: z.string().min(6).max(40).optional(),
});

describe('auth validation schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        username: 'john_doe',
        email: 'john@example.com',
        password: 'securePassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short username', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        username: 'ab',
        email: 'john@example.com',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects username with special characters', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        username: 'john@doe',
        email: 'john@example.com',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        username: 'john_doe',
        email: 'not-an-email',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        username: 'john_doe',
        email: 'john@example.com',
        password: '1234567',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = registerSchema.safeParse({
        name: '',
        username: 'john_doe',
        email: 'john@example.com',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts email + password', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'john@example.com',
        password: 'myPassword',
      });
      expect(result.success).toBe(true);
    });

    it('accepts username + password', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'john_doe',
        password: 'myPassword',
      });
      expect(result.success).toBe(true);
    });

    it('accepts login with totpCode', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'john@example.com',
        password: 'myPassword',
        totpCode: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid totpCode format', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'john@example.com',
        password: 'myPassword',
        totpCode: 'abcdef',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short identifier', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'ab',
        password: 'myPassword',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        emailOrUsername: 'john@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
