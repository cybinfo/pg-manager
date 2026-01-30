/**
 * Supabase Error Helpers
 *
 * Centralized error handling for Supabase operations.
 * Eliminates duplicate error handling patterns across 196+ occurrences.
 *
 * @example
 * import { handleQueryResult, handleMutationResult } from "@/lib/supabase/error-helpers"
 *
 * const result = await handleQueryResult(
 *   supabase.from("tenants").select().eq("id", id).single(),
 *   "Tenant"
 * )
 * if (!result.success) return result.response
 */

import { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js"
import { notFound, internalError, badRequest } from "@/lib/api-response"

// ============================================================================
// TYPES
// ============================================================================

interface SuccessResult<T> {
  success: true
  data: T
  response?: never
}

interface ErrorResult {
  success: false
  data?: never
  response: Response
}

type QueryResult<T> = SuccessResult<T> | ErrorResult

interface SupabaseQueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

// ============================================================================
// QUERY RESULT HANDLERS
// ============================================================================

/**
 * Handle a Supabase query result (SELECT operations)
 * Returns success with data, or error response for common failure cases
 *
 * @example
 * const result = await handleQueryResult(
 *   supabase.from("tenants").select().eq("id", id).single(),
 *   "Tenant"
 * )
 * if (!result.success) return result.response
 * const tenant = result.data
 */
export async function handleQueryResult<T>(
  query: Promise<SupabaseQueryResult<T>>,
  entityName: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await query

    if (error) {
      console.error(`[${entityName}] Query error:`, error)

      // Handle specific error codes
      if (error.code === "PGRST116") {
        // No rows returned
        return {
          success: false,
          response: notFound(entityName),
        }
      }

      return {
        success: false,
        response: internalError(`Failed to fetch ${entityName.toLowerCase()}`),
      }
    }

    if (data === null) {
      return {
        success: false,
        response: notFound(entityName),
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error(`[${entityName}] Unexpected error:`, err)
    return {
      success: false,
      response: internalError(`Unexpected error fetching ${entityName.toLowerCase()}`),
    }
  }
}

/**
 * Handle a Supabase list query result (SELECT with multiple rows)
 * Returns empty array instead of error for no results
 *
 * @example
 * const result = await handleListResult(
 *   supabase.from("tenants").select()
 * )
 * if (!result.success) return result.response
 * const tenants = result.data // T[]
 */
export async function handleListResult<T>(
  query: Promise<SupabaseQueryResult<T[]>>,
  entityName = "records"
): Promise<QueryResult<T[]>> {
  try {
    const { data, error } = await query

    if (error) {
      console.error(`[${entityName}] List query error:`, error)
      return {
        success: false,
        response: internalError(`Failed to fetch ${entityName.toLowerCase()}`),
      }
    }

    return { success: true, data: data ?? [] }
  } catch (err) {
    console.error(`[${entityName}] Unexpected error:`, err)
    return {
      success: false,
      response: internalError(`Unexpected error fetching ${entityName.toLowerCase()}`),
    }
  }
}

// ============================================================================
// MUTATION RESULT HANDLERS
// ============================================================================

/**
 * Handle a Supabase mutation result (INSERT/UPDATE/DELETE)
 *
 * @example
 * const result = await handleMutationResult(
 *   supabase.from("tenants").insert(data).select().single(),
 *   "Tenant",
 *   "create"
 * )
 * if (!result.success) return result.response
 */
export async function handleMutationResult<T>(
  query: Promise<SupabaseQueryResult<T>>,
  entityName: string,
  operation: "create" | "update" | "delete"
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await query

    if (error) {
      console.error(`[${entityName}] ${operation} error:`, error)

      // Handle specific error codes
      if (error.code === "23505") {
        // Unique constraint violation
        return {
          success: false,
          response: badRequest(`${entityName} already exists`),
        }
      }

      if (error.code === "23503") {
        // Foreign key violation
        return {
          success: false,
          response: badRequest(`Invalid reference in ${entityName.toLowerCase()}`),
        }
      }

      if (error.code === "42501") {
        // RLS policy violation
        return {
          success: false,
          response: internalError(`Permission denied for ${operation} operation`),
        }
      }

      return {
        success: false,
        response: internalError(`Failed to ${operation} ${entityName.toLowerCase()}`),
      }
    }

    if (data === null && operation !== "delete") {
      return {
        success: false,
        response: internalError(`${entityName} ${operation} returned no data`),
      }
    }

    return { success: true, data: data as T }
  } catch (err) {
    console.error(`[${entityName}] Unexpected ${operation} error:`, err)
    return {
      success: false,
      response: internalError(`Unexpected error during ${operation}`),
    }
  }
}

// ============================================================================
// SIMPLE ERROR CHECKERS
// ============================================================================

/**
 * Quick check if a Supabase response has an error
 * Use for simple cases where you handle errors manually
 *
 * @example
 * const { data, error } = await supabase.from("tenants").select()
 * if (hasError({ error })) {
 *   return internalError("Failed to load")
 * }
 */
export function hasError(result: { error: PostgrestError | null }): boolean {
  return result.error !== null
}

/**
 * Quick check if a Supabase response has no data
 *
 * @example
 * const { data, error } = await supabase.from("tenants").select().single()
 * if (isEmpty({ data, error })) {
 *   return notFound("Tenant")
 * }
 */
export function isEmpty<T>(result: { data: T | null; error: PostgrestError | null }): boolean {
  return result.error !== null || result.data === null
}

/**
 * Get error message from Supabase error
 *
 * @example
 * const { error } = await supabase.from("tenants").insert(data)
 * if (error) {
 *   console.error(getErrorMessage(error))
 * }
 */
export function getErrorMessage(error: PostgrestError | null): string {
  if (!error) return ""
  return error.message || error.details || "Unknown database error"
}

// ============================================================================
// ERROR CODE CONSTANTS
// ============================================================================

export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: "PGRST116",
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  RLS_VIOLATION: "42501",
  INVALID_INPUT: "22P02",
} as const
