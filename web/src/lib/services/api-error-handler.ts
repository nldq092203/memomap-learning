"use client"

import { AxiosError } from 'axios'
import { authService } from './auth'
import { notificationService } from './notification-service'

export interface ApiErrorHandlerOptions {
  showToast?: boolean
  redirectToLogin?: boolean
  customMessage?: string
}

class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private isHandling401 = false // Prevent multiple simultaneous 401 handling

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * Handle API errors, specifically 401 Unauthorized
   */
  async handleError(error: unknown, options: ApiErrorHandlerOptions = {}): Promise<void> {
    const {
      showToast = true,
      redirectToLogin = true,
      customMessage
    } = options

    // Check if it's an Axios error with 401 status
    if (this.isAxiosError(error) && error.response?.status === 401) {
      await this.handle401Error(showToast, redirectToLogin, customMessage)
    } else {
      // Handle other errors
      console.error('API Error:', error)
      if (showToast && !customMessage) {
        notificationService.error('An unexpected error occurred. Please try again.')
      } else if (showToast && customMessage) {
        notificationService.error(customMessage)
      }
    }
  }

  /**
   * Handle 401 Unauthorized errors
   */
  private async handle401Error(
    showToast: boolean, 
    redirectToLogin: boolean, 
    customMessage?: string
  ): Promise<void> {
    // Prevent multiple simultaneous 401 handling
    if (this.isHandling401) {
      return
    }

    this.isHandling401 = true

    try {
      // Clear any existing auth data
      await authService.logout()

      // Show user notification
      if (showToast) {
        const message = customMessage || 'Your session has expired. Please log in again.'
        notificationService.error(message)
      }

      // Redirect to login page (preserve return path)
      if (redirectToLogin) {
        // Use a small delay to ensure the toast is visible
        setTimeout(() => {
          try {
            const returnTo = window.location.pathname + window.location.search
            sessionStorage.setItem('auth_return_to', returnTo)
          } catch {}
          window.location.href = '/'
        }, 1500)
      }
    } catch (error) {
      console.error('Error handling 401:', error)
    } finally {
      this.isHandling401 = false
    }
  }

  /**
   * Check if error is an Axios error
   */
  private isAxiosError(error: unknown): error is AxiosError {
    if (error === null || typeof error !== 'object') {
      return false
    }
    const err = error as { isAxiosError?: boolean }
    return err.isAxiosError === true
  }

  /**
   * Reset the 401 handling flag (useful for testing)
   */
  reset(): void {
    this.isHandling401 = false
  }
}

export const apiErrorHandler = ApiErrorHandler.getInstance()

// Export the class for advanced usage
export { ApiErrorHandler }
