/**
 * Detailed Error Handling Utility
 * Provides user-friendly error messages with appropriate verbosity by environment.
 * Production: Minimal console output, user-friendly toasts
 * Development: Verbose logging for debugging
 */

import { toast } from "sonner"
import { TOAST_DURATION_DEFAULT_MS, TOAST_DURATION_ERROR_MS, TOAST_MAX_WIDTH_PX } from "@/lib/constants"

// Environment-based logging control
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const VERBOSE_LOGGING = !IS_PRODUCTION

interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

interface ErrorContext {
  operation: string // e.g., "creating tenant", "updating payment"
  table?: string // e.g., "tenants", "payments"
  data?: Record<string, unknown> // The data being sent (will be sanitized)
}

/**
 * Sanitize data for logging - remove sensitive fields
 */
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["password", "token", "secret", "key", "authorization"]
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
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
 * Get user-friendly message from Supabase error code
 */
function getErrorCodeMessage(code: string): string {
  const errorCodes: Record<string, string> = {
    // PostgreSQL error codes
    "23505": "Duplicate entry - this record already exists",
    "23503": "Foreign key violation - referenced record doesn't exist",
    "23502": "Required field is missing (NOT NULL violation)",
    "23514": "Check constraint violation - value out of allowed range",
    "42501": "Permission denied - RLS policy blocking access",
    "42P01": "Table doesn't exist",
    "42703": "Column doesn't exist in table",
    "22P02": "Invalid input syntax for type",
    "22001": "Value too long for column",
    "22007": "Invalid date/time format",
    "22003": "Number out of range",
    "28000": "Invalid authorization",
    "28P01": "Invalid password",
    "3D000": "Database does not exist",
    "57P03": "Cannot connect to server",
    "PGRST116": "No rows returned when one expected (single() failed)",
    "PGRST204": "Column not found in schema",
    // Supabase specific
    "PGRST301": "JWT expired",
    "PGRST302": "JWT invalid",
  }

  return errorCodes[code] || `Unknown error code: ${code}`
}

/**
 * Show detailed error toast notification
 */
export function showDetailedError(
  error: SupabaseError | Error | unknown,
  context: ErrorContext
): void {
  const errorObj = error as SupabaseError

  // Build error message (verbose in development, user-friendly in production)
  let title = `Failed: ${context.operation}`
  let description = ""

  // Add error message
  if (errorObj?.message) {
    description += errorObj.message
  } else if (error instanceof Error) {
    description += error.message
  } else {
    description += "An unknown error occurred"
  }

  // In development, add technical details for debugging
  if (VERBOSE_LOGGING) {
    // Add error code explanation
    if (errorObj?.code) {
      description += `\n\nError Code: ${errorObj.code}\n${getErrorCodeMessage(errorObj.code)}`
    }

    // Add hint if available
    if (errorObj?.hint) {
      description += `\n\nHint: ${errorObj.hint}`
    }

    // Add details if available
    if (errorObj?.details) {
      description += `\n\nDetails: ${errorObj.details}`
    }

    // Add table context
    if (context.table) {
      description += `\n\nTable: ${context.table}`
    }
  } else {
    // Production: Add user-friendly help text
    if (errorObj?.code === "42501") {
      description = "You don't have permission to perform this action."
    } else if (errorObj?.code === "23505") {
      description = "This record already exists."
    } else if (errorObj?.code === "23503") {
      description = "A required related record was not found."
    }
  }

  // Log full error to console with data (verbose in development only)
  if (VERBOSE_LOGGING) {
    console.error("=".repeat(60))
    console.error(`ERROR: ${context.operation}`)
    console.error("=".repeat(60))
    console.error("Error object:", error)
    if (context.table) console.error("Table:", context.table)
    if (context.data) console.error("Data sent:", sanitizeData(context.data))
    console.error("=".repeat(60))
  } else {
    // Production: minimal logging
    console.error(`[Error] ${context.operation}:`, errorObj?.code || "unknown")
  }

  // CQ-010: Show toast with full details using named constants
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
  toast.success(`Success: ${operation}`, {
    description: details,
    duration: TOAST_DURATION_DEFAULT_MS,
  })
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
 * Log debug info during development only
 * In production, this is a no-op for performance
 */
export function debugLog(label: string, data: unknown): void {
  if (VERBOSE_LOGGING) {
    console.log(`[DEBUG] ${label}:`, data)
  }
}
