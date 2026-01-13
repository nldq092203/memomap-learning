"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Download, Zap, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { WhisperModelId } from "@/components/learning/transcribe/transcribe-types"
import {
  isModelLikelyCached,
  getModelApproximateSize,
} from "@/lib/services/whisper-cache"

type ModelSectionProps = {
  activeModelId: WhisperModelId
  runtimeLabel: string
  onSelectModel: (modelId: WhisperModelId) => void
}

type ModelOption = {
  id: WhisperModelId
  label: string
  description: string
  speedEstimate: string
  speedIcon: typeof Zap
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "Xenova/whisper-tiny",
    label: "Tiny — fastest, lightest",
    description: "Great for quick drafts and short clips.",
    speedEstimate: "~30s for 5min audio",
    speedIcon: Zap,
  },
  {
    id: "Xenova/whisper-base",
    label: "Base — better accuracy",
    description: "Higher quality transcripts, a bit slower.",
    speedEstimate: "~2min for 5min audio",
    speedIcon: Clock,
  },
]

export function TranscribeModelSection({
  activeModelId,
  runtimeLabel,
  onSelectModel,
}: ModelSectionProps) {
  const [cacheStatus, setCacheStatus] = useState<
    Record<WhisperModelId, boolean>
  >({
    "Xenova/whisper-tiny": false,
    "Xenova/whisper-base": false,
  })

  useEffect(() => {
    const checkCache = async () => {
      const [tinyIsCached, baseIsCached] = await Promise.all([
        isModelLikelyCached("whisper-tiny"),
        isModelLikelyCached("whisper-base"),
      ])

      setCacheStatus({
        "Xenova/whisper-tiny": tinyIsCached,
        "Xenova/whisper-base": baseIsCached,
      })
    }

    checkCache()
  }, [])

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODEL_OPTIONS.map((option) => {
          const isActive = option.id === activeModelId
          const isCached = cacheStatus[option.id]
          const modelSize = getModelApproximateSize(option.id)
          const SpeedIcon = option.speedIcon

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectModel(option.id)}
              className={cn(
                "group relative flex h-full flex-col items-start rounded-lg border-2 p-4 text-left transition-all",
                "hover:shadow-md",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute right-3 top-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}

              {/* Header */}
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                    )}
                  >
                    <SpeedIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">
                    {option.label.split(" —")[0]}
                  </span>
                </div>

                {isCached ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-500"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Cached
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Download className="h-3 w-3" />
                    {modelSize.formatted}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="mt-3 text-xs text-muted-foreground">
                {option.description}
              </p>

              {/* Speed estimate */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium">Speed:</span>
                <span>{option.speedEstimate}</span>
              </div>

              {/* Model ID */}
              <span className="mt-2 font-mono text-[0.65rem] text-muted-foreground/60">
                {option.id}
              </span>
            </button>
          )
        })}
      </div>

      {runtimeLabel && (
        <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">{runtimeLabel}</span>
        </div>
      )}
    </section>
  )
}

