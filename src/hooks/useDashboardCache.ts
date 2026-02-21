import { useRef, useCallback } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 30000; // 30 segundos

export function useDashboardCache<T>() {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const set = useCallback((key: string, data: T) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  return { get, set, clear };
}