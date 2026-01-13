"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Toast, ToastVariant } from "./toast-store"

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}
const variantConfig: Record<ToastVariant, { icon: React.ComponentType<{ className?: string }>; className: string; iconClassName: string }> = {
  default: {
    icon: Info,
    className: "border-gray-300 bg-white text-slate-900",
    iconClassName: "text-slate-500",
  },
  success: {
    icon: CheckCircle2,
    className: "border-l-4 border-emerald-500 bg-white text-slate-900",
    iconClassName: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-l-4 border-red-500 bg-white text-slate-900",
    iconClassName: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-l-4 border-amber-500 bg-white text-slate-900",
    iconClassName: "text-amber-600",
  },
  info: {
    icon: Info,
    className: "border-l-4 border-sky-500 bg-white text-slate-900",
    iconClassName: "text-sky-600",
  },
}


export function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const config = variantConfig[toast.variant]
  const Icon = config.icon

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for exit animation
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        "min-w-[320px] max-w-[420px] w-full",
        "transition-all duration-200 ease-out",
        config.className,
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconClassName)} />
      <p className="flex-1 text-sm font-medium leading-snug break-words pr-2 whitespace-pre-wrap">
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 rounded-md p-1.5 mt-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-label="Close notification"
        tabIndex={0}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
