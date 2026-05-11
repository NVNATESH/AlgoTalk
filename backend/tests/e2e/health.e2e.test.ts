/**
 * E2E: Health endpoint — verifies the backend is reachable.
 */
import { describe, it, expect } from 'vitest';
import { api } from './helpers.js';

describe('E2E: Health', () => {
  it('GET /health returns ok:true', async () => {
    const res = await api('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.time).toBeDefined();
  });
});
