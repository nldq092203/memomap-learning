"use client"

import { PenLine, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TranscriptionMode } from "@/components/learning/transcribe/transcribe-types"

type TranscribeModeSectionProps = {
  mode: TranscriptionMode
  onChangeMode: (mode: TranscriptionMode) => void
}

export function TranscribeModeSection({
  mode,
  onChangeMode,
}: TranscribeModeSectionProps) {
  const isManual = mode === "manual"
  const isAi = mode === "ai"

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          Transcription mode
        </h2>
        <p className="text-xs text-muted-foreground">
          Choose how you want to create the transcript for this audio.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChangeMode("manual")}
          className={cn(
            "group flex h-full flex-col rounded-lg border px-4 py-3 text-left transition-all",
            "hover:border-primary/40 hover:bg-primary/5",
            isManual
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full p-1.5",
                  isManual
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <PenLine className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">Manual transcription</span>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                isManual
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {isManual ? "Selected" : "Use"}
            </span>
          </div>
          <p className="mt-2 text-[0.75rem] text-muted-foreground">
            Type the transcript yourself while listening. Ideal for dictation
            practice or close listening.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("ai")}
          className={cn(
            "group flex h-full flex-col rounded-lg border px-4 py-3 text-left transition-all",
            "hover:border-primary/40 hover:bg-primary/5",
            isAi
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full p-1.5",
                  isAi
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">Whisper AI</span>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                isAi
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {isAi ? "Selected" : "Use"}
            </span>
          </div>
          <p className="mt-2 text-[0.75rem] text-muted-foreground">
            Let Whisper transcribe automatically in your browser using a cached
            model. Best when you want a full draft quickly.
          </p>
        </button>
      </div>
    </section>
  )
}

