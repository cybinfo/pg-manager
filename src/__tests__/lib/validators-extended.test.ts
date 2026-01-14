/**
 * Extended Validators Tests
 * Tests for UUID, date range, amount, and percentage validators
 */

import {
  validateUUID,
  isValidUUID,
  validateDateRange,
  validateDate,
  validateAmount,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validatePercentage,
} from "@/lib/validators"

describe("Extended Validators", () => {
  describe("validateUUID", () => {
    it("validates standard UUID v4 format", () => {
      const result = validateUUID("550e8400-e29b-41d4-a716-446655440000")

      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(result.error).toBeNull()
    })

    it("accepts UUID without dashes", () => {
      const result = validateUUID("550e8400e29b41d4a716446655440000")

      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("550e8400-e29b-41d4-a716-446655440000")
    })

    it("is case insensitive", () => {
      const result = validateUUID("550E8400-E29B-41D4-A716-446655440000")

      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("550e8400-e29b-41d4-a716-446655440000")
    })

    it("rejects invalid format", () => {
      const result = validateUUID("not-a-uuid")

      expect(result.isValid).toBe(false)
      expect(result.normalized).toBeNull()
      expect(result.error).toBeDefined()
    })

    it("rejects empty string", () => {
      const result = validateUUID("")

      expect(result.isValid).toBe(false)
      expect(result.error).toBe("UUID is required")
    })

    it("rejects too short input", () => {
      const result = validateUUID("550e8400")

      expect(result.isValid).toBe(false)
      expect(result.error).toBe("UUID is too short")
    })

    it("rejects too long input", () => {
      const result = validateUUID("550e8400-e29b-41d4-a716-446655440000-extra")

      expect(result.isValid).toBe(false)
      expect(result.error).toBe("UUID is too long")
    })
  })

  describe("isValidUUID", () => {
    it("returns true for valid UUIDs", () => {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    })

    it("returns false for invalid UUIDs", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false)
      expect(isValidUUID("")).toBe(false)
      expect(isValidUUID(null as any)).toBe(false)
    })
  })

  describe("validateDateRange", () => {
    it("accepts valid date range", () => {
      const result = validateDateRange("2024-01-01", "2024-12-31")

      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it("accepts same day when allowSameDay is true", () => {
      const result = validateDateRange("2024-06-15", "2024-06-15", {
        allowSameDay: true,
      })

      expect(result.isValid).toBe(true)
    })

    it("rejects same day when allowSameDay is false", () => {
      const result = validateDateRange("2024-06-15", "2024-06-15", {
        allowSameDay: false,
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("must be before")
    })

    it("rejects start after end", () => {
      const result = validateDateRange("2024-12-31", "2024-01-01")

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("must be on or before")
    })

    it("validates against minDate", () => {
      const result = validateDateRange("2023-01-01", "2024-12-31", {
        minDate: "2024-01-01",
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be before")
    })

    it("validates against maxDate", () => {
      const result = validateDateRange("2024-01-01", "2025-12-31", {
        maxDate: "2025-01-01",
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be after")
    })

    it("uses custom labels in error messages", () => {
      const result = validateDateRange("2024-12-31", "2024-01-01", {
        startLabel: "Check-in date",
        endLabel: "Check-out date",
      })

      expect(result.error).toContain("Check-in date")
      expect(result.error).toContain("check-out date")
    })

    it("rejects invalid start date", () => {
      const result = validateDateRange("invalid", "2024-12-31")

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("invalid")
    })

    it("rejects invalid end date", () => {
      const result = validateDateRange("2024-01-01", "invalid")

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("invalid")
    })

    it("accepts Date objects", () => {
      const result = validateDateRange(
        new Date("2024-01-01"),
        new Date("2024-12-31")
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe("validateDate", () => {
    it("accepts valid date string", () => {
      const result = validateDate("2024-06-15")

      expect(result.isValid).toBe(true)
      expect(result.parsed).toBeInstanceOf(Date)
      expect(result.error).toBeNull()
    })

    it("accepts valid Date object", () => {
      const result = validateDate(new Date("2024-06-15"))

      expect(result.isValid).toBe(true)
      expect(result.parsed).toBeInstanceOf(Date)
    })

    it("accepts null when not required", () => {
      const result = validateDate(null, { required: false })

      expect(result.isValid).toBe(true)
      expect(result.parsed).toBeNull()
    })

    it("rejects null when required", () => {
      const result = validateDate(null, { required: true })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("required")
    })

    it("validates against minDate", () => {
      const result = validateDate("2024-01-01", {
        minDate: "2024-06-01",
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be before")
    })

    it("validates against maxDate", () => {
      const result = validateDate("2024-12-31", {
        maxDate: "2024-06-01",
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be after")
    })

    it("uses custom label", () => {
      const result = validateDate(null, {
        required: true,
        label: "Birthday",
      })

      expect(result.error).toContain("Birthday")
    })
  })

  describe("validateAmount", () => {
    it("accepts valid positive number", () => {
      const result = validateAmount(100)

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(100)
    })

    it("parses string amounts", () => {
      const result = validateAmount("1,500.50")

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(1500.50)
    })

    it("accepts zero when allowZero is true", () => {
      const result = validateAmount(0, { allowZero: true })

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(0)
    })

    it("rejects zero when allowZero is false", () => {
      const result = validateAmount(0, { allowZero: false })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be zero")
    })

    it("rejects negative when allowNegative is false", () => {
      const result = validateAmount(-100, { allowNegative: false })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be negative")
    })

    it("accepts negative when allowNegative is true", () => {
      const result = validateAmount(-100, { allowNegative: true })

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(-100)
    })

    it("validates minimum", () => {
      const result = validateAmount(50, { min: 100 })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("at least 100")
    })

    it("validates maximum", () => {
      const result = validateAmount(500, { max: 100 })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot exceed 100")
    })

    it("validates decimal places", () => {
      const result = validateAmount(100.123, { maxDecimals: 2 })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("decimal places")
    })

    it("accepts null when not required", () => {
      const result = validateAmount(null, { required: false })

      expect(result.isValid).toBe(true)
      expect(result.value).toBeNull()
    })

    it("rejects null when required", () => {
      const result = validateAmount(null, { required: true })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("required")
    })

    it("rejects NaN", () => {
      const result = validateAmount("not a number")

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("valid number")
    })
  })

  describe("validatePositiveAmount", () => {
    it("accepts positive amounts", () => {
      const result = validatePositiveAmount(100)

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(100)
    })

    it("rejects zero", () => {
      const result = validatePositiveAmount(0)

      expect(result.isValid).toBe(false)
    })

    it("rejects negative", () => {
      const result = validatePositiveAmount(-100)

      expect(result.isValid).toBe(false)
    })

    it("uses custom label", () => {
      const result = validatePositiveAmount(-100, "Payment amount")

      expect(result.error).toContain("Payment amount")
    })
  })

  describe("validateNonNegativeAmount", () => {
    it("accepts positive amounts", () => {
      const result = validateNonNegativeAmount(100)

      expect(result.isValid).toBe(true)
    })

    it("accepts zero", () => {
      const result = validateNonNegativeAmount(0)

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(0)
    })

    it("rejects negative", () => {
      const result = validateNonNegativeAmount(-100)

      expect(result.isValid).toBe(false)
    })
  })

  describe("validatePercentage", () => {
    it("accepts valid percentage (0-100)", () => {
      expect(validatePercentage(0).isValid).toBe(true)
      expect(validatePercentage(50).isValid).toBe(true)
      expect(validatePercentage(100).isValid).toBe(true)
    })

    it("rejects negative percentage", () => {
      const result = validatePercentage(-10)

      expect(result.isValid).toBe(false)
    })

    it("rejects percentage over 100", () => {
      const result = validatePercentage(110)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot exceed 100")
    })

    it("accepts decimals when allowDecimals is true", () => {
      const result = validatePercentage(50.5, { allowDecimals: true })

      expect(result.isValid).toBe(true)
      expect(result.value).toBe(50.5)
    })

    it("rejects decimals when allowDecimals is false", () => {
      const result = validatePercentage(50.5, { allowDecimals: false })

      expect(result.isValid).toBe(false)
      // The implementation uses maxDecimals: 0, which gives "cannot have more than 0 decimal places"
      expect(result.error).toMatch(/decimal|whole number/i)
    })

    it("accepts null when not required", () => {
      const result = validatePercentage(null, { required: false })

      expect(result.isValid).toBe(true)
    })

    it("uses custom label", () => {
      const result = validatePercentage(110, { label: "Discount" })

      expect(result.error).toContain("Discount")
    })
  })
})
