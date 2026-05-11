/**
 * E2E: Interviews — list sessions, list questions, auth guards.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Interviews', () => {
  it('lists interview sessions (initially empty)', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/interview', { token });
    expect(res.status).toBe(200);
  });

  it('lists question bank', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/interview/questions', { token });
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated interview list', async () => {
    const res = await api('GET', '/interview');
    expect(res.status).toBe(401);
  });
});
