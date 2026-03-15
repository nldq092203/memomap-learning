"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { WhisperModelId } from "@/components/learning/transcribe/transcribe-types"
import {
  isModelLikelyCached,
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
  emphasis: string
  speedIcon: typeof Zap | typeof ShieldCheck
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "Xenova/whisper-tiny",
    label: "Rapide",
    description: "Pour lancer un premier brouillon sans attendre.",
    emphasis: "Priorité à la vitesse",
    speedIcon: Zap,
  },
  {
    id: "Xenova/whisper-base",
    label: "Précis",
    description: "Pour une transcription plus propre et plus fiable.",
    emphasis: "Priorité à la qualité",
    speedIcon: ShieldCheck,
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
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">
          Modèle IA
        </h2>
        <p className="text-xs text-slate-500">
          Choisissez entre une exécution rapide ou une meilleure qualité de transcription.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODEL_OPTIONS.map((option) => {
          const isActive = option.id === activeModelId
          const isCached = cacheStatus[option.id]
          const SpeedIcon = option.speedIcon

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectModel(option.id)}
              className={cn(
                "group relative flex h-full flex-col items-start rounded-[24px] border-2 p-5 text-left transition-all",
                "hover:shadow-md hover:border-teal-300",
                isActive
                  ? "border-teal-500 bg-teal-50/60 shadow-sm"
                  : "border-slate-200 bg-white"
              )}
            >
              {isActive && (
                <div className="absolute right-3 top-3">
                  <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                </div>
              )}

              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "rounded-xl p-2 transition-colors",
                      isActive
                        ? "bg-teal-100 text-teal-700"
                        : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
                    )}
                  >
                    <SpeedIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">
                    {option.label}
                  </span>
                </div>

                {isCached ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Prêt
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-slate-200 text-slate-500">
                    À télécharger
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {option.description}
              </p>

              <div className="mt-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {option.emphasis}
              </div>
            </button>
          )
        })}
      </div>

      {runtimeLabel && (
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">{runtimeLabel}</span>
        </div>
      )}
    </section>
  )
}
