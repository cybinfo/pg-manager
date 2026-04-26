/**
 * Tests for src/lib/supabase/error-helpers.ts
 *
 * Covers: hasError, isEmpty, getErrorMessage,
 * handleQueryResult, handleListResult, handleMutationResult
 */

jest.mock("@/lib/logger", () => ({
  logger: {
    child: jest.fn(() => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() })),
    error: jest.fn(),
  },
}))

import {
  hasError,
  isEmpty,
  getErrorMessage,
  handleQueryResult,
  handleListResult,
  handleMutationResult,
} from "@/lib/supabase/error-helpers"
import type { PostgrestError } from "@supabase/supabase-js"

function makeError(message = "db error", code = "12345"): PostgrestError {
  return {
    message,
    details: "some details",
    hint: "",
    code,
    name: "PostgrestError",
  }
}

// ============================================================================
// hasError
// ============================================================================

describe("hasError", () => {
  it("returns true when error is not null", () => {
    expect(hasError({ error: makeError() })).toBe(true)
  })

  it("returns false when error is null", () => {
    expect(hasError({ error: null })).toBe(false)
  })
})

// ============================================================================
// isEmpty
// ============================================================================

describe("isEmpty", () => {
  it("returns false when data is present and error is null", () => {
    expect(isEmpty({ data: { id: 1 }, error: null })).toBe(false)
  })

  it("returns true when data is null and error is null", () => {
    expect(isEmpty({ data: null, error: null })).toBe(true)
  })

  it("returns true when error is present even if data is also set", () => {
    expect(isEmpty({ data: { id: 1 }, error: makeError() })).toBe(true)
  })

  it("returns true when both data and error are null", () => {
    expect(isEmpty({ data: null, error: null })).toBe(true)
  })
})

// ============================================================================
// getErrorMessage
// ============================================================================

describe("getErrorMessage", () => {
  it("returns empty string for null", () => {
    expect(getErrorMessage(null)).toBe("")
  })

  it("returns error.message when present", () => {
    expect(getErrorMessage(makeError("Row not found"))).toBe("Row not found")
  })

  it("falls back to error.details when message is empty", () => {
    const err: PostgrestError = {
      message: "",
      details: "fallback details",
      hint: "",
      code: "00000",
      name: "PostgrestError",
    }
    expect(getErrorMessage(err)).toBe("fallback details")
  })

  it("returns 'Unknown database error' when both message and details are empty", () => {
    const err: PostgrestError = {
      message: "",
      details: "",
      hint: "",
      code: "00000",
      name: "PostgrestError",
    }
    expect(getErrorMessage(err)).toBe("Unknown database error")
  })
})

// ============================================================================
// handleQueryResult
// ============================================================================

describe("handleQueryResult", () => {
  it("returns success with data on happy path", async () => {
    const result = await handleQueryResult(
      Promise.resolve({ data: { id: 1, name: "Alice" }, error: null }),
      "Tenant"
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ id: 1, name: "Alice" })
  })

  it("returns 404 response for PGRST116 (no rows)", async () => {
    const result = await handleQueryResult(
      Promise.resolve({ data: null, error: { code: "PGRST116", message: "0 rows", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(404)
  })

  it("returns 500 for generic supabase error", async () => {
    const result = await handleQueryResult(
      Promise.resolve({ data: null, error: { code: "99999", message: "unknown", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("returns 404 when data is null and no error", async () => {
    const result = await handleQueryResult(
      Promise.resolve({ data: null, error: null }),
      "Tenant"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(404)
  })

  it("returns 500 when query throws unexpectedly", async () => {
    const result = await handleQueryResult(
      Promise.reject(new Error("connection refused")),
      "Tenant"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })
})

// ============================================================================
// handleListResult
// ============================================================================

describe("handleListResult", () => {
  it("returns success with data array on happy path", async () => {
    const result = await handleListResult(
      Promise.resolve({ data: [{ id: 1 }, { id: 2 }], error: null }),
      "Tenants"
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(2)
  })

  it("returns empty array when data is null (no error)", async () => {
    const result = await handleListResult(
      Promise.resolve({ data: null, error: null }),
      "Tenants"
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([])
  })

  it("returns 500 when supabase returns error", async () => {
    const result = await handleListResult(
      Promise.resolve({ data: null, error: { code: "00000", message: "err", details: "", hint: "", name: "PostgrestError" } }),
      "Tenants"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("returns 500 when query throws unexpectedly", async () => {
    const result = await handleListResult(
      Promise.reject(new Error("timeout")),
      "Tenants"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("uses default entity name when not provided", async () => {
    const result = await handleListResult(
      Promise.resolve({ data: [], error: null })
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// handleMutationResult
// ============================================================================

describe("handleMutationResult", () => {
  it("returns success with data on create", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: { id: 1 }, error: null }),
      "Tenant", "create"
    )
    expect(result.success).toBe(true)
  })

  it("returns 400 for unique constraint violation (23505)", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: { code: "23505", message: "dup", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant", "create"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(400)
  })

  it("returns 400 for foreign key violation (23503)", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: { code: "23503", message: "fk", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant", "create"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(400)
  })

  it("returns 500 for RLS violation (42501)", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: { code: "42501", message: "rls", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant", "update"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("returns 500 for generic error", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: { code: "99999", message: "unknown", details: "", hint: "", name: "PostgrestError" } }),
      "Tenant", "create"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("returns 500 when data is null and operation is not delete", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: null }),
      "Tenant", "create"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })

  it("returns success with null data when operation is delete", async () => {
    const result = await handleMutationResult(
      Promise.resolve({ data: null, error: null }),
      "Tenant", "delete"
    )
    expect(result.success).toBe(true)
  })

  it("returns 500 when query throws unexpectedly", async () => {
    const result = await handleMutationResult(
      Promise.reject(new Error("timeout")),
      "Tenant", "create"
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(500)
  })
})
