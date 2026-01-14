/**
 * CSRF Protection Tests
 * Tests for CSRF token utilities including timing-safe comparison
 */

import {
  timingSafeEqual,
  generateCsrfToken,
  createCsrfTokenData,
  encodeCsrfToken,
  decodeCsrfToken,
} from "@/lib/csrf"

describe("CSRF Utilities", () => {
  describe("timingSafeEqual", () => {
    it("returns true for identical strings", () => {
      expect(timingSafeEqual("abc123", "abc123")).toBe(true)
      expect(timingSafeEqual("", "")).toBe(false) // Empty strings return false
    })

    it("returns false for different strings", () => {
      expect(timingSafeEqual("abc123", "abc124")).toBe(false)
      expect(timingSafeEqual("abc", "abcd")).toBe(false)
      expect(timingSafeEqual("ABC", "abc")).toBe(false)
    })

    it("returns false for null or undefined inputs", () => {
      expect(timingSafeEqual(null, "abc")).toBe(false)
      expect(timingSafeEqual("abc", null)).toBe(false)
      expect(timingSafeEqual(undefined, "abc")).toBe(false)
      expect(timingSafeEqual("abc", undefined)).toBe(false)
      expect(timingSafeEqual(null, null)).toBe(false)
      expect(timingSafeEqual(undefined, undefined)).toBe(false)
    })

    it("returns false for empty strings", () => {
      expect(timingSafeEqual("", "abc")).toBe(false)
      expect(timingSafeEqual("abc", "")).toBe(false)
    })

    it("handles long strings correctly", () => {
      const longStr1 = "a".repeat(10000)
      const longStr2 = "a".repeat(10000)
      const longStr3 = "a".repeat(9999) + "b"

      expect(timingSafeEqual(longStr1, longStr2)).toBe(true)
      expect(timingSafeEqual(longStr1, longStr3)).toBe(false)
    })

    it("handles special characters", () => {
      expect(timingSafeEqual("Bearer abc123!@#", "Bearer abc123!@#")).toBe(true)
      expect(timingSafeEqual("Bearer abc123!@#", "Bearer abc123!@$")).toBe(false)
    })
  })

  describe("generateCsrfToken", () => {
    it("generates a 64-character hex string", () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
    })

    it("generates unique tokens", () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe("createCsrfTokenData", () => {
    it("creates token data with expiry", () => {
      const now = Date.now()
      const data = createCsrfTokenData()

      expect(data.token).toHaveLength(64)
      expect(data.expires).toBeGreaterThan(now)
      // Should expire in ~24 hours
      expect(data.expires - now).toBeGreaterThan(23 * 60 * 60 * 1000)
      expect(data.expires - now).toBeLessThan(25 * 60 * 60 * 1000)
    })
  })

  describe("encodeCsrfToken / decodeCsrfToken", () => {
    it("encodes and decodes token data correctly", () => {
      const original = createCsrfTokenData()
      const encoded = encodeCsrfToken(original)
      const decoded = decodeCsrfToken(encoded)

      expect(decoded).not.toBeNull()
      expect(decoded?.token).toBe(original.token)
      expect(decoded?.expires).toBe(original.expires)
    })

    it("returns null for invalid encoded data", () => {
      expect(decodeCsrfToken("invalid-base64")).toBeNull()
      expect(decodeCsrfToken("")).toBeNull()
    })

    it("returns null for malformed JSON", () => {
      // Valid base64 but invalid JSON
      const invalidJson = btoa("not json")
      expect(decodeCsrfToken(invalidJson)).toBeNull()
    })

    it("returns null for missing required fields", () => {
      // Valid JSON but missing required fields
      const missingToken = btoa(JSON.stringify({ expires: 123 }))
      const missingExpires = btoa(JSON.stringify({ token: "abc" }))

      expect(decodeCsrfToken(missingToken)).toBeNull()
      expect(decodeCsrfToken(missingExpires)).toBeNull()
    })
  })
})
