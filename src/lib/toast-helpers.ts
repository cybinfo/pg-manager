/**
 * Centralized Toast Notification Helpers
 *
 * Wraps the sonner toast library to provide consistent
 * notification behavior across the application.
 *
 * Usage:
 * ```typescript
 * import { showSuccess, showError } from "@/lib/toast-helpers"
 *
 * showSuccess("Payment recorded successfully")
 * showError("Failed to save changes")
 * showError("Validation failed", "Please check all required fields")
 * ```
 */

import { toast } from "sonner"
import { TOAST_DURATION_DEFAULT_MS, TOAST_DURATION_ERROR_MS } from "@/lib/constants"

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, {
    duration: TOAST_DURATION_DEFAULT_MS,
    description,
  })
}

/**
 * Show an error toast notification
 */
export function showError(message: string, description?: string): void {
  toast.error(message, {
    duration: TOAST_DURATION_ERROR_MS,
    description,
  })
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, description?: string): void {
  toast.info(message, {
    duration: TOAST_DURATION_DEFAULT_MS,
    description,
  })
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, description?: string): void {
  toast.warning(message, {
    duration: TOAST_DURATION_ERROR_MS,
    description,
  })
}

// Re-export raw toast for advanced use cases (custom rendering, promises, etc.)
export { toast }
