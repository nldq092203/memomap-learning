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
  const { isGuest, setShowLoginPrompt } = useGuest()

  if (!isGuest) return null

  return (
    <div
      className={[
        "flex flex-col gap-3 overflow-hidden rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 px-4 py-4 shadow-[0_14px_34px_rgba(74,51,35,0.08)] sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--vintage-cream)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vintage-desert-rock)]">
          <Sparkles className="h-3.5 w-3.5" />
          Mode invité
        </div>
        <p className="text-sm font-semibold text-[var(--vintage-ink)]">{title}</p>
        <p className="break-words text-sm leading-relaxed text-[var(--vintage-muted-ink)]">{description}</p>
      </div>

      <Button
        type="button"
        className="w-full rounded-full bg-[var(--vintage-desert-rock)] text-white hover:bg-[#8f7763] sm:w-auto sm:shrink-0"
        onClick={() => setShowLoginPrompt(true)}
      >
        Se connecter
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
