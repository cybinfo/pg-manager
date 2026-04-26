/**
 * Tests for src/lib/validation/amount.ts and src/lib/validation/date.ts
 *
 * Pure validators — no DB or React needed.
 */

import {
  validateAmount,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validatePercentage,
} from "@/lib/validation/amount"

import {
  validateDateRange,
  validateDate,
} from "@/lib/validation/date"

// ============================================================================
// validateAmount
// ============================================================================

describe("validateAmount", () => {
  describe("required field", () => {
    it("returns error for null when required", () => {
      expect(validateAmount(null).isValid).toBe(false)
      expect(validateAmount(null).error).toContain("required")
    })

    it("returns error for undefined when required", () => {
      expect(validateAmount(undefined).isValid).toBe(false)
    })

    it("returns error for empty string when required", () => {
      expect(validateAmount("").isValid).toBe(false)
    })

    it("returns valid null when not required and value is null", () => {
      const result = validateAmount(null, { required: false })
      expect(result.isValid).toBe(true)
      expect(result.value).toBeNull()
    })
  })

  describe("valid amounts", () => {
    it("accepts a positive number", () => {
      const result = validateAmount(5000)
      expect(result.isValid).toBe(true)
      expect(result.value).toBe(5000)
    })

    it("accepts a numeric string", () => {
      const result = validateAmount("5000")
      expect(result.isValid).toBe(true)
      expect(result.value).toBe(5000)
    })

    it("accepts a string with commas (Indian formatting)", () => {
      const result = validateAmount("1,00,000")
      expect(result.isValid).toBe(true)
      expect(result.value).toBe(100000)
    })

    it("accepts zero when allowZero is true (default)", () => {
      expect(validateAmount(0).isValid).toBe(true)
    })

    it("accepts a decimal amount within maxDecimals", () => {
      expect(validateAmount("1500.50").isValid).toBe(true)
    })
  })

  describe("invalid amounts", () => {
    it("rejects non-numeric string", () => {
      const result = validateAmount("abc")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("valid number")
    })

    it("rejects negative when allowNegative is false (default)", () => {
      const result = validateAmount(-100)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("negative")
    })

    it("accepts negative when allowNegative is true", () => {
      expect(validateAmount(-100, { allowNegative: true }).isValid).toBe(true)
    })

    it("rejects zero when allowZero is false", () => {
      const result = validateAmount(0, { allowZero: false })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("zero")
    })

    it("rejects amount below min", () => {
      const result = validateAmount(50, { min: 100 })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("at least")
    })

    it("accepts amount equal to min", () => {
      expect(validateAmount(100, { min: 100 }).isValid).toBe(true)
    })

    it("rejects amount above max", () => {
      const result = validateAmount(200, { max: 100 })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("exceed")
    })

    it("rejects too many decimal places", () => {
      const result = validateAmount("1500.123", { maxDecimals: 2 })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("decimal places")
    })

    it("accepts exact maxDecimals", () => {
      expect(validateAmount("1500.12", { maxDecimals: 2 }).isValid).toBe(true)
    })
  })

  describe("custom label", () => {
    it("uses custom label in error messages", () => {
      const result = validateAmount(null, { label: "Rent" })
      expect(result.error).toContain("Rent")
    })
  })
})

// ============================================================================
// validatePositiveAmount
// ============================================================================

describe("validatePositiveAmount", () => {
  it("rejects zero", () => {
    expect(validatePositiveAmount(0).isValid).toBe(false)
  })

  it("rejects negative", () => {
    expect(validatePositiveAmount(-1).isValid).toBe(false)
  })

  it("accepts positive number", () => {
    expect(validatePositiveAmount(100).isValid).toBe(true)
  })

  it("uses custom label", () => {
    expect(validatePositiveAmount(0, "Deposit").error).toContain("Deposit")
  })
})

// ============================================================================
// validateNonNegativeAmount
// ============================================================================

describe("validateNonNegativeAmount", () => {
  it("accepts zero", () => {
    expect(validateNonNegativeAmount(0).isValid).toBe(true)
  })

  it("accepts positive number", () => {
    expect(validateNonNegativeAmount(500).isValid).toBe(true)
  })

  it("rejects negative", () => {
    expect(validateNonNegativeAmount(-1).isValid).toBe(false)
  })
})

// ============================================================================
// validatePercentage
// ============================================================================

describe("validatePercentage", () => {
  it("accepts 0%", () => {
    expect(validatePercentage(0).isValid).toBe(true)
  })

  it("accepts 100%", () => {
    expect(validatePercentage(100).isValid).toBe(true)
  })

  it("accepts 50.5% when decimals allowed", () => {
    expect(validatePercentage(50.5, { allowDecimals: true }).isValid).toBe(true)
  })

  it("rejects 50.5% when decimals not allowed", () => {
    expect(validatePercentage(50.5, { allowDecimals: false }).isValid).toBe(false)
  })

  it("accepts 50 when decimals not allowed", () => {
    expect(validatePercentage(50, { allowDecimals: false }).isValid).toBe(true)
  })

  it("rejects values above 100", () => {
    expect(validatePercentage(101).isValid).toBe(false)
  })

  it("rejects negative values", () => {
    expect(validatePercentage(-1).isValid).toBe(false)
  })
})

// ============================================================================
// validateDateRange
// ============================================================================

describe("validateDateRange", () => {
  const START = "2026-04-01"
  const END = "2026-04-30"

  describe("valid ranges", () => {
    it("accepts start before end", () => {
      expect(validateDateRange(START, END).isValid).toBe(true)
    })

    it("accepts same day when allowSameDay is true (default)", () => {
      expect(validateDateRange(START, START).isValid).toBe(true)
    })

    it("accepts Date objects", () => {
      expect(validateDateRange(new Date(START), new Date(END)).isValid).toBe(true)
    })
  })

  describe("invalid ranges", () => {
    it("rejects start after end", () => {
      const result = validateDateRange(END, START)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it("rejects same day when allowSameDay is false", () => {
      const result = validateDateRange(START, START, { allowSameDay: false })
      expect(result.isValid).toBe(false)
    })

    it("rejects invalid start date string", () => {
      expect(validateDateRange("not-a-date", END).isValid).toBe(false)
    })

    it("rejects invalid end date string", () => {
      expect(validateDateRange(START, "not-a-date").isValid).toBe(false)
    })
  })

  describe("min/max bounds", () => {
    it("rejects start before minDate", () => {
      const result = validateDateRange("2026-03-01", END, { minDate: "2026-04-01" })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("before")
    })

    it("rejects end after maxDate", () => {
      const result = validateDateRange(START, "2026-05-01", { maxDate: "2026-04-30" })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("after")
    })

    it("accepts start equal to minDate", () => {
      expect(validateDateRange("2026-04-01", END, { minDate: "2026-04-01" }).isValid).toBe(true)
    })
  })
})

// ============================================================================
// validateDate
// ============================================================================

describe("validateDate", () => {
  describe("required field", () => {
    it("returns error for null when required (default)", () => {
      expect(validateDate(null).isValid).toBe(false)
    })

    it("returns valid for null when not required", () => {
      const result = validateDate(null, { required: false })
      expect(result.isValid).toBe(true)
      expect(result.parsed).toBeNull()
    })
  })

  describe("valid dates", () => {
    it("accepts a valid date string", () => {
      const result = validateDate("2026-04-15")
      expect(result.isValid).toBe(true)
      expect(result.parsed).toBeInstanceOf(Date)
    })

    it("accepts a Date object", () => {
      expect(validateDate(new Date("2026-04-15")).isValid).toBe(true)
    })
  })

  describe("invalid dates", () => {
    it("rejects invalid date string", () => {
      expect(validateDate("not-a-date").isValid).toBe(false)
    })

    it("rejects date before minDate", () => {
      const result = validateDate("2026-03-01", { minDate: "2026-04-01" })
      expect(result.isValid).toBe(false)
    })

    it("rejects date after maxDate", () => {
      const result = validateDate("2026-05-01", { maxDate: "2026-04-30" })
      expect(result.isValid).toBe(false)
    })

    it("accepts date on minDate boundary", () => {
      expect(validateDate("2026-04-01", { minDate: "2026-04-01" }).isValid).toBe(true)
    })
  })

  describe("custom label", () => {
    it("uses custom label in error messages", () => {
      expect(validateDate(null, { label: "Check-in Date" }).error).toContain("Check-in Date")
    })
  })
})
