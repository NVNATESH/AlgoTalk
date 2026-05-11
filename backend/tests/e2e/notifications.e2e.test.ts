/**
 * E2E: Notifications & Badges — list endpoints, auth guards.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Notifications', () => {
  it('lists notifications (initially empty)', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/notifications', { token });
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated notification access', async () => {
    const res = await api('GET', '/notifications');
    expect(res.status).toBe(401);
  });
});

describe('E2E: Badges', () => {
  it('lists badges', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/badges', { token });
    expect(res.status).toBe(200);
  });
});
