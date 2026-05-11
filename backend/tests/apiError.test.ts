import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/utils/ApiError.js';

describe('ApiError', () => {
  it('creates error with status and message', () => {
    const err = new ApiError(400, 'Bad input');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad input');
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('includes optional details', () => {
    const err = new ApiError(422, 'Validation', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  describe('static factories', () => {
    it('badRequest', () => {
      const err = ApiError.badRequest('Invalid data');
      expect(err.status).toBe(400);
      expect(err.message).toBe('Invalid data');
    });

    it('unauthorized', () => {
      const err = ApiError.unauthorized();
      expect(err.status).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });

    it('forbidden', () => {
      const err = ApiError.forbidden();
      expect(err.status).toBe(403);
      expect(err.message).toBe('Forbidden');
    });

    it('notFound', () => {
      const err = ApiError.notFound('User not found');
      expect(err.status).toBe(404);
      expect(err.message).toBe('User not found');
    });

    it('conflict', () => {
      const err = ApiError.conflict('Already exists');
      expect(err.status).toBe(409);
      expect(err.message).toBe('Already exists');
    });

    it('tooMany', () => {
      const err = ApiError.tooMany();
      expect(err.status).toBe(429);
      expect(err.message).toBe('Too many requests');
    });
  });
});
