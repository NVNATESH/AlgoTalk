/**
 * E2E: Goals & Roadmap — create goal, list goals, module status.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Goals', () => {
  it('lists user goals (initially empty)', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/goals', { token });
    expect(res.status).toBe(200);
  });

  it('rejects goal creation without auth', async () => {
    const res = await api('POST', '/goals', {
      body: { topic: 'Arrays', difficulty: 'beginner', weeksCommitment: 2 },
    });
    expect(res.status).toBe(401);
  });

  it('lists recommended goals', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/goals/recommended', { token });
    expect(res.status).toBe(200);
  });

  it('lists quest goals', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/goals/quests', { token });
    expect(res.status).toBe(200);
  });
});
