/**
 * Global request cache to prevent duplicate API calls
 * This helps reduce server load and improve performance
 */

interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly DEFAULT_TTL = 30000*2 // 30 seconds

  /**
   * Get cached data if it exists and is not expired
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cached data with TTL
   */
  set<T = unknown>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Generate cache key for API requests
   */
  generateKey(method: string, url: string, params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params) : ''
    return `${method}:${url}:${paramString}`
  }
}

// Global instance
export const requestCache = new RequestCache()

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup()
  }, 5 * 60 * 1000)
}
