/**
 * Detailed Error Handling Utility
 * For development phase - provides verbose error messages
 * TODO: Reduce verbosity for production after app stabilizes
 */

import { toast } from "sonner"

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

  // Build detailed error message
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

  // Log full error to console with data
  console.error("=".repeat(60))
  console.error(`ERROR: ${context.operation}`)
  console.error("=".repeat(60))
  console.error("Error object:", error)
  if (context.table) console.error("Table:", context.table)
  if (context.data) console.error("Data sent:", sanitizeData(context.data))
  console.error("=".repeat(60))

  // Show toast with full details
  toast.error(title, {
    description: description,
    duration: 10000, // Show for 10 seconds during development
    style: {
      whiteSpace: "pre-wrap",
      maxWidth: "500px",
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
    duration: 3000,
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
 * Log debug info during development
 */
export function debugLog(label: string, data: unknown): void {
  console.log(`[DEBUG] ${label}:`, data)
}
