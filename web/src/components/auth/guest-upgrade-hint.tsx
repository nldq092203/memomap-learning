"use client"

import { Button } from "@/components/ui/button"
import { useGuest } from "@/lib/contexts/guest-context"
import { ArrowRight, Sparkles } from "lucide-react"

interface GuestUpgradeHintProps {
  title?: string
  description: string
  className?: string
}

export function GuestUpgradeHint({
  title = "Débloquez la suite",
  description,
  className,
}: GuestUpgradeHintProps) {
  const { isGuest, setShowSyncModal } = useGuest()

  if (!isGuest) return null

  return (
    <div
      className={[
        "flex flex-col gap-3 overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(240,249,255,0.92))] px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          Mode invité
        </div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="break-words text-sm leading-relaxed text-slate-600">{description}</p>
      </div>

      <Button
        type="button"
        className="w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto sm:shrink-0"
        onClick={() => setShowSyncModal(true)}
      >
        Se connecter
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
