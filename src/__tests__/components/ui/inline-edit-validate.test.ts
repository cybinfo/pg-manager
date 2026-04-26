/**
 * Tests for validateValue from src/components/ui/inline-edit/types.ts
 *
 * Covers all validation rules: required, min, max, minLength, maxLength, pattern, custom.
 */

import { validateValue, type EditValidation } from "@/components/ui/inline-edit/types"

// ============================================================================
// No validation
// ============================================================================

describe("validateValue", () => {
  it("returns null when validation is undefined", () => {
    expect(validateValue("anything", undefined)).toBeNull()
  })

  it("returns null when validation is empty object", () => {
    expect(validateValue("value", {})).toBeNull()
  })

  // ============================================================================
  // Required
  // ============================================================================

  describe("required", () => {
    const validation: EditValidation = { required: true }

    it("returns error for null", () => {
      expect(validateValue(null, validation)).toBe("This field is required")
    })

    it("returns error for undefined", () => {
      expect(validateValue(undefined, validation)).toBe("This field is required")
    })

    it("returns error for empty string", () => {
      expect(validateValue("", validation)).toBe("This field is required")
    })

    it("returns null for non-empty string", () => {
      expect(validateValue("hello", validation)).toBeNull()
    })

    it("returns null for 0 (zero is a valid value)", () => {
      expect(validateValue(0, validation)).toBeNull()
    })

    it("returns null for boolean false", () => {
      expect(validateValue(false, validation)).toBeNull()
    })
  })

  // ============================================================================
  // Number validations (min/max)
  // ============================================================================

  describe("min", () => {
    const validation: EditValidation = { min: 10 }

    it("returns error when number is below min", () => {
      expect(validateValue(5, validation)).toContain("Minimum value is 10")
    })

    it("returns null when number equals min", () => {
      expect(validateValue(10, validation)).toBeNull()
    })

    it("returns null when number is above min", () => {
      expect(validateValue(15, validation)).toBeNull()
    })

    it("works with string-encoded numbers", () => {
      expect(validateValue("5", validation)).toContain("10")
      expect(validateValue("10", validation)).toBeNull()
    })

    it("skips validation for null (not required)", () => {
      expect(validateValue(null, validation)).toBeNull()
    })
  })

  describe("max", () => {
    const validation: EditValidation = { max: 100 }

    it("returns error when number exceeds max", () => {
      expect(validateValue(150, validation)).toContain("Maximum value is 100")
    })

    it("returns null when number equals max", () => {
      expect(validateValue(100, validation)).toBeNull()
    })

    it("returns null when number is below max", () => {
      expect(validateValue(50, validation)).toBeNull()
    })
  })

  // ============================================================================
  // String validations (minLength/maxLength/pattern)
  // ============================================================================

  describe("minLength", () => {
    const validation: EditValidation = { minLength: 3 }

    it("returns error when string is shorter than minLength", () => {
      expect(validateValue("ab", validation)).toContain("Minimum length is 3")
    })

    it("returns null when string meets minLength", () => {
      expect(validateValue("abc", validation)).toBeNull()
    })

    it("returns null when string exceeds minLength", () => {
      expect(validateValue("abcdef", validation)).toBeNull()
    })

    it("skips minLength for empty/null values (not required)", () => {
      expect(validateValue("", validation)).toBeNull()
      expect(validateValue(null, validation)).toBeNull()
    })
  })

  describe("maxLength", () => {
    const validation: EditValidation = { maxLength: 5 }

    it("returns error when string exceeds maxLength", () => {
      expect(validateValue("toolong", validation)).toContain("Maximum length is 5")
    })

    it("returns null when string is within maxLength", () => {
      expect(validateValue("hi", validation)).toBeNull()
    })

    it("returns null when string equals maxLength", () => {
      expect(validateValue("hello", validation)).toBeNull()
    })
  })

  describe("pattern", () => {
    const validation: EditValidation = {
      pattern: /^\d+$/,
      patternMessage: "Only digits allowed",
    }

    it("returns custom patternMessage when pattern does not match", () => {
      expect(validateValue("abc", validation)).toBe("Only digits allowed")
    })

    it("returns null when pattern matches", () => {
      expect(validateValue("12345", validation)).toBeNull()
    })

    it("falls back to generic message when no patternMessage", () => {
      const v: EditValidation = { pattern: /^\d+$/ }
      expect(validateValue("abc", v)).toBe("Invalid format")
    })
  })

  // ============================================================================
  // Custom validation
  // ============================================================================

  describe("custom", () => {
    it("returns the error message when custom returns a string", () => {
      const validation: EditValidation = {
        custom: (value) => (value === "banned" ? "This word is banned" : null),
      }
      expect(validateValue("banned", validation)).toBe("This word is banned")
    })

    it("returns null when custom returns null", () => {
      const validation: EditValidation = {
        custom: () => null,
      }
      expect(validateValue("anything", validation)).toBeNull()
    })

    it("custom receives the raw value", () => {
      const custom = jest.fn().mockReturnValue(null)
      validateValue("test-value", { custom })
      expect(custom).toHaveBeenCalledWith("test-value")
    })
  })
})
