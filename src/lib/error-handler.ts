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

import { showError, showSuccess, toast } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import { TOAST_DURATION_ERROR_MS, TOAST_MAX_WIDTH_PX } from "@/lib/constants"

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
  "28000": "Invalid authorization",
  "28P01": "Invalid password",
  "3D000": "Database does not exist — please contact support",
  "57P03": "Cannot connect to the database — please try again later",
  PGRST116: "Record not found",
  PGRST204: "Column not found in schema — please contact support",
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

// ============================================================================
// DETAILED ERROR UTILITIES (migrated from error-utils.ts)
// ============================================================================

// Environment-based logging control
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const VERBOSE_LOGGING = !IS_PRODUCTION

interface ErrorContext {
  operation: string
  table?: string
  data?: Record<string, unknown>
}

/**
 * Sanitize data for logging - remove sensitive fields
 */
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["password", "token", "secret", "key", "authorization"]
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some((f: string) => key.toLowerCase().includes(f))) {
      sanitized[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = Array.isArray(value)
        ? `[Array: ${value.length} items]`
        : "[Object]"
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Show detailed error toast notification.
 * In production: user-friendly messages. In development: verbose debugging info.
 */
export function showDetailedError(
  error: SupabaseError | Error | unknown,
  context: ErrorContext
): void {
  const errorObj = error as SupabaseError
  const title = `Failed: ${context.operation}`
  let description = ""

  if (errorObj?.message) {
    description += errorObj.message
  } else if (error instanceof Error) {
    description += error.message
  } else {
    description += "An unknown error occurred"
  }

  if (VERBOSE_LOGGING) {
    if (errorObj?.code) {
      const friendlyMsg = POSTGRES_ERROR_MESSAGES[errorObj.code] || `Unknown error code: ${errorObj.code}`
      description += `\n\nError Code: ${errorObj.code}\n${friendlyMsg}`
    }
    if (errorObj?.hint) description += `\n\nHint: ${errorObj.hint}`
    if (errorObj?.details) description += `\n\nDetails: ${errorObj.details}`
    if (context.table) description += `\n\nTable: ${context.table}`
  } else {
    if (errorObj?.code === "42501") {
      description = "You don't have permission to perform this action."
    } else if (errorObj?.code === "23505") {
      description = "This record already exists."
    } else if (errorObj?.code === "23503") {
      description = "A required related record was not found."
    }
  }

  if (VERBOSE_LOGGING) {
    console.error("=".repeat(60))
    console.error(`ERROR: ${context.operation}`)
    console.error("=".repeat(60))
    console.error("Error object:", error)
    if (context.table) console.error("Table:", context.table)
    if (context.data) console.error("Data sent:", sanitizeData(context.data))
    console.error("=".repeat(60))
  } else {
    console.error(`[Error] ${context.operation}:`, errorObj?.code || "unknown")
  }

  toast.error(title, {
    description: description,
    duration: TOAST_DURATION_ERROR_MS,
    style: {
      whiteSpace: "pre-wrap",
      maxWidth: `${TOAST_MAX_WIDTH_PX}px`,
    },
  })
}

/**
 * Show detailed success toast (for debugging)
 */
export function showDetailedSuccess(
  operation: string,
  details?: string
): void {
  showSuccess(`Success: ${operation}`, details)
}

/**
 * Wrap an async operation with detailed error handling
 */
export async function withDetailedErrors<T>(
  operation: () => Promise<{ data: T | null; error: SupabaseError | null }>,
  context: ErrorContext
): Promise<{ data: T | null; success: boolean }> {
  try {
    const { data, error } = await operation()

    if (error) {
      showDetailedError(error, context)
      return { data: null, success: false }
    }

    return { data, success: true }
  } catch (err) {
    showDetailedError(err, context)
    return { data: null, success: false }
  }
}

/**
 * Log debug info during development only.
 * In production, this is a no-op for performance.
 */
export function debugLog(label: string, data: unknown): void {
  if (VERBOSE_LOGGING) {
    console.log(`[DEBUG] ${label}:`, data)
  }
}
