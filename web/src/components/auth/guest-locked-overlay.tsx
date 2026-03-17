"use client"

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuest } from "@/lib/contexts/guest-context"

// ─── GuestLockedOverlay ──────────────────────────────────────────────
// Reusable overlay that dims a card/module and shows a 🔒 pill.
// Clicking on the overlaid item triggers the Sync & Save modal.
//
// Usage:
//   <GuestLockedOverlay label="Connectez-vous">
//     <SomeCard />
//   </GuestLockedOverlay>
// ─────────────────────────────────────────────────────────────────────

interface GuestLockedOverlayProps {
  children: React.ReactNode
  /** Text shown in the lock pill (default: "Connectez-vous") */
  label?: string
  /** Extra classes on the wrapper */
  className?: string
  /** If true, renders children normally (no overlay). Set to true for allowed items. */
  allowed?: boolean
}

export function GuestLockedOverlay({
  children,
  label = "Connectez-vous",
  className,
  allowed = false,
}: GuestLockedOverlayProps) {
  const { isGuest, setShowSyncModal } = useGuest()

  // Not a guest or explicitly allowed → render normally
  if (!isGuest || allowed) {
    return <>{children}</>
  }

  return (
    <div
      className={cn("relative group cursor-pointer", className)}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setShowSyncModal(true)
      }}
    >
      {/* Dimmed content */}
      <div className="pointer-events-none select-none opacity-40 grayscale-[40%] transition-opacity group-hover:opacity-50">
        {children}
      </div>

      {/* Lock pill */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all group-hover:border-primary/40 group-hover:text-primary group-hover:shadow-md">
          <Lock className="h-3 w-3" />
          {label}
        </span>
      </div>
    </div>
  )
}
