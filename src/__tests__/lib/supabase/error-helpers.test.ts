/**
 * Tests for pure utility functions in src/lib/supabase/error-helpers.ts
 *
 * Covers: hasError, isEmpty, getErrorMessage
 * (handleQueryResult / handleListResult / handleMutationResult require Supabase mocking — not covered here)
 */

import { hasError, isEmpty, getErrorMessage } from "@/lib/supabase/error-helpers"
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
