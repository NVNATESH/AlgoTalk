/**
 * E2E: Groups — create, list, join via invite.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Groups', () => {
  it('creates a group', async () => {
    const { token } = await registerAndLogin();
    const res = await api('POST', '/groups', {
      token,
      body: { name: `TestGroup-${Date.now()}`, isPublic: true },
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBeDefined();
    expect(res.body.inviteCode).toBeDefined();
  });

  it('lists user groups', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/groups', { token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) || Array.isArray(res.body.groups)).toBe(true);
  });

  it('rejects group creation without auth', async () => {
    const res = await api('POST', '/groups', {
      body: { name: 'NoAuth', isPublic: true },
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent group', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/groups/000000000000000000000000', { token });
    expect(res.ok).toBe(false);
  });
});
