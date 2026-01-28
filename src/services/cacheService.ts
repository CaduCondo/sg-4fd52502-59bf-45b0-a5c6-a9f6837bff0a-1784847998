/**
 * Cache Service
 * Intelligent caching system for offline/fallback support
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresIn: number;
};

type CacheStore = {
  [key: string]: CacheEntry<any>;
};

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly STORAGE_KEY = "app_cache_v1";
  private readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.STORAGE_KEY}_${key}`;
  }

  /**
   * Set data in cache (memory + localStorage)
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    };

    // Memory cache
    this.memoryCache.set(key, entry);

    // localStorage cache (with error handling)
    try {
      if (this.isAvailable()) {
        const store = this.getLocalStore();
        store[key] = entry;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
      }
    } catch (error) {
      console.warn("Failed to write to localStorage:", error);
    }
  }

  /**
   * Get data from cache (memory first, then localStorage)
   */
  get<T>(key: string, allowStale: boolean = false): T | null {
    // Try memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (this.isValid(memEntry) || allowStale) {
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
    }

    // Try localStorage
    if (!this.isAvailable()) return null;

    try {
      const store = this.getLocalStore();
      const entry = store[key];

      if (!entry) return null;

      if (this.isValid(entry) || allowStale) {
        // Restore to memory cache
        this.memoryCache.set(key, entry);
        return entry.data as T;
      }

      // Expired and stale not allowed
      delete store[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Check if cached data exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific key from cache
   */
  remove(key: string): void {
    this.memoryCache.delete(key);

    try {
      if (this.isAvailable()) {
        const store = this.getLocalStore();
        delete store[key];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
      }
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      if (this.isAvailable()) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }

  /**
   * Get all cached keys
   */
  keys(): string[] {
    const memoryKeys = Array.from(this.memoryCache.keys());
    try {
      if (this.isAvailable()) {
        const store = this.getLocalStore();
        const localKeys = Object.keys(store);
        return Array.from(new Set([...memoryKeys, ...localKeys]));
      }
    } catch {
      return memoryKeys;
    }
    return memoryKeys;
  }

  /**
   * Check if entry is still valid (not expired)
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.expiresIn;
  }

  /**
   * Get localStorage store
   */
  private getLocalStore(): CacheStore {
    try {
      if (this.isAvailable()) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      }
    } catch {
      return {};
    }
    return {};
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage cache
    try {
      if (this.isAvailable()) {
        const store = this.getLocalStore();
        const cleaned: CacheStore = {};
        for (const [key, entry] of Object.entries(store)) {
          if (this.isValid(entry)) {
            cleaned[key] = entry;
          }
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
      }
    } catch (error) {
      console.warn("Failed to cleanup localStorage:", error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Auto cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    cacheService.cleanup();
  }, 1000 * 60 * 5);
}