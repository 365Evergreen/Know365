// Simple TTL cache using localStorage with in-memory fallback
type CacheEntry<T> = {
  value: T;
  expiresAt: number; // epoch ms
};

const memoryCache = new Map<string, any>();

export const setCache = <T>(key: string, value: T, ttlSeconds = 300) => {
  try {
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
    const str = JSON.stringify(entry);
    localStorage.setItem(key, str);
  } catch (e) {
    // fallback to memory
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
};

export const getCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const mem = memoryCache.get(key);
      if (!mem) return null;
      if (mem.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return mem.value as T;
    }
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (!entry || entry.expiresAt < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value as T;
  } catch (e) {
    const mem = memoryCache.get(key);
    if (!mem) return null;
    if (mem.expiresAt < Date.now()) { memoryCache.delete(key); return null; }
    return mem.value as T;
  }
};

export const clearCache = (key: string) => {
  try { localStorage.removeItem(key); } catch {};
  memoryCache.delete(key);
};
