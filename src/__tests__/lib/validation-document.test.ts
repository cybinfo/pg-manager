/**
 * Tests for src/lib/validation/document.ts
 *
 * Covers: validatePAN, validateAadhaar, validatePincode, validateGST,
 *         validateUUID, isValidUUID
 */

import {
  validatePAN,
  validateAadhaar,
  validatePincode,
  validateGST,
  validateUUID,
  isValidUUID,
} from "@/lib/validation/document"

// ============================================================================
// validatePAN
// ============================================================================

describe("validatePAN", () => {
  describe("valid inputs", () => {
    it("accepts a standard valid PAN", () => {
      const result = validatePAN("ABCDE1234F")
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it("accepts lowercase input (normalizes to uppercase)", () => {
      const result = validatePAN("abcde1234f")
      expect(result.isValid).toBe(true)
    })

    it("accepts PAN with spaces (strips them)", () => {
      const result = validatePAN("ABCDE 1234 F")
      expect(result.isValid).toBe(true)
    })

    it("accepts all-uppercase PAN", () => {
      expect(validatePAN("PANFB1234C").isValid).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validatePAN("")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it("rejects PAN with digits in first 5 positions", () => {
      expect(validatePAN("1BCDE1234F").isValid).toBe(false)
    })

    it("rejects PAN with letters in digit positions (6-9)", () => {
      expect(validatePAN("ABCDEABCDF").isValid).toBe(false)
    })

    it("rejects PAN that is too short", () => {
      expect(validatePAN("ABCDE123").isValid).toBe(false)
    })

    it("rejects PAN that is too long", () => {
      expect(validatePAN("ABCDE12345F").isValid).toBe(false)
    })

    it("rejects PAN ending with a digit", () => {
      expect(validatePAN("ABCDE12341").isValid).toBe(false)
    })

    it("returns descriptive error message", () => {
      const result = validatePAN("INVALID")
      expect(result.error).toContain("PAN")
    })
  })
})

// ============================================================================
// validateAadhaar
// ============================================================================

describe("validateAadhaar", () => {
  describe("valid inputs", () => {
    it("accepts plain 12-digit Aadhaar", () => {
      const result = validateAadhaar("123456789012")
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it("formats as XXXX XXXX XXXX", () => {
      const result = validateAadhaar("123456789012")
      expect(result.formatted).toBe("1234 5678 9012")
    })

    it("accepts Aadhaar with spaces (strips them)", () => {
      const result = validateAadhaar("1234 5678 9012")
      expect(result.isValid).toBe(true)
      expect(result.formatted).toBe("1234 5678 9012")
    })

    it("accepts Aadhaar with dashes (strips them)", () => {
      const result = validateAadhaar("1234-5678-9012")
      expect(result.isValid).toBe(true)
      expect(result.formatted).toBe("1234 5678 9012")
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validateAadhaar("")
      expect(result.isValid).toBe(false)
      expect(result.formatted).toBeNull()
      expect(result.error).toBeTruthy()
    })

    it("rejects fewer than 12 digits", () => {
      const result = validateAadhaar("12345678901")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("12 digits")
    })

    it("rejects more than 12 digits", () => {
      const result = validateAadhaar("1234567890123")
      expect(result.isValid).toBe(false)
    })

    it("rejects non-digit characters", () => {
      const result = validateAadhaar("12345678901A")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("digits")
    })
  })
})

// ============================================================================
// validatePincode
// ============================================================================

describe("validatePincode", () => {
  describe("valid inputs", () => {
    it("accepts a standard 6-digit pincode starting with non-zero", () => {
      expect(validatePincode("110001").isValid).toBe(true)
    })

    it("accepts pincode starting with 9", () => {
      expect(validatePincode("999999").isValid).toBe(true)
    })

    it("strips spaces before validating", () => {
      expect(validatePincode("110 001").isValid).toBe(true)
    })

    it("returns null error for valid pincode", () => {
      expect(validatePincode("400001").error).toBeNull()
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validatePincode("")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it("rejects pincode starting with 0", () => {
      const result = validatePincode("011001")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("0")
    })

    it("rejects 5-digit pincode", () => {
      const result = validatePincode("11000")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("6 digits")
    })

    it("rejects 7-digit pincode", () => {
      const result = validatePincode("1100011")
      expect(result.isValid).toBe(false)
    })

    it("rejects pincode with letters", () => {
      expect(validatePincode("11000A").isValid).toBe(false)
    })
  })
})

// ============================================================================
// validateGST
// ============================================================================

describe("validateGST", () => {
  describe("valid inputs", () => {
    it("accepts a correctly formatted GST number", () => {
      // Format: 2-digit state code + PAN + 1-digit entity + Z + checksum
      const result = validateGST("22AAAAA0000A1Z5")
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it("accepts lowercase GST (normalizes to uppercase)", () => {
      expect(validateGST("22aaaaa0000a1z5").isValid).toBe(true)
    })

    it("strips spaces before validating", () => {
      expect(validateGST("22AAAAA0000A 1Z5").isValid).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validateGST("")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it("rejects GST shorter than 15 characters", () => {
      const result = validateGST("22AAAAA0000A1Z")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("15 characters")
    })

    it("rejects GST longer than 15 characters", () => {
      const result = validateGST("22AAAAA0000A1Z55")
      expect(result.isValid).toBe(false)
    })

    it("rejects GST missing the Z in position 14", () => {
      // Replace Z with A — format becomes invalid
      expect(validateGST("22AAAAA0000A1A5").isValid).toBe(false)
    })

    it("rejects GST with letters where state code should be digits", () => {
      expect(validateGST("AAAAAAA0000A1Z5").isValid).toBe(false)
    })
  })
})

// ============================================================================
// validateUUID
// ============================================================================

describe("validateUUID", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

  describe("valid inputs", () => {
    it("accepts a standard UUID v4", () => {
      const result = validateUUID(VALID_UUID)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it("normalizes UUID to lowercase", () => {
      const result = validateUUID(VALID_UUID.toUpperCase())
      expect(result.normalized).toBe(VALID_UUID.toLowerCase())
    })

    it("accepts UUID without dashes and normalizes to dashed form", () => {
      const noDashes = VALID_UUID.replace(/-/g, "")
      const result = validateUUID(noDashes)
      expect(result.isValid).toBe(true)
      expect(result.normalized).toContain("-")
    })

    it("trims surrounding whitespace", () => {
      expect(validateUUID(`  ${VALID_UUID}  `).isValid).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = validateUUID("")
      expect(result.isValid).toBe(false)
      expect(result.normalized).toBeNull()
      expect(result.error).toBeTruthy()
    })

    it("rejects UUID that is too short", () => {
      const result = validateUUID("550e8400-e29b-41d4")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("short")
    })

    it("rejects UUID that is too long", () => {
      const result = validateUUID(VALID_UUID + "extra-chars-appended")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("long")
    })

    it("rejects UUID with invalid version digit (not 4)", () => {
      // Version bit at position 14 is '3' instead of '4'
      const v3uuid = "550e8400-e29b-31d4-a716-446655440000"
      const result = validateUUID(v3uuid)
      expect(result.isValid).toBe(false)
    })

    it("rejects UUID with invalid variant bits", () => {
      // Variant bits at position 19 must be 8, 9, a, or b — use 'c' here
      const badVariant = "550e8400-e29b-41d4-c716-446655440000"
      expect(validateUUID(badVariant).isValid).toBe(false)
    })

    it("rejects random garbage string", () => {
      expect(validateUUID("not-a-uuid").isValid).toBe(false)
    })
  })
})

// ============================================================================
// isValidUUID
// ============================================================================

describe("isValidUUID", () => {
  it("returns true for a valid UUID", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("returns true for UUID v1 (loose check accepts any version)", () => {
    // Loose check accepts any version digit, not just 4
    expect(isValidUUID("550e8400-e29b-11d4-a716-446655440000")).toBe(true)
  })

  it("returns true for uppercase UUID", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true)
  })

  it("returns false for empty string", () => {
    expect(isValidUUID("")).toBe(false)
  })

  it("returns false for UUID without dashes", () => {
    expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false)
  })

  it("returns false for a string that is too short", () => {
    expect(isValidUUID("550e8400-e29b")).toBe(false)
  })

  it("returns false for random text", () => {
    expect(isValidUUID("not-a-uuid-at-all")).toBe(false)
  })

  it("trims and validates correctly", () => {
    expect(isValidUUID("  550e8400-e29b-41d4-a716-446655440000  ")).toBe(true)
  })
})
