const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retryOn401?: boolean;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth = false, retryOn401 = true, headers, ...rest } = options;

  const doFetch = async (token: string | null): Promise<Response> => {
    const h = new Headers(headers as HeadersInit);
    if (body !== undefined && !h.has('Content-Type')) h.set('Content-Type', 'application/json');
    if (auth && token) h.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: h,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch(accessToken);

  if (res.status === 401 && auth && retryOn401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`, body?.details);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
