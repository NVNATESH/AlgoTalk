/**
 * Tiny in-process TTL cache. Coalesces concurrent loads for the same key so
 * a thundering herd of identical requests collapses into one DB/AI round trip.
 *
 * Not a Redis replacement — stays in memory, resets on restart. Good enough
 * for hot read-heavy endpoints (analyzer overview, global problem catalog).
 */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();
  private inflight = new Map<string, Promise<V>>();

  constructor(private defaultTtlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
    this.inflight.clear();
  }

  async wrap(key: string, loader: () => Promise<V>, ttlMs: number = this.defaultTtlMs): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const inflight = this.inflight.get(key);
    if (inflight) return inflight;
    const p = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }
}
