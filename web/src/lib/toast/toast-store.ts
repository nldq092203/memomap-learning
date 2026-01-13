"use client"

/**
 * Global Toast Store
 * Centralized state management for toast notifications
 */

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration: number
  createdAt: number
}

type ToastListener = (toasts: Toast[]) => void

class ToastStore {
  private toasts: Toast[] = []
  private listeners: Set<ToastListener> = new Set()

  /**
   * Subscribe to toast updates
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current toasts
   */
  getToasts(): Toast[] {
    return this.toasts
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  /**
   * Add a new toast
   */
  add(message: string, variant: ToastVariant = "default", duration: number = 5000): string {
    // Prevent duplicate toasts with same message and variant
    const existingToast = this.toasts.find(
      t => t.message === message && t.variant === variant
    )

    if (existingToast) {
      // Return existing toast ID instead of empty string to avoid key conflicts
      return existingToast.id
    }

    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const newToast: Toast = {
      id,
      message,
      variant,
      duration,
      createdAt: Date.now(),
    }

    // Only keep one toast per variant to avoid clutter
    this.toasts = this.toasts.filter(t => t.variant !== variant)
    this.toasts.push(newToast)

    this.notify()

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, duration)
    }

    return id
  }

  /**
   * Remove a toast by ID
   */
  remove(id: string): void {
    const prevLength = this.toasts.length
    this.toasts = this.toasts.filter(t => t.id !== id)

    if (this.toasts.length !== prevLength) {
      this.notify()
    }
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    if (this.toasts.length > 0) {
      this.toasts = []
      this.notify()
    }
  }
}

// Export singleton instance
export const toastStore = new ToastStore()
