/**
 * Tests for Zod Schema Validation Utilities
 *
 * Tests validateBody and validateQuery with valid inputs, invalid inputs,
 * and edge cases.
 */

import { z } from "zod"
import { validateBody, validateQuery } from "@/lib/validation"

// Helper to extract JSON body from a response
async function getResponseBody(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>
}

describe("Validation Utilities", () => {
  // ==========================================================================
  // validateBody
  // ==========================================================================

  describe("validateBody", () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive().optional(),
    })

    it("returns success with valid data", () => {
      const body = { name: "John Doe", email: "john@example.com" }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: "John Doe", email: "john@example.com" })
      }
    })

    it("returns success with all optional fields", () => {
      const body = { name: "John Doe", email: "john@example.com", age: 25 }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          name: "John Doe",
          email: "john@example.com",
          age: 25,
        })
      }
    })

    it("returns error when required fields are missing", async () => {
      const body = { name: "John Doe" }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
        const responseBody = await getResponseBody(result.response)
        const error = responseBody.error as Record<string, unknown>
        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("Invalid request body")
        expect(error.details).toBeDefined()
        const details = error.details as Record<string, unknown>
        expect(details.errors).toBeDefined()
      }
    })

    it("returns error for wrong field types", async () => {
      const body = { name: "John", email: "not-an-email" }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
        const responseBody = await getResponseBody(result.response)
        const error = responseBody.error as Record<string, unknown>
        expect(error.details).toBeDefined()
      }
    })

    it("returns error when body is null", async () => {
      const result = validateBody(TestSchema, null)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("returns error when body is undefined", async () => {
      const result = validateBody(TestSchema, undefined)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("returns error when body is a string", async () => {
      const result = validateBody(TestSchema, "not an object")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("returns error for negative age (positive validation)", async () => {
      const body = { name: "John", email: "john@example.com", age: -5 }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("returns error for non-integer age", async () => {
      const body = { name: "John", email: "john@example.com", age: 25.5 }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("strips unknown fields from parsed data", () => {
      const body = {
        name: "John",
        email: "john@example.com",
        unknownField: "should be stripped",
      }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty("unknownField")
      }
    })

    it("returns error for empty string name (min length 1)", async () => {
      const body = { name: "", email: "john@example.com" }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("works with a simple string schema", () => {
      const StringSchema = z.string().min(3)

      const resultValid = validateBody(StringSchema, "hello")
      expect(resultValid.success).toBe(true)
      if (resultValid.success) {
        expect(resultValid.data).toBe("hello")
      }

      const resultInvalid = validateBody(StringSchema, "ab")
      expect(resultInvalid.success).toBe(false)
    })

    it("works with array schema", () => {
      const ArraySchema = z.array(z.number())

      const resultValid = validateBody(ArraySchema, [1, 2, 3])
      expect(resultValid.success).toBe(true)
      if (resultValid.success) {
        expect(resultValid.data).toEqual([1, 2, 3])
      }

      const resultInvalid = validateBody(ArraySchema, [1, "two", 3])
      expect(resultInvalid.success).toBe(false)
    })

    it("works with nested object schema", () => {
      const NestedSchema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
          }),
        }),
      })

      const validBody = {
        user: { name: "John", address: { city: "Mumbai" } },
      }
      const result = validateBody(NestedSchema, validBody)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user.address.city).toBe("Mumbai")
      }
    })

    it("provides field-level errors in details", async () => {
      const body = { name: "", email: "bad" }
      const result = validateBody(TestSchema, body)

      expect(result.success).toBe(false)
      if (!result.success) {
        const responseBody = await getResponseBody(result.response)
        const error = responseBody.error as Record<string, unknown>
        const details = error.details as Record<string, unknown>
        const errors = details.errors as Record<string, string[]>
        // Should have errors for both name and email
        expect(errors).toBeDefined()
      }
    })
  })

  // ==========================================================================
  // validateQuery
  // ==========================================================================

  describe("validateQuery", () => {
    const QuerySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
    })

    it("returns success with valid query parameters", () => {
      const params = new URLSearchParams({ page: "1", limit: "10", search: "test" })
      const result = validateQuery(QuerySchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: "1", limit: "10", search: "test" })
      }
    })

    it("returns success with empty query parameters", () => {
      const params = new URLSearchParams()
      const result = validateQuery(QuerySchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({})
      }
    })

    it("returns success with partial parameters", () => {
      const params = new URLSearchParams({ page: "1" })
      const result = validateQuery(QuerySchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: "1" })
      }
    })

    it("returns error for required fields that are missing", async () => {
      const StrictQuerySchema = z.object({
        page: z.string(),
        limit: z.string(),
      })

      const params = new URLSearchParams({ page: "1" })
      const result = validateQuery(StrictQuerySchema, params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
        const responseBody = await getResponseBody(result.response)
        const error = responseBody.error as Record<string, unknown>
        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("Invalid query parameters")
      }
    })

    it("converts URLSearchParams to plain object correctly", () => {
      const params = new URLSearchParams("name=John&city=Mumbai")
      const schema = z.object({ name: z.string(), city: z.string() })

      const result = validateQuery(schema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: "John", city: "Mumbai" })
      }
    })

    it("handles special characters in query parameters", () => {
      const params = new URLSearchParams({ search: "hello world & more" })
      const result = validateQuery(QuerySchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe("hello world & more")
      }
    })

    it("returns error for invalid enum values", async () => {
      const EnumSchema = z.object({
        status: z.enum(["active", "inactive"]),
      })

      const params = new URLSearchParams({ status: "invalid" })
      const result = validateQuery(EnumSchema, params)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it("works with number coercion schema", () => {
      const NumberSchema = z.object({
        page: z.coerce.number().int().positive(),
      })

      const params = new URLSearchParams({ page: "5" })
      const result = validateQuery(NumberSchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
      }
    })

    it("provides field errors in response details", async () => {
      const StrictSchema = z.object({
        status: z.enum(["active", "inactive"]),
        priority: z.enum(["high", "low"]),
      })

      const params = new URLSearchParams({ status: "bad", priority: "bad" })
      const result = validateQuery(StrictSchema, params)

      expect(result.success).toBe(false)
      if (!result.success) {
        const responseBody = await getResponseBody(result.response)
        const error = responseBody.error as Record<string, unknown>
        const details = error.details as Record<string, unknown>
        expect(details.errors).toBeDefined()
      }
    })

    it("handles duplicate keys (last value wins in URLSearchParams conversion)", () => {
      // URLSearchParams.forEach iterates all, our code uses last-wins since we overwrite
      const params = new URLSearchParams()
      params.append("search", "first")
      params.append("search", "second")

      const result = validateQuery(QuerySchema, params)

      expect(result.success).toBe(true)
      if (result.success) {
        // The implementation overwrites, so last value wins
        expect(result.data.search).toBe("second")
      }
    })
  })
})
