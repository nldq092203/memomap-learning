"use client"

import { toastStore } from "./toast-store"

/**
 * Centralized Toast API
 * Call these functions from anywhere in your app
 *
 * @example
 * import { toast } from "@/lib/toast/toast"
 *
 * toast.success("Operation completed!")
 * toast.error("Something went wrong")
 * toast.warning("Be careful!")
 * toast.info("Did you know?")
 */

export const toast = {
  /**
   * Show a success toast
   */
  success(message: string, duration?: number): string {
    return toastStore.add(message, "success", duration)
  },

  /**
   * Show an error toast
   */
  error(message: string, duration?: number): string {
    return toastStore.add(message, "error", duration)
  },

  /**
   * Show a warning toast
   */
  warning(message: string, duration?: number): string {
    return toastStore.add(message, "warning", duration)
  },

  /**
   * Show an info toast
   */
  info(message: string, duration?: number): string {
    return toastStore.add(message, "info", duration)
  },

  /**
   * Show a default toast
   */
  default(message: string, duration?: number): string {
    return toastStore.add(message, "default", duration)
  },

  /**
   * Remove a specific toast by ID
   */
  dismiss(id: string): void {
    toastStore.remove(id)
  },

  /**
   * Clear all toasts
   */
  clear(): void {
    toastStore.clear()
  },
}

/**
 * React hook to use toast in components
 */
export { useToast } from "./use-toast"
