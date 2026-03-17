"use client"

import { useState, useRef, useEffect } from "react"
import { UserCircle } from "lucide-react"
import { useGuest } from "@/lib/contexts/guest-context"

export function GuestModeBadge() {
  const { isGuest } = useGuest()
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)

  // Close tooltip on click outside
  useEffect(() => {
    if (!showTooltip) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTooltip])

  if (!isGuest) return null

  return (
    <div className="relative">
      <button
        ref={badgeRef}
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/50 hover:bg-primary/20 active:scale-95 transition-all"
      >
        <UserCircle className="h-3.5 w-3.5" />
        <span>Mode Invité</span>
      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute right-0 top-full z-50 mt-2 w-64 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60">
            <p className="text-xs leading-relaxed text-slate-600">
              Votre progression est temporaire. Connectez-vous pour sauvegarder vos données sur Google Drive.
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Your progress is temporary. Sign in to save your data to Google Drive.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
