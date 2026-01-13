/**
 * Z-Index Management System
 * Provides consistent z-index values across the application
 */

export const Z_INDEX = {
  // Base layers (0-999)
  BASE: 0,
  DROPDOWN: 50,
  STICKY: 100,

  // Overlays (1000-1999)
  FLOATING_WINDOW_BASE: 1000,
  TOOLTIP: 1500,

  // Modals and dialogs (2000-2999)
  MODAL_BACKDROP: 2000,
  MODAL_CONTENT: 2001,

  // Toast notifications (9000-9999)
  TOAST: 9999,
} as const

/**
 * Get the next available z-index for floating windows
 * Floating windows increment from BASE and are capped below modals
 */
let floatingWindowIndex = Z_INDEX.FLOATING_WINDOW_BASE

export function getNextFloatingWindowZIndex(): number {
  floatingWindowIndex += 1
  // Cap at modal backdrop to prevent windows from going above modals
  return Math.min(floatingWindowIndex, Z_INDEX.MODAL_BACKDROP - 1)
}

export function resetFloatingWindowZIndex(): void {
  floatingWindowIndex = Z_INDEX.FLOATING_WINDOW_BASE
}

/**
 * Get z-index for modal components
 * Modals always appear above floating windows
 */
export function getModalZIndex(): { backdrop: number; content: number } {
  return {
    backdrop: Z_INDEX.MODAL_BACKDROP,
    content: Z_INDEX.MODAL_CONTENT,
  }
}
