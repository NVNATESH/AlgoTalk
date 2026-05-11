import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Tests for goal controller validation schemas.
 * Schemas are replicated to avoid needing DB/service imports.
 */

const difficultyEnum = z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']);
const priorityEnum = z.enum(['P0', 'P1', 'P2']);

const createGoalSchema = z.object({
  topic: z.string().min(2).max(120),
  difficulty: difficultyEnum.default('Intermediate'),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  deadlineDays: z.number().int().min(3).max(365).optional(),
  priority: priorityEnum.optional(),
  notes: z.string().max(500).optional(),
});

const moduleStatusSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

const pauseSchema = z.object({ paused: z.boolean() });

const logTimeSchema = z.object({
  minutes: z.number().int().min(1).max(240),
  moduleId: z.string().min(1).optional(),
});

const updateDatesSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
  })
  .refine((d) => d.startDate || d.deadline, {
    message: 'Provide startDate and/or deadline',
  });

describe('goal validation schemas', () => {
  describe('createGoalSchema', () => {
    it('accepts valid goal data', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Dynamic Programming',
        difficulty: 'Intermediate',
        weeklyHours: 10,
        deadlineDays: 30,
      });
      expect(result.success).toBe(true);
    });

    it('uses default difficulty', () => {
      const result = createGoalSchema.safeParse({ topic: 'Arrays' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty).toBe('Intermediate');
      }
    });

    it('rejects topic shorter than 2 chars', () => {
      const result = createGoalSchema.safeParse({ topic: 'A' });
      expect(result.success).toBe(false);
    });

    it('rejects topic longer than 120 chars', () => {
      const result = createGoalSchema.safeParse({ topic: 'A'.repeat(121) });
      expect(result.success).toBe(false);
    });

    it('rejects invalid difficulty', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Trees',
        difficulty: 'SuperHard',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weeklyHours of 0', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Graphs',
        weeklyHours: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects weeklyHours over 80', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Graphs',
        weeklyHours: 81,
      });
      expect(result.success).toBe(false);
    });

    it('rejects deadlineDays under 3', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Sorting',
        deadlineDays: 2,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid priority values', () => {
      for (const p of ['P0', 'P1', 'P2']) {
        const result = createGoalSchema.safeParse({ topic: 'DP', priority: p });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid priority', () => {
      const result = createGoalSchema.safeParse({ topic: 'DP', priority: 'P5' });
      expect(result.success).toBe(false);
    });

    it('rejects notes over 500 chars', () => {
      const result = createGoalSchema.safeParse({
        topic: 'Strings',
        notes: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('moduleStatusSchema', () => {
    it('accepts valid statuses', () => {
      for (const status of ['not_started', 'in_progress', 'completed']) {
        expect(moduleStatusSchema.safeParse({ status }).success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      expect(moduleStatusSchema.safeParse({ status: 'paused' }).success).toBe(false);
    });
  });

  describe('pauseSchema', () => {
    it('accepts boolean', () => {
      expect(pauseSchema.safeParse({ paused: true }).success).toBe(true);
      expect(pauseSchema.safeParse({ paused: false }).success).toBe(true);
    });

    it('rejects non-boolean', () => {
      expect(pauseSchema.safeParse({ paused: 'yes' }).success).toBe(false);
    });
  });

  describe('logTimeSchema', () => {
    it('accepts valid minutes', () => {
      expect(logTimeSchema.safeParse({ minutes: 30 }).success).toBe(true);
    });

    it('rejects 0 minutes', () => {
      expect(logTimeSchema.safeParse({ minutes: 0 }).success).toBe(false);
    });

    it('rejects over 240 minutes', () => {
      expect(logTimeSchema.safeParse({ minutes: 241 }).success).toBe(false);
    });

    it('accepts optional moduleId', () => {
      expect(logTimeSchema.safeParse({ minutes: 10, moduleId: 'abc-123' }).success).toBe(true);
    });
  });

  describe('updateDatesSchema', () => {
    it('accepts startDate only', () => {
      const result = updateDatesSchema.safeParse({
        startDate: '2025-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts deadline only', () => {
      const result = updateDatesSchema.safeParse({
        deadline: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts both dates', () => {
      const result = updateDatesSchema.safeParse({
        startDate: '2025-01-01T00:00:00.000Z',
        deadline: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty object (no dates)', () => {
      const result = updateDatesSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
