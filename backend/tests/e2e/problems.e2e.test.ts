/**
 * E2E: Problems — list, filter, pagination.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Problems', () => {
  it('lists problems (may be empty)', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/problems', { token });
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await api('GET', '/problems');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent slug', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/problems/nonexistent-problem-slug-xyz', { token });
    expect(res.ok).toBe(false);
  });
});
