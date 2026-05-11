import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Tests for interview controller validation schemas.
 */

const INTERVIEW_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
const INTERVIEW_ROLES = ['sde1', 'sde2', 'sde3', 'senior', 'lead', 'staff', 'principal'] as const;
const INTERVIEW_MODES = ['standard', 'speed', 'deep_dive', 'system_design', 'behavioral'] as const;

const startSchema = z
  .object({
    topic: z.string().min(2).max(160).optional(),
    topics: z.array(z.string().min(1).max(40)).max(6).optional(),
    difficulty: z.enum(INTERVIEW_DIFFICULTIES),
    role: z.enum(INTERVIEW_ROLES).optional(),
    notes: z.string().max(500).optional(),
    mode: z.enum(INTERVIEW_MODES).optional(),
    company: z.string().max(60).optional(),
  })
  .refine(
    (v) => !!v.topic || (v.topics && v.topics.length > 0),
    'Provide at least one topic'
  );

const saveCodeSchema = z.object({
  code: z.string().max(50_000),
  language: z.string().min(1).max(20),
});

const approachSchema = z.object({
  transcript: z.string().min(5).max(8000),
});

const submitSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.string().min(1).max(20),
});

const followUpSchema = z.object({
  message: z.string().min(1).max(2000),
});

describe('interview validation schemas', () => {
  describe('startSchema', () => {
    it('accepts valid start with topic', () => {
      const result = startSchema.safeParse({
        topic: 'Dynamic Programming',
        difficulty: 'Medium',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid start with topics array', () => {
      const result = startSchema.safeParse({
        topics: ['Arrays', 'Sorting'],
        difficulty: 'Easy',
      });
      expect(result.success).toBe(true);
    });

    it('rejects when neither topic nor topics is provided', () => {
      const result = startSchema.safeParse({
        difficulty: 'Medium',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid difficulty', () => {
      const result = startSchema.safeParse({
        topic: 'Trees',
        difficulty: 'Impossible',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid roles', () => {
      for (const role of INTERVIEW_ROLES) {
        const result = startSchema.safeParse({
          topic: 'DP',
          difficulty: 'Medium',
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid modes', () => {
      for (const mode of INTERVIEW_MODES) {
        const result = startSchema.safeParse({
          topic: 'Graphs',
          difficulty: 'Hard',
          mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects topic shorter than 2 chars', () => {
      const result = startSchema.safeParse({
        topic: 'A',
        difficulty: 'Easy',
      });
      expect(result.success).toBe(false);
    });

    it('limits topics array to 6 items', () => {
      const result = startSchema.safeParse({
        topics: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        difficulty: 'Medium',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional company field', () => {
      const result = startSchema.safeParse({
        topic: 'System Design',
        difficulty: 'Hard',
        company: 'Google',
      });
      expect(result.success).toBe(true);
    });

    it('rejects company over 60 chars', () => {
      const result = startSchema.safeParse({
        topic: 'Design',
        difficulty: 'Hard',
        company: 'x'.repeat(61),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('saveCodeSchema', () => {
    it('accepts valid code', () => {
      const result = saveCodeSchema.safeParse({
        code: 'console.log("hello")',
        language: 'javascript',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty language', () => {
      const result = saveCodeSchema.safeParse({
        code: 'print("hi")',
        language: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects code over 50k chars', () => {
      const result = saveCodeSchema.safeParse({
        code: 'x'.repeat(50001),
        language: 'python',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('approachSchema', () => {
    it('accepts valid transcript', () => {
      const result = approachSchema.safeParse({
        transcript: 'I would use a hash map to track frequencies...',
      });
      expect(result.success).toBe(true);
    });

    it('rejects transcript shorter than 5 chars', () => {
      const result = approachSchema.safeParse({ transcript: 'Hi' });
      expect(result.success).toBe(false);
    });

    it('rejects transcript over 8000 chars', () => {
      const result = approachSchema.safeParse({
        transcript: 'x'.repeat(8001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('submitSchema', () => {
    it('accepts valid submission', () => {
      const result = submitSchema.safeParse({
        code: 'function solve() { return 42; }',
        language: 'javascript',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty code', () => {
      const result = submitSchema.safeParse({
        code: '',
        language: 'python',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('followUpSchema', () => {
    it('accepts valid message', () => {
      const result = followUpSchema.safeParse({
        message: 'Can you explain the time complexity?',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty message', () => {
      const result = followUpSchema.safeParse({ message: '' });
      expect(result.success).toBe(false);
    });

    it('rejects message over 2000 chars', () => {
      const result = followUpSchema.safeParse({
        message: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});
