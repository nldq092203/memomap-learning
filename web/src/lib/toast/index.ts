/**
 * Toast System - Main Export
 *
 * A clean, reusable toast notification system
 *
 * @example
 * // Import the toast API
 * import { toast } from "@/lib/toast"
 *
 * // Use anywhere in your app
 * toast.success("User created successfully!")
 * toast.error("Failed to save changes")
 * toast.warning("Your session is about to expire")
 * toast.info("New features available!")
 *
 * // Custom duration (in milliseconds)
 * toast.success("Auto-saved", 3000)
 *
 * // Dismiss programmatically
 * const id = toast.info("Processing...")
 * toast.dismiss(id)
 *
 * // Clear all toasts
 * toast.clear()
 */

export { toast } from "@/lib/toast/toast"
export { ToastProvider } from "@/lib/toast/toast-provider"
export { useToast } from "@/lib/toast/use-toast"
export type { Toast, ToastVariant } from "@/lib/toast/toast-store"
