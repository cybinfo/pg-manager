/**
 * Centralized Client-Side Error Handler
 *
 * Provides consistent error extraction, logging, and toast notifications
 * across all client-side catch blocks in the application.
 *
 * Usage:
 * ```typescript
 * import { handleClientError, handleSilentError, getErrorMessage } from "@/lib/error-handler"
 *
 * // In catch blocks — logs + shows toast
 * try {
 *   await someOperation()
 * } catch (error) {
 *   handleClientError(error, "Creating tenant")
 * }
 *
 * // Silent — logs + returns message string (no toast)
 * try {
 *   await someOperation()
 * } catch (error) {
 *   const msg = handleSilentError(error, "Fetching report data")
 *   setErrorState(msg)
 * }
 *
 * // Just extract the message (no side effects)
 * const msg = getErrorMessage(error)
 * ```
 */

import { showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"

// ============================================================================
// TYPES
// ============================================================================

/** Shape of Supabase/PostgREST errors */
interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

/** Shape of API error responses from our own endpoints */
interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================================================
// SUPABASE ERROR CODE MAPPING
// ============================================================================

/**
 * Maps PostgreSQL/PostgREST error codes to user-friendly messages.
 * Only includes codes we want to override — anything else falls through
 * to the raw error.message.
 */
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists",
  "23503": "A required related record was not found",
  "23502": "A required field is missing",
  "23514": "A value is outside the allowed range",
  "42501": "You don't have permission to perform this action",
  "42P01": "Table not found — please contact support",
  "42703": "Invalid column reference — please contact support",
  "22P02": "Invalid input format",
  "22001": "A value is too long for the field",
  "22007": "Invalid date or time format",
  "22003": "Number is out of range",
  "57P03": "Cannot connect to the database — please try again later",
  PGRST116: "Record not found",
  PGRST301: "Session expired — please log in again",
  PGRST302: "Session is invalid — please log in again",
}

// ============================================================================
// ERROR MESSAGE EXTRACTION
// ============================================================================

/**
 * Extract a user-friendly message from various error shapes.
 *
 * Handles:
 * - Supabase errors ({ message, code, details, hint })
 * - Our API error responses ({ success: false, error: { message } })
 * - Standard JS Error objects
 * - String errors
 * - Unknown/null/undefined
 */
export function getErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "An unexpected error occurred"
  }

  // String thrown directly
  if (typeof error === "string") {
    return error
  }

  // Object-shaped errors (Supabase, API, or Error instances)
  if (typeof error === "object") {
    const err = error as Record<string, unknown>

    // Supabase/PostgREST error with a code we can map to a friendly message
    if (typeof err.code === "string" && err.code in POSTGRES_ERROR_MESSAGES) {
      return POSTGRES_ERROR_MESSAGES[err.code]
    }

    // Our own API error response shape: { success: false, error: { message } }
    if (err.success === false && typeof err.error === "object" && err.error !== null) {
      const apiErr = err as unknown as ApiErrorBody
      if (apiErr.error.message) {
        return apiErr.error.message
      }
    }

    // Standard Error or Supabase error with a message field
    if (typeof err.message === "string" && err.message.length > 0) {
      return err.message
    }

    // error.details as a fallback (some PostgREST errors only have details)
    if (typeof err.details === "string" && err.details.length > 0) {
      return err.details
    }
  }

  return "An unexpected error occurred"
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handle a client-side error: log it and show a toast.
 *
 * @param error - The caught error (any shape)
 * @param context - Human-readable context, e.g. "Creating tenant" or "Fetching payments"
 */
export function handleClientError(error: unknown, context: string): void {
  const message = getErrorMessage(error)
  logger.error(`${context}: ${message}`, { error: summarizeError(error) })
  showError(message)
}

/**
 * Handle a client-side error silently: log it and return the message (no toast).
 * Useful when you want to set local error state instead of toasting.
 *
 * @param error - The caught error (any shape)
 * @param context - Human-readable context
 * @returns The user-friendly error message string
 */
export function handleSilentError(error: unknown, context: string): string {
  const message = getErrorMessage(error)
  logger.error(`${context}: ${message}`, { error: summarizeError(error) })
  return message
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Create a loggable summary of an error without circular references.
 */
function summarizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }
  }

  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>
    return {
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
    }
  }

  return { raw: String(error) }
}
