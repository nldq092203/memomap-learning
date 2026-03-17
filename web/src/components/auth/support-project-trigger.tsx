"use client"

import { useState } from "react"
import { Coffee } from "lucide-react"
import { SupportProjectModal } from "@/components/auth/support-project-modal"
import { cn } from "@/lib/utils"

interface SupportProjectTriggerProps {
  variant?: "nav" | "result"
  className?: string
}

export function SupportProjectTrigger({
  variant = "result",
  className,
}: SupportProjectTriggerProps) {
  const [open, setOpen] = useState(false)

  const triggerCardClassName =
    "rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-teal-50/70 shadow-[0_10px_30px_-24px_rgba(13,148,136,0.5)]"

  if (variant === "nav") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:border-teal-300",
            triggerCardClassName,
            className
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
            <Coffee className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Soutenir MemoMap</p>
            <p className="text-xs text-slate-600">Un café pour garder le projet vivant.</p>
          </div>
        </button>
        <SupportProjectModal open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:border-teal-300",
          triggerCardClassName,
          className
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
          <Coffee className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Vous avez trouvé cela utile ?</p>
          <p className="text-xs text-slate-600">
            Un petit café aide à financer l&apos;API Gemini et le serveur.
          </p>
        </div>
      </button>
      <SupportProjectModal open={open} onOpenChange={setOpen} />
    </>
  )
}
