/**
 * Zod Schema Validation Utilities for API Routes
 *
 * Provides a consistent pattern for validating request bodies
 * using Zod schemas across all API routes.
 *
 * @example
 * import { z } from "zod"
 * import { validateBody } from "@/lib/validation"
 *
 * const MySchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * })
 *
 * // In handler:
 * const body = await request.json()
 * const validation = validateBody(MySchema, body)
 * if (!validation.success) return validation.response
 * const { name, email } = validation.data
 */

import { z, type ZodType } from "zod"
import { badRequest } from "./api-response"
import type { ValidatorResult } from "@/lib/hooks/useFormValidation"
export type { ValidatorResult }

// ============================================================================
// FIELD-LEVEL VALIDATORS (for useFormPage validationSchema)
// ============================================================================

/** Requires a non-empty trimmed string */
export function requiredField(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    if (!String(value ?? "").trim()) {
      return { isValid: false, error: `${label} is required` }
    }
    return null
  }
}

/** Requires a non-empty select value (non-empty string) */
export function requiredSelect(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    if (!String(value ?? "").trim()) {
      return { isValid: false, error: `Please select a ${label.toLowerCase()}` }
    }
    return null
  }
}

/** Requires a valid 10-digit Indian phone number */
export function requiredPhone(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    if (!/^\d{10}$/.test(str.replace(/\D/g, ""))) {
      return { isValid: false, error: `${label} must be a valid 10-digit number` }
    }
    return null
  }
}

/** Requires a positive numeric amount */
export function requiredAmount(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    const num = Number(value)
    if (!value || isNaN(num) || num <= 0) {
      return { isValid: false, error: `${label} must be a positive amount` }
    }
    return null
  }
}

/** Requires a non-empty date string */
export function requiredDate(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    if (!String(value ?? "").trim()) {
      return { isValid: false, error: `${label} is required` }
    }
    return null
  }
}

/** Requires a positive integer */
export function requiredPositiveInt(label: string): (value: unknown) => ValidatorResult {
  return (value: unknown) => {
    const num = Number(value)
    if (!value || isNaN(num) || num < 1 || !Number.isInteger(num)) {
      return { isValid: false, error: `${label} must be a positive whole number` }
    }
    return null
  }
}

/**
 * Validate an unknown body against a Zod schema.
 *
 * Returns either:
 * - { success: true, data: T } with the parsed and typed data
 * - { success: false, response: NextResponse } with a 400 error response
 *   ready to be returned from the API handler
 */
export function validateBody<T>(
  schema: ZodType<T>,
  body: unknown
):
  | { success: true; data: T }
  | { success: false; response: ReturnType<typeof badRequest> } {
  const result = schema.safeParse(body)

  if (!result.success) {
    // Use Zod 4's top-level flattenError for structured field errors
    const flattened = z.flattenError(result.error)
    return {
      success: false,
      response: badRequest("Invalid request body", {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors.length > 0 ? flattened.formErrors : undefined,
      }),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Validate query/search parameters against a Zod schema.
 *
 * Converts URLSearchParams into a plain object before validation.
 * Useful for GET routes that accept query parameters.
 */
export function validateQuery<T>(
  schema: ZodType<T>,
  searchParams: URLSearchParams
):
  | { success: true; data: T }
  | { success: false; response: ReturnType<typeof badRequest> } {
  // Convert URLSearchParams to a plain object
  const params: Record<string, string> = {}
  searchParams.forEach((value: string, key: string) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const flattened = z.flattenError(result.error)
    return {
      success: false,
      response: badRequest("Invalid query parameters", {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors.length > 0 ? flattened.formErrors : undefined,
      }),
    }
  }

  return { success: true, data: result.data }
}
