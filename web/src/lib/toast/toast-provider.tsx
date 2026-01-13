"use client"

import { useToast } from "./use-toast"
import { ToastItem } from "./toast-item"
import { toastStore } from "./toast-store"
import { Z_INDEX } from "@/lib/utils/z-index-manager"

/**
 * Toast Provider Component
 * Renders all active toasts in the top-right corner
 *
 * Usage:
 * Add this component once in your root layout
 *
 * @example
 * <ToastProvider />
 */
export function ToastProvider() {
  const toasts = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none"
      style={{ zIndex: Z_INDEX.TOAST }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => toastStore.remove(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}
