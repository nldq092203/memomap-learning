/**
 * Whisper Cache Service
 * 
 * Utilities for inspecting and managing browser cache storage
 * used by @huggingface/transformers for Whisper models
 */

export type CacheInfo = {
  name: string
  entries: number
  size: number
  sizeFormatted: string
}

export type StorageQuota = {
  usage: number
  quota: number
  usageFormatted: string
  quotaFormatted: string
  percentUsed: string
}

export type CacheStorageInfo = {
  supported: boolean
  caches: CacheInfo[]
  error?: string
}

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Get information about transformer model caches
 */
export const getCacheStorageInfo = async (): Promise<CacheStorageInfo> => {
  if (!("caches" in window)) {
    return { supported: false, caches: [] }
  }

  try {
    const cacheNames = await caches.keys()
    const transformerCaches = cacheNames.filter(
      (name) =>
        name.includes("transformers") ||
        name.includes("huggingface") ||
        name.includes("onnx") ||
        name.includes("whisper")
    )

    const cacheInfo = await Promise.all(
      transformerCaches.map(async (name) => {
        const cache = await caches.open(name)
        const keys = await cache.keys()

        // Estimate size (approximate)
        let totalSize = 0
        for (const request of keys) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.blob()
            totalSize += blob.size
          }
        }

        return {
          name,
          entries: keys.length,
          size: totalSize,
          sizeFormatted: formatBytes(totalSize),
        }
      })
    )

    return { supported: true, caches: cacheInfo }
  } catch (error) {
    console.error("Failed to read cache storage:", error)
    return { supported: true, caches: [], error: String(error) }
  }
}

/**
 * Get browser storage quota information
 */
export const getStorageQuota = async (): Promise<StorageQuota | null> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0

      return {
        usage,
        quota,
        usageFormatted: formatBytes(usage),
        quotaFormatted: formatBytes(quota),
        percentUsed: quota ? ((usage / quota) * 100).toFixed(1) : "0",
      }
    } catch (error) {
      console.error("Failed to get storage quota:", error)
      return null
    }
  }
  return null
}

/**
 * Clear all transformer model caches
 */
export const clearTransformerCache = async (): Promise<number> => {
  if (!("caches" in window)) {
    return 0
  }

  try {
    const cacheNames = await caches.keys()
    const transformerCaches = cacheNames.filter(
      (name) =>
        name.includes("transformers") ||
        name.includes("huggingface") ||
        name.includes("onnx") ||
        name.includes("whisper")
    )

    await Promise.all(transformerCaches.map((name) => caches.delete(name)))

    return transformerCaches.length
  } catch (error) {
    console.error("Failed to clear cache:", error)
    throw error
  }
}

/**
 * Check if a specific model is likely cached
 * Note: This is a heuristic check based on cache entries
 */
export const isModelLikelyCached = async (
  modelId: string
): Promise<boolean> => {
  if (!("caches" in window)) {
    return false
  }

  try {
    const cacheNames = await caches.keys()
    const transformerCaches = cacheNames.filter(
      (name) =>
        name.includes("transformers") ||
        name.includes("huggingface") ||
        name.includes("onnx")
    )

    for (const cacheName of transformerCaches) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()

      // Check if any cached URL contains the model ID
      const hasModel = keys.some((request) => request.url.includes(modelId))
      if (hasModel) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Failed to check model cache:", error)
    return false
  }
}

/**
 * Get approximate size for a Whisper model
 */
export const getModelApproximateSize = (
  modelId: string
): { mb: number; formatted: string } => {
  // Approximate sizes based on Whisper model variants
  const sizes: Record<string, number> = {
    "whisper-tiny": 75,
    "whisper-tiny.en": 75,
    "whisper-base": 140,
    "whisper-base.en": 140,
    "whisper-small": 460,
    "whisper-small.en": 460,
    "whisper-medium": 1500,
    "whisper-medium.en": 1500,
  }

  // Extract model name from full ID (e.g., "Xenova/whisper-tiny" -> "whisper-tiny")
  const modelName = modelId.split("/").pop() || ""
  const mb = sizes[modelName] || 100 // Default fallback

  return {
    mb,
    formatted: `~${mb} MB`,
  }
}

