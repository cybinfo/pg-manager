/**
 * Tests for src/lib/phone.ts
 *
 * Covers: validatePhone, formatPhoneDisplay, formatNormalizedPhone,
 *         normalizePhone, normalizePhoneForComparison
 */

import {
  validatePhone,
  formatPhoneDisplay,
  formatNormalizedPhone,
  normalizePhone,
  normalizePhoneForComparison,
} from "@/lib/phone"

// ============================================================================
// validatePhone
// ============================================================================

describe("validatePhone", () => {
  describe("valid inputs", () => {
    it("accepts plain 10-digit number starting with 9", () => {
      const result = validatePhone("9876543210")
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("+919876543210")
      expect(result.error).toBeNull()
    })

    it("accepts number starting with 6", () => {
      const result = validatePhone("6543210987")
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("+916543210987")
    })

    it("accepts number starting with 7", () => {
      expect(validatePhone("7001234567").isValid).toBe(true)
    })

    it("accepts number starting with 8", () => {
      expect(validatePhone("8123456789").isValid).toBe(true)
    })

    it("accepts +91 prefixed number", () => {
      const result = validatePhone("+919876543210")
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("+919876543210")
    })

    it("accepts 91 prefixed (no +) number", () => {
      expect(validatePhone("919876543210").isValid).toBe(true)
    })

    it("accepts 0 prefixed number", () => {
      expect(validatePhone("09876543210").isValid).toBe(true)
    })

    it("strips spaces and normalizes", () => {
      const result = validatePhone("98765 43210")
      expect(result.isValid).toBe(true)
      expect(result.normalized).toBe("+919876543210")
    })

    it("strips dashes and normalizes", () => {
      expect(validatePhone("98765-43210").isValid).toBe(true)
    })

    it("strips dots and normalizes", () => {
      expect(validatePhone("98765.43210").isValid).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validatePhone("")
      expect(result.isValid).toBe(false)
      expect(result.normalized).toBeNull()
      expect(result.error).toBeTruthy()
    })

    it("rejects number starting with 5 (landline-range)", () => {
      const result = validatePhone("5876543210")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("6, 7, 8, or 9")
    })

    it("rejects number starting with 1", () => {
      expect(validatePhone("1234567890").isValid).toBe(false)
    })

    it("rejects too-short number", () => {
      const result = validatePhone("98765")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("10 digits")
    })

    it("rejects too-long number", () => {
      const result = validatePhone("9876543210123456")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("too long")
    })
  })
})

// ============================================================================
// formatPhoneDisplay
// ============================================================================

describe("formatPhoneDisplay", () => {
  it("formats bare 10-digit number", () => {
    expect(formatPhoneDisplay("9876543210")).toBe("+91 98765 43210")
  })

  it("formats +91 prefixed number", () => {
    expect(formatPhoneDisplay("+919876543210")).toBe("+91 98765 43210")
  })

  it("formats 91-prefixed number (12 digits)", () => {
    expect(formatPhoneDisplay("919876543210")).toBe("+91 98765 43210")
  })

  it("formats 0-prefixed number (11 digits)", () => {
    expect(formatPhoneDisplay("09876543210")).toBe("+91 98765 43210")
  })

  it("returns '-' for null", () => {
    expect(formatPhoneDisplay(null)).toBe("-")
  })

  it("returns '-' for undefined", () => {
    expect(formatPhoneDisplay(undefined)).toBe("-")
  })

  it("returns '-' for empty string", () => {
    expect(formatPhoneDisplay("")).toBe("-")
  })

  it("returns original string if not a valid Indian mobile", () => {
    expect(formatPhoneDisplay("12345")).toBe("12345")
  })

  it("formats number with spaces in input", () => {
    expect(formatPhoneDisplay("98765 43210")).toBe("+91 98765 43210")
  })
})

// ============================================================================
// formatNormalizedPhone
// ============================================================================

describe("formatNormalizedPhone", () => {
  it("formats normalized +91XXXXXXXXXX to display form", () => {
    expect(formatNormalizedPhone("+919876543210")).toBe("+91 98765 43210")
  })

  it("returns empty string for empty input", () => {
    expect(formatNormalizedPhone("")).toBe("")
  })

  it("returns input as-is when not 10 digits after stripping +91", () => {
    expect(formatNormalizedPhone("12345")).toBe("12345")
  })
})

// ============================================================================
// normalizePhone
// ============================================================================

describe("normalizePhone", () => {
  it("prepends 91 to plain 10-digit number", () => {
    expect(normalizePhone("9876543210")).toBe("919876543210")
  })

  it("strips leading 0 and prepends 91", () => {
    expect(normalizePhone("09876543210")).toBe("919876543210")
  })

  it("strips spaces and normalizes", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("919876543210")
  })

  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("")
  })

  it("passes through already-normalized 12-digit number", () => {
    expect(normalizePhone("919876543210")).toBe("919876543210")
  })
})

// ============================================================================
// normalizePhoneForComparison
// ============================================================================

describe("normalizePhoneForComparison", () => {
  it("strips +91 prefix to return 10 digits", () => {
    expect(normalizePhoneForComparison("+919876543210")).toBe("9876543210")
  })

  it("strips 91 prefix (12 digits) to return 10 digits", () => {
    expect(normalizePhoneForComparison("919876543210")).toBe("9876543210")
  })

  it("strips leading 0 (11 digits) to return 10 digits", () => {
    expect(normalizePhoneForComparison("09876543210")).toBe("9876543210")
  })

  it("returns plain 10-digit number unchanged", () => {
    expect(normalizePhoneForComparison("9876543210")).toBe("9876543210")
  })

  it("returns empty string for empty input", () => {
    expect(normalizePhoneForComparison("")).toBe("")
  })

  it("different formats of same number produce same result", () => {
    const formats = [
      "9876543210",
      "+919876543210",
      "919876543210",
      "09876543210",
      "+91 98765 43210",
    ]
    const results = formats.map(normalizePhoneForComparison)
    expect(new Set(results).size).toBe(1)
  })
})
