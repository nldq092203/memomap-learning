"use client"

import type React from "react"
import { useCallback } from "react"
import { notificationService } from "@/lib/services/notification-service"
import type { ToastVariant } from "@/lib/toast"

export interface NotificationOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: React.ReactNode
}

export function useNotifications() {
  const success = useCallback(
    (message: string, options?: Pick<NotificationOptions, "duration">) =>
      notificationService.success(message, { duration: options?.duration }),
    []
  )

  const error = useCallback(
    (message: string, options?: Pick<NotificationOptions, "duration">) =>
      notificationService.error(message, { duration: options?.duration }),
    []
  )

  const warning = useCallback(
    (message: string, options?: Pick<NotificationOptions, "duration">) =>
      notificationService.warning(message, { duration: options?.duration }),
    []
  )

  const info = useCallback(
    (message: string, options?: Pick<NotificationOptions, "duration">) =>
      notificationService.info(message, { duration: options?.duration }),
    []
  )

  const withLoading = useCallback(
    async <T>(
      action: () => Promise<T>,
      loadingMessage?: string,
      successMessage?: string,
      errorMessage?: string
    ) => {
      return notificationService.withLoading(action, loadingMessage, successMessage, errorMessage)
    },
    []
  )

  const clearAll = useCallback(() => {
    notificationService.clearAll()
  }, [])

  return {
    success,
    error,
    warning,
    info,
    withLoading,
    clearAll,
  }
}
