/**
 * E2E: Auth flow — register, login, /me, refresh, invalid creds.
 */
import { describe, it, expect } from 'vitest';
import { api, uniqueUser, registerAndLogin } from './helpers.js';

describe('E2E: Auth', () => {
  it('registers a new user', async () => {
    const user = uniqueUser();
    const res = await api('POST', '/auth/register', { body: user });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(user.username);
  });

  it('rejects duplicate username', async () => {
    const user = uniqueUser();
    await api('POST', '/auth/register', { body: user });
    const dup = await api('POST', '/auth/register', { body: user });
    expect(dup.ok).toBe(false);
    expect(dup.status).toBeGreaterThanOrEqual(400);
  });

  it('logs in with valid credentials', async () => {
    const { token, loginBody } = await registerAndLogin();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(loginBody.user).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const user = uniqueUser();
    await api('POST', '/auth/register', { body: user });
    const res = await api('POST', '/auth/login', {
      body: { emailOrUsername: user.username, password: 'WrongPass123!' },
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns current user', async () => {
    const { token } = await registerAndLogin();
    const res = await api('GET', '/auth/me', { token });
    expect(res.status).toBe(200);
    expect(res.body.username).toBeDefined();
  });

  it('GET /auth/me rejects without token', async () => {
    const res = await api('GET', '/auth/me');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('rejects malformed registration payload', async () => {
    const res = await api('POST', '/auth/register', {
      body: { username: 'ab', email: 'not-an-email', password: '123' },
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
