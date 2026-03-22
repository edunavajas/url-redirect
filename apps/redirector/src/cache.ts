import type { Link } from '@url-redirect/db';

interface CacheEntry {
  link: Link;
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minuto
const cache = new Map<string, CacheEntry>();

export function getCached(slug: string): Link | null {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(slug);
    return null;
  }
  return entry.link;
}

export function setCache(slug: string, link: Link): void {
  cache.set(slug, { link, cachedAt: Date.now() });
}

export function invalidateCache(slug: string): void {
  cache.delete(slug);
}

export function clearCache(): void {
  cache.clear();
}

// Limpieza periódica cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}, 5 * 60_000);
