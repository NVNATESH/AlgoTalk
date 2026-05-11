/**
 * E2E: Profile — view profile, follow/unfollow, followers list.
 */
import { describe, it, expect } from 'vitest';
import { api, registerAndLogin } from './helpers.js';

describe('E2E: Profile', () => {
  it('gets own profile by username', async () => {
    const { user, token } = await registerAndLogin();
    const res = await api('GET', `/profile/${user.username}`, { token });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(user.username);
  });

  it('follows another user', async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();

    const follow = await api('POST', `/profile/${b.user.username}/follow`, { token: a.token });
    expect(follow.status).toBe(200);

    const followers = await api('GET', `/profile/${b.user.username}/followers`, { token: a.token });
    expect(followers.status).toBe(200);
    expect(followers.body.users).toBeInstanceOf(Array);
  });

  it('unfollows a user', async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();

    await api('POST', `/profile/${b.user.username}/follow`, { token: a.token });
    const unfollow = await api('DELETE', `/profile/${b.user.username}/follow`, { token: a.token });
    expect(unfollow.status).toBe(200);
  });

  it('returns 401 for unauthenticated profile access', async () => {
    const res = await api('GET', '/profile/nonexistent');
    expect(res.status).toBe(401);
  });
});
