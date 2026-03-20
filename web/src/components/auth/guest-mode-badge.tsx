"use client"

import { UserCircle } from "lucide-react"
import { useGuest } from "@/lib/contexts/guest-context"

export function GuestModeBadge() {
  const { isGuest } = useGuest()

  if (!isGuest) return null

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
      title="Votre progression est temporaire en mode invité."
      aria-label="Mode invité actif"
    >
      <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Mode Invité</span>
    </div>
  )
}
