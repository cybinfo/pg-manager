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
