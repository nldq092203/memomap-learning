"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useLearningTimeSession } from "@/lib/contexts/learning-time-session-context"
import { cn } from "@/lib/utils"
import { Pause, Play, Square, X, Clock, Loader2 } from "lucide-react"

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = m.toString().padStart(2, "0")
  const ss = s.toString().padStart(2, "0")
  if (h > 0) {
    return `${h}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

export function LearningSessionTimer() {
  const {
    isActive,
    isPaused,
    name,
    elapsedSeconds,
    plannedSeconds,
    pauseSession,
    resumeSession,
    stopSession,
    cancelSession,
  } = useLearningTimeSession()

  const [isStopping, setIsStopping] = useState(false)
  const { confirm, dialog, setLoading } = useConfirmationDialog()

  if (!isActive) return null

  const displaySeconds = plannedSeconds
    ? Math.max(plannedSeconds - elapsedSeconds, 0)
    : elapsedSeconds

  const progress = plannedSeconds && plannedSeconds > 0
    ? Math.min((elapsedSeconds / plannedSeconds) * 100, 100)
    : null

  const timerContent = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[72px] z-50 flex justify-center px-2 sm:px-4">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-full",
          "border bg-background/95 backdrop-blur-md shadow-lg",
          "px-3 sm:px-4 py-2 max-w-[calc(100vw-1rem)]",
          "transition-all duration-300",
          isPaused && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
          !isPaused && "border-primary/30",
        )}
      >
        {/* Progress bar (for planned sessions) */}
        {progress !== null && (
          <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Timer icon + time */}
        <div className="flex items-center gap-1.5">
          <Clock className={cn("h-3.5 w-3.5", isPaused ? "text-yellow-600" : "text-primary")} />
          <span className={cn(
            "tabular-nums text-sm font-semibold",
            isPaused ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"
          )}>
            {formatElapsed(displaySeconds)}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-border" />

        {/* Session name */}
        <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[150px]" title={name}>
          {name || "Session"}
        </span>

        {/* Paused badge */}
        {isPaused && (
          <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full">
            En pause
          </span>
        )}

        {/* Hidden separator on mobile */}
        <div className="hidden sm:block h-4 w-px bg-border" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isPaused ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-primary/10 text-primary"
              onClick={resumeSession}
              title="Reprendre"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600"
              onClick={pauseSession}
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full hover:bg-primary/10 text-primary"
            disabled={isStopping}
            onClick={() => {
              if (isStopping) return
              confirm({
                title: "Arrêter la session ?",
                description:
                  "Choisissez ce que vous voulez faire avec cette session.\n\nEnregistrer : conserver le temps dans votre historique.\nSupprimer : fermer la session sans l'enregistrer.",
                confirmText: "Enregistrer",
                cancelText: "Continuer",
                onConfirm: async () => {
                  setIsStopping(true)
                  setLoading(true)
                  try {
                    await stopSession()
                  } catch {
                    // errors handled in context
                  } finally {
                    setIsStopping(false)
                    setLoading(false)
                  }
                },
                thirdAction: {
                  text: "Supprimer",
                  variant: "destructive",
                  onAction: () => {
                    cancelSession()
                  },
                },
              })
            }}
            title="Arrêter la session"
          >
            {isStopping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={cancelSession}
            title="Annuler"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(
    <>
      {timerContent}
      {dialog}
    </>,
    document.body,
  )
}
