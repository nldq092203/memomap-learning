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
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">
          2. Choisissez votre mode
        </h2>
        <p className="text-xs text-slate-500">
          Choisissez entre un exercice de dictée guidée ou une transcription instantanée.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChangeMode("manual")}
          className={cn(
            "group flex h-full flex-col rounded-[24px] border px-5 py-4 text-left transition-all",
            "hover:border-slate-400 hover:bg-slate-50",
            isManual
              ? "border-slate-700 bg-slate-50 shadow-sm"
              : "border-slate-200 bg-white"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full p-2",
                  isManual
                    ? "bg-slate-200 text-slate-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                )}
              >
                <PenLine className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Exercice de dictée</span>
                <p className="text-xs text-slate-500">Écoutez puis saisissez vous-même le texte.</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                isManual
                  ? "border-slate-300 bg-slate-100 text-slate-700"
                  : "border-slate-200 text-slate-500"
              )}
            >
              {isManual ? "Actif" : "Choisir"}
            </span>
          </div>
          <p className="mt-3 text-[0.8rem] leading-6 text-slate-500">
            Idéal pour travailler l’écoute fine, la concentration et l’orthographe.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("ai")}
          className={cn(
            "group flex h-full flex-col rounded-[24px] border px-5 py-4 text-left transition-all",
            "hover:border-teal-300 hover:bg-teal-50/50",
            isAi
              ? "border-teal-500 bg-teal-50/70 shadow-sm"
              : "border-slate-200 bg-white"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full p-2",
                  isAi
                    ? "bg-teal-100 text-teal-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
                )}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Transcription instantanée</span>
                <p className="text-xs text-slate-500">Obtenez un brouillon complet en quelques instants.</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                isAi
                  ? "border-teal-200 bg-teal-100 text-teal-700"
                  : "border-slate-200 text-slate-500"
              )}
            >
              {isAi ? "Actif" : "Choisir"}
            </span>
          </div>
          <p className="mt-3 text-[0.8rem] leading-6 text-slate-500">
            Votre audio ne quitte jamais votre navigateur. Idéal pour obtenir rapidement une base de travail.
          </p>
        </button>
      </div>
    </section>
  )
}
