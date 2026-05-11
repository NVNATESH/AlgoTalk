import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TtlCache } from '../src/utils/ttlCache.js';

describe('TtlCache', () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    cache = new TtlCache<string>(1000);
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 500);
    expect(cache.get('key1')).toBe('value1');
    vi.advanceTimersByTime(600);
    expect(cache.get('key1')).toBeUndefined();
    vi.useRealTimers();
  });

  it('invalidates a specific key', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('clears all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  describe('wrap', () => {
    it('calls loader on cache miss and caches result', async () => {
      const loader = vi.fn().mockResolvedValue('loaded');
      const result = await cache.wrap('key1', loader);
      expect(result).toBe('loaded');
      expect(loader).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cache.wrap('key1', loader);
      expect(result2).toBe('loaded');
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('coalesces concurrent calls for the same key', async () => {
      let resolveLoader: (v: string) => void;
      const loader = vi.fn().mockImplementation(
        () => new Promise<string>((r) => { resolveLoader = r; })
      );

      const p1 = cache.wrap('key1', loader);
      const p2 = cache.wrap('key1', loader);
      expect(loader).toHaveBeenCalledTimes(1);

      resolveLoader!('coalesced');
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('coalesced');
      expect(r2).toBe('coalesced');
    });
  });
});
