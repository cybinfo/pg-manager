/**
 * Tests for:
 *   src/lib/validation/email.ts
 *   src/lib/validation/password.ts
 *   src/lib/validation/required.ts
 *
 * All pure functions — no DB or React needed.
 */

import { validateEmail } from "@/lib/validation/email"
import { validatePassword, validatePasswordMatch } from "@/lib/validation/password"
import { validateRequired, hasRequiredFields } from "@/lib/validation/required"

// ============================================================================
// validateEmail
// ============================================================================

describe("validateEmail", () => {
  describe("valid emails", () => {
    it("accepts a standard email", () => {
      expect(validateEmail("user@example.com").isValid).toBe(true)
    })

    it("accepts email with plus addressing", () => {
      expect(validateEmail("user+tag@example.com").isValid).toBe(true)
    })

    it("accepts email with subdomain", () => {
      expect(validateEmail("user@mail.example.co.in").isValid).toBe(true)
    })

    it("normalizes to lowercase before validating", () => {
      expect(validateEmail("USER@EXAMPLE.COM").isValid).toBe(true)
    })

    it("returns null error for valid email", () => {
      expect(validateEmail("user@example.com").error).toBeNull()
    })
  })

  describe("invalid emails", () => {
    it("rejects empty string", () => {
      const result = validateEmail("")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("required")
    })

    it("rejects email without @", () => {
      expect(validateEmail("userexample.com").isValid).toBe(false)
    })

    it("rejects email without domain", () => {
      expect(validateEmail("user@").isValid).toBe(false)
    })

    it("rejects email with spaces", () => {
      expect(validateEmail("user @example.com").isValid).toBe(false)
    })

    it("returns descriptive error for invalid format", () => {
      expect(validateEmail("notanemail").error).toContain("Invalid")
    })
  })

  describe("disposable domain blocking", () => {
    it("accepts disposable domain by default", () => {
      expect(validateEmail("user@mailinator.com").isValid).toBe(true)
    })

    it("rejects mailinator.com when blockDisposable is true", () => {
      const result = validateEmail("user@mailinator.com", { blockDisposable: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Disposable")
    })

    it("rejects other known disposable domains", () => {
      const domains = ["guerrillamail.com", "tempmail.com", "yopmail.com"]
      for (const domain of domains) {
        expect(validateEmail(`test@${domain}`, { blockDisposable: true }).isValid).toBe(false)
      }
    })

    it("accepts legitimate email even with blockDisposable enabled", () => {
      expect(validateEmail("user@gmail.com", { blockDisposable: true }).isValid).toBe(true)
    })
  })
})

// ============================================================================
// validatePassword
// ============================================================================

describe("validatePassword", () => {
  describe("length checks", () => {
    it("accepts a password that meets the minimum length (default 6)", () => {
      expect(validatePassword("abc123").isValid).toBe(true)
    })

    it("rejects a password shorter than the minimum", () => {
      const result = validatePassword("ab")
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("6 characters")
    })

    it("respects custom minLength", () => {
      const result = validatePassword("short", { minLength: 8 })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("8 characters")
    })

    it("rejects a password exceeding maxLength", () => {
      const long = "a".repeat(101)
      const result = validatePassword(long)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("at most")
    })
  })

  describe("character requirements", () => {
    it("enforces uppercase when required", () => {
      const result = validatePassword("lowercase1!", { requireUppercase: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("uppercase")
    })

    it("passes uppercase check when present", () => {
      expect(validatePassword("Lowercase1!", { requireUppercase: true }).isValid).toBe(true)
    })

    it("enforces lowercase when required", () => {
      const result = validatePassword("UPPERCASE1!", { requireLowercase: true })
      expect(result.isValid).toBe(false)
    })

    it("enforces number when required", () => {
      const result = validatePassword("NoNumbers!", { requireNumber: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("number")
    })

    it("enforces special character when required", () => {
      const result = validatePassword("NoSpecial1", { requireSpecial: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("special")
    })
  })

  describe("strength scoring", () => {
    it("short simple password is 'weak'", () => {
      expect(validatePassword("abcdef").strength).toBe("weak")
    })

    it("long complex password is 'strong'", () => {
      const result = validatePassword("MyPass123!@#")
      expect(result.strength).toBe("strong")
    })

    it("moderate password scores 'fair' or better", () => {
      const result = validatePassword("MyPass1")
      expect(["fair", "good", "strong"]).toContain(result.strength)
    })

    it("valid password always has non-null strength", () => {
      expect(validatePassword("abc123").strength).toBeTruthy()
    })
  })
})

// ============================================================================
// validatePasswordMatch
// ============================================================================

describe("validatePasswordMatch", () => {
  it("returns valid when both passwords are identical", () => {
    expect(validatePasswordMatch("Secret1!", "Secret1!").isValid).toBe(true)
  })

  it("returns invalid when passwords differ", () => {
    const result = validatePasswordMatch("Secret1!", "Different!")
    expect(result.isValid).toBe(false)
    expect(result.error).toContain("do not match")
  })

  it("is case-sensitive", () => {
    expect(validatePasswordMatch("abc", "ABC").isValid).toBe(false)
  })
})

// ============================================================================
// validateRequired
// ============================================================================

describe("validateRequired", () => {
  it("returns valid when all required fields are filled", () => {
    const result = validateRequired({ name: "John", email: "j@x.com" }, ["name", "email"])
    expect(result.isValid).toBe(true)
    expect(result.missingFields).toHaveLength(0)
  })

  it("returns invalid when a required field is empty string", () => {
    const result = validateRequired({ name: "", email: "j@x.com" }, ["name", "email"])
    expect(result.isValid).toBe(false)
    expect(result.missingFields).toContain("name")
  })

  it("returns invalid when a required field is null", () => {
    const result = validateRequired({ name: null, phone: "123" }, ["name"])
    expect(result.isValid).toBe(false)
  })

  it("returns invalid when a required field is undefined", () => {
    const result = validateRequired({ phone: undefined }, ["phone"] as ["phone"])
    expect(result.isValid).toBe(false)
  })

  it("lists all missing fields", () => {
    const result = validateRequired({ name: "", email: "" }, ["name", "email"])
    expect(result.missingFields).toEqual(["name", "email"])
  })

  it("generates singular error for one missing field", () => {
    const result = validateRequired({ name: "" }, ["name"])
    expect(result.error).toContain("name")
    expect(result.error).toContain("required")
  })

  it("generates plural error for multiple missing fields", () => {
    const result = validateRequired({ name: "", email: "" }, ["name", "email"])
    expect(result.error).toContain("required fields")
  })

  it("uses fieldLabels in error message when provided", () => {
    const result = validateRequired(
      { phone_number: "" },
      ["phone_number"],
      { fieldLabels: { phone_number: "Phone Number" } }
    )
    expect(result.error).toContain("Phone Number")
  })

  it("uses custom errorMessage when provided", () => {
    const result = validateRequired({ name: "" }, ["name"], { errorMessage: "Oops, fill it in" })
    expect(result.error).toBe("Oops, fill it in")
  })

  it("accepts boolean true as a filled value", () => {
    const result = validateRequired({ agreed: true }, ["agreed"])
    expect(result.isValid).toBe(true)
  })

  it("accepts numeric 0 as filled (NaN is not filled)", () => {
    // 0 is a valid number, NaN is not
    const result = validateRequired({ count: 0 }, ["count"])
    expect(result.isValid).toBe(true)
  })

  it("returns valid with empty required list", () => {
    const result = validateRequired({ name: "" }, [])
    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// hasRequiredFields
// ============================================================================

describe("hasRequiredFields", () => {
  it("returns true when all fields are filled", () => {
    expect(hasRequiredFields({ name: "John", age: 25 }, ["name", "age"])).toBe(true)
  })

  it("returns false when any required field is empty", () => {
    expect(hasRequiredFields({ name: "", age: 25 }, ["name", "age"])).toBe(false)
  })

  it("returns false when a field is null", () => {
    expect(hasRequiredFields({ name: null }, ["name"])).toBe(false)
  })

  it("returns true for empty required list", () => {
    expect(hasRequiredFields({ name: "" }, [])).toBe(true)
  })
})
