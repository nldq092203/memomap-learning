"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { toastStore, type Toast } from "./toast-store"

/**
 * React hook to subscribe to toast updates
 * Uses useSyncExternalStore for optimal React 18+ integration
 */
export function useToast(): Toast[] {
  const toasts = useSyncExternalStore(
    (callback) => toastStore.subscribe(callback),
    () => toastStore.getToasts(),
    () => toastStore.getToasts()
  )

  return toasts
}

/**
 * Alternative simpler hook using useState
 * Can be used if useSyncExternalStore has issues
 */
export function useToastSimple(): Toast[] {
  const [toasts, setToasts] = useState<Toast[]>(toastStore.getToasts())

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setToasts)
    return unsubscribe
  }, [])

  return toasts
}
