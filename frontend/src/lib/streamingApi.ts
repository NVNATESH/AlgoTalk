import { getAccessToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export interface StreamPostOptions {
  signal?: AbortSignal;
  onLine: (line: string) => void;
}

/**
 * POSTs a JSON body and reads the response as line-delimited (NDJSON) chunks.
 * Calls onLine for each complete line as it arrives.
 *
 * Throws on HTTP error or auth failure. Caller should also handle abort
 * (signal.aborted -> reader.cancel() is automatic on most browsers).
 */
export async function postNdjsonStream(
  path: string,
  body: unknown,
  { signal, onLine }: StreamPostOptions
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`Stream failed (${res.status}): ${detail || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  while (true) {
    if (signal?.aborted) {
      try {
        await reader.cancel();
      } catch {}
      throw new DOMException('Aborted', 'AbortError');
    }
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onLine(line);
    }
  }
  const tail = buf.trim();
  if (tail) onLine(tail);
}
