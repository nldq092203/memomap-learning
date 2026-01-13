"use client"

import { useEffect, useState } from "react"
import { HardDrive, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  getCacheStorageInfo,
  getStorageQuota,
  clearTransformerCache,
  type CacheStorageInfo,
  type StorageQuota,
} from "@/lib/services/whisper-cache"

export function StorageInfoPanel() {
  const [storageInfo, setStorageInfo] = useState<StorageQuota | null>(null)
  const [cacheInfo, setCacheInfo] = useState<CacheStorageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  const loadStorageInfo = async () => {
    setIsLoading(true)
    try {
      const [storage, cache] = await Promise.all([
        getStorageQuota(),
        getCacheStorageInfo(),
      ])
      setStorageInfo(storage)
      setCacheInfo(cache)
    } catch (error) {
      console.error("Failed to load storage info:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStorageInfo()
  }, [])

  const handleClearCache = async () => {
    if (!cacheInfo?.caches || cacheInfo.caches.length === 0) return

    const confirmed = window.confirm(
      "This will delete all cached Whisper models. You'll need to download them again on next use. Continue?"
    )

    if (!confirmed) return

    setIsClearing(true)
    try {
      const clearedCount = await clearTransformerCache()
      console.log(`Cleared ${clearedCount} cache(s)`)

      // Reload info
      await loadStorageInfo()

      // Notify user
      alert(`Successfully cleared ${clearedCount} model cache(s)`)
    } catch (error) {
      console.error("Failed to clear cache:", error)
      alert("Failed to clear cache. See console for details.")
    } finally {
      setIsClearing(false)
    }
  }

  const handleRefresh = () => {
    loadStorageInfo()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const totalCacheSize =
    cacheInfo?.caches.reduce((sum, cache) => sum + cache.size, 0) || 0
  const hasCachedModels = (cacheInfo?.caches.length || 0) > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Browser cache for Whisper models
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Storage Quota */}
        {storageInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Total browser storage
              </span>
              <span className="text-muted-foreground">
                {storageInfo.usageFormatted} / {storageInfo.quotaFormatted}
              </span>
            </div>
            <Progress
              value={parseFloat(storageInfo.percentUsed)}
              className="h-2"
            />
            <p className="text-[0.65rem] text-muted-foreground">
              {storageInfo.percentUsed}% used
            </p>
          </div>
        )}

        {/* Cached Models */}
        {cacheInfo?.supported && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Cached Whisper models
            </p>

            {hasCachedModels ? (
              <>
                <div className="space-y-1.5 rounded-md border bg-muted/20 p-2">
                  {cacheInfo.caches.map((cache) => (
                    <div
                      key={cache.name}
                      className="flex items-center justify-between text-[0.7rem]"
                    >
                      <span className="truncate font-mono text-muted-foreground">
                        {cache.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        <span>{cache.entries} files</span>
                        <span className="font-medium">{cache.sizeFormatted}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[0.7rem] text-muted-foreground">
                    Total cached: {(totalCacheSize / (1024 * 1024)).toFixed(1)}{" "}
                    MB
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="h-7 text-xs"
                  >
                    {isClearing ? (
                      "Clearing..."
                    ) : (
                      <>
                        <Trash2 className="mr-1.5 h-3 w-3" />
                        Clear cache
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p className="rounded-md border bg-muted/20 p-3 text-center text-[0.7rem] text-muted-foreground">
                No models cached yet. Models will be cached automatically after
                first download.
              </p>
            )}
          </div>
        )}

        {cacheInfo?.error && (
          <p className="text-xs text-destructive">
            Error reading cache: {cacheInfo.error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

