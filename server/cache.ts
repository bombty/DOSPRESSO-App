// Ultra-cost-optimized in-memory cache
// 24 hour TTL, no external dependencies (Redis gibi)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean expired entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  set<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }

  // Get cache stats (for monitoring)
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Rate limiter for AI calls (date-based, auto-resets daily)
// Uses date-scoped keys: userId:YYYY-MM-DD
// No fixed 2 AM reset needed - automatically resets when date changes
class RateLimiter {
  private limits: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old date keys every hour (remove yesterday's counters)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  private getTodayKey(userId: string, scope: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${userId}:${scope}:${today}`;
  }

  canMakeRequest(userId: string, scope: string, limit: number = 1): boolean {
    const key = this.getTodayKey(userId, scope);
    const current = this.limits.get(key) || 0;
    return current < limit;
  }

  incrementRequest(userId: string, scope: string): void {
    const key = this.getTodayKey(userId, scope);
    const current = this.limits.get(key) || 0;
    this.limits.set(key, current + 1);
  }

  getRemainingCalls(userId: string, scope: string, limit: number = 1): number {
    const key = this.getTodayKey(userId, scope);
    const current = this.limits.get(key) || 0;
    return Math.max(0, limit - current);
  }

  private cleanup(): void {
    const today = new Date().toISOString().split('T')[0];
    const keysToDelete: string[] = [];
    
    const allKeys = Array.from(this.limits.keys());
    for (const key of allKeys) {
      // Key format: userId:scope:YYYY-MM-DD
      const parts = key.split(':');
      const datePart = parts[2]; // Date is the 3rd part
      if (datePart !== today) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.limits.delete(key));
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} old rate limit counters`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }

  // Debug/monitoring helpers
  getStats(): { totalKeys: number; todayKeys: number } {
    const today = new Date().toISOString().split('T')[0];
    const todayKeys = Array.from(this.limits.keys()).filter(k => k.includes(today));
    return {
      totalKeys: this.limits.size,
      todayKeys: todayKeys.length,
    };
  }
}

// Singleton instances
export const cache = new InMemoryCache();
export const aiRateLimiter = new RateLimiter();

// Helper function to generate cache keys
export function generateCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${args.map(arg => JSON.stringify(arg)).join(':')}`;
}
