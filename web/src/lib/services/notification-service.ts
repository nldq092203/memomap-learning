"use client"

import { toast } from "@/lib/toast"

/**
 * Notification Service
 * Wrapper around the toast API for backward compatibility
 * and additional features like loading states
 *
 * @example
 * import { notificationService } from "@/lib/services/notification-service"
 *
 * notificationService.success("Saved!")
 * notificationService.error("Failed to save")
 */

export interface NotificationOptions {
  duration?: number
}

export class NotificationService {
  private static instance: NotificationService

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Show success notification
   */
  success(message: string, options?: NotificationOptions): string {
    return toast.success(message, options?.duration)
  }

  /**
   * Show error notification
   */
  error(message: string, options?: NotificationOptions): string {
    return toast.error(message, options?.duration)
  }

  /**
   * Show warning notification
   */
  warning(message: string, options?: NotificationOptions): string {
    return toast.warning(message, options?.duration)
  }

  /**
   * Show info notification
   */
  info(message: string, options?: NotificationOptions): string {
    return toast.info(message, options?.duration)
  }

  /**
   * Execute action with loading toast
   */
  async withLoading<T>(
    action: () => Promise<T>,
    loadingMessage: string = "Loading...",
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> {
    const loadingId = toast.info(loadingMessage, 0) // 0 = don't auto-dismiss

    try {
      const result = await action()

      // Remove loading toast
      if (loadingId) {
        toast.dismiss(loadingId)
      }

      // Show success toast
      if (successMessage) {
        toast.success(successMessage)
      }

      return result
    } catch (error) {
      // Remove loading toast
      if (loadingId) {
        toast.dismiss(loadingId)
      }

      // Show error toast
      const message =
        errorMessage || (error instanceof Error ? error.message : "An error occurred")
      toast.error(message)

      return null
    }
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    toast.clear()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
