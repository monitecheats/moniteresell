import { LRUCache } from 'lru-cache';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW ?? 60_000);
const maxAttempts = Number(process.env.RATE_LIMIT_MAX ?? 5);

const limiter = new LRUCache<string, { count: number; firstAttempt: number }>({
  max: 5000,
  ttl: windowMs,
  allowStale: false
});

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = limiter.get(key);
  if (!entry) {
    limiter.set(key, { count: 1, firstAttempt: now }, { ttl: windowMs });
    return false;
  }

  if (entry.count >= maxAttempts) {
    return true;
  }

  entry.count += 1;
  const remaining = Math.max(0, windowMs - (now - entry.firstAttempt));
  limiter.set(key, entry, { ttl: remaining });
  return false;
}

export function resetRateLimit(key: string): void {
  limiter.delete(key);
}
