/**
 * Global request cache to prevent duplicate API calls
 * This ensures that multiple components don't make the same request simultaneously
 */

interface CacheEntry<T> {
  data: T | null
  promise: Promise<T> | null
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>()

  /**
   * Get cached data or execute the request function
   * If the same request is already in progress, returns the existing promise
   */
  async get<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default TTL
  ): Promise<T> {
    const now = Date.now()
    const entry = this.cache.get(key)

    // If we have valid cached data, return it
    if (entry && entry.data && (now - entry.timestamp) < entry.ttl) {
      return entry.data as T
    }

    // If we have an ongoing request, return that promise
    if (entry && entry.promise) {
      return entry.promise as Promise<T>
    }

    // Create new request
    const promise = requestFn()
    
    // Cache the promise immediately to prevent duplicate requests
    this.cache.set(key, {
      data: null,
      promise,
      timestamp: now,
      ttl
    })

    try {
      const result = await promise
      
      // Update cache with successful result
      this.cache.set(key, {
        data: result,
        promise: null,
        timestamp: now,
        ttl
      })
      
      return result
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(key)
      throw error
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string) {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Get cache size for debugging
   */
  size() {
    return this.cache.size
  }
}

// Global singleton instance
export const requestCache = new RequestCache()
