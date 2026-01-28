/**
 * Cache Service
 * Intelligent caching system for offline/fallback support
 * SIMPLIFIED VERSION - No auto-cleanup to prevent server crashes
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
   * Check if we're in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    if (!this.isBrowser()) return false;
    
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
   * Set data in cache (memory only for now to prevent issues)
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    };

    // Memory cache only (safe and fast)
    this.memoryCache.set(key, entry);

    // Skip localStorage for now to prevent crashes
    // TODO: Re-enable with proper serialization checks
  }

  /**
   * Get data from cache (memory only)
   */
  get<T>(key: string, allowStale: boolean = false): T | null {
    // Try memory cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (this.isValid(memEntry) || allowStale) {
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
    }

    return null;
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
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Get all cached keys
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Check if entry is still valid (not expired)
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.expiresIn;
  }

  /**
   * Clean up expired entries (manual call only)
   */
  cleanup(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// NO AUTO-CLEANUP - Prevents server crashes
// Call manually if needed: cacheService.cleanup()