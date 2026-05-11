/**
 * Shared helpers for E2E tests.
 * All tests hit the real backend (BASE_URL) — no mocks.
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5050/api';

/* ── tiny HTTP wrapper (no external deps) ──────────────────────── */
interface Res<T = any> {
  status: number;
  ok: boolean;
  body: T;
  headers: Record<string, string>;
}

export async function api<T = any>(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; cookie?: string } = {},
): Promise<Res<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.cookie) headers.Cookie = opts.cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });

  let body: any;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => { responseHeaders[k] = v; });

  return { status: res.status, ok: res.ok, body, headers: responseHeaders };
}

/* ── unique user factory ───────────────────────────────────────── */
let counter = 0;

export function uniqueUser() {
  const id = `e2e_${Date.now()}_${++counter}`;
  return {
    username: id,
    email: `${id}@test.local`,
    password: 'Test1234!@#$',
  };
}

/* ── register + login shortcut ─────────────────────────────────── */
export async function registerAndLogin() {
  const user = uniqueUser();
  await api('POST', '/auth/register', { body: user });
  const login = await api('POST', '/auth/login', {
    body: { emailOrUsername: user.username, password: user.password },
  });
  return {
    user,
    token: login.body.accessToken as string,
    cookie: login.headers['set-cookie'] ?? '',
    loginBody: login.body,
  };
}
