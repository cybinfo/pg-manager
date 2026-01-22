/**
 * Rate Limiting Tests
 * Tests for rate limiter utility functions
 */

import { createRateLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"

describe("Rate Limiting", () => {
  describe("createRateLimiter", () => {
    it("allows requests within limit", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
        prefix: "test",
      })

      const result = await limiter.check("test-user-1")

      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
      expect(result.reset).toBeDefined()
    })

    it("blocks requests exceeding limit", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        prefix: "test-block",
      })

      // Use up the quota
      await limiter.check("test-user-block")
      await limiter.check("test-user-block")

      // Third request should be blocked
      const result = await limiter.check("test-user-block")

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
    })

    it("tracks separate limits per identifier", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        prefix: "test-separate",
      })

      // User A uses their quota
      await limiter.check("user-a")
      await limiter.check("user-a")
      const userABlocked = await limiter.check("user-a")

      // User B should still have quota
      const userBResult = await limiter.check("user-b")

      expect(userABlocked.success).toBe(false)
      expect(userBResult.success).toBe(true)
      expect(userBResult.remaining).toBe(1)
    })

    it("resets quota after window expires", async () => {
      const limiter = createRateLimiter({
        windowMs: 100, // Very short window for testing
        max: 1,
        prefix: "test-reset",
      })

      // Use the quota
      await limiter.check("test-user-reset")
      const blocked = await limiter.check("test-user-reset")
      expect(blocked.success).toBe(false)

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be allowed again
      const allowed = await limiter.check("test-user-reset")
      expect(allowed.success).toBe(true)
    })

    it("can reset limit for an identifier", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        prefix: "test-manual-reset",
      })

      // Use the quota
      await limiter.check("test-user-manual")
      const blocked = await limiter.check("test-user-manual")
      expect(blocked.success).toBe(false)

      // Reset the limit
      await limiter.reset("test-user-manual")

      // Should be allowed again
      const allowed = await limiter.check("test-user-manual")
      expect(allowed.success).toBe(true)
    })
  })

  describe("getClientIdentifier", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe("192.168.1.1")
    })

    it("extracts IP from x-real-ip header", () => {
      const request = new Request("https://example.com", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe("192.168.1.2")
    })

    it("extracts IP from cf-connecting-ip header", () => {
      const request = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "192.168.1.3",
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe("192.168.1.3")
    })

    it("prefers x-forwarded-for over other headers", () => {
      const request = new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "1.1.1.1",
          "x-real-ip": "2.2.2.2",
          "cf-connecting-ip": "3.3.3.3",
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe("1.1.1.1")
    })

    it("generates fingerprint-based identifier when no IP headers", () => {
      const request = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Test Browser",
          "accept-language": "en-US",
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toMatch(/^fp_/)
    })

    it("generates different fingerprints for different user agents", () => {
      const request1 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Browser A",
        },
      })

      const request2 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Browser B",
        },
      })

      const id1 = getClientIdentifier(request1)
      const id2 = getClientIdentifier(request2)

      expect(id1).not.toBe(id2)
    })

    it("handles empty request headers gracefully", () => {
      const request = new Request("https://example.com")

      const identifier = getClientIdentifier(request)
      // Should return something, not throw
      expect(identifier).toBeDefined()
      expect(typeof identifier).toBe("string")
    })
  })

  describe("rateLimitHeaders", () => {
    it("includes all standard rate limit headers", () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      }

      const headers = rateLimitHeaders(result) as Record<string, string>

      expect(headers["X-RateLimit-Limit"]).toBe("100")
      expect(headers["X-RateLimit-Remaining"]).toBe("99")
      expect(headers["X-RateLimit-Reset"]).toBe("1700000000")
    })

    it("includes Retry-After header when rate limited", () => {
      const result = {
        success: false,
        limit: 100,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      }

      const headers = rateLimitHeaders(result) as Record<string, string | undefined>

      expect(headers["Retry-After"]).toBe("30")
    })

    it("omits Retry-After header when not rate limited", () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 50,
        reset: 1700000000,
      }

      const headers = rateLimitHeaders(result) as Record<string, string | undefined>

      expect(headers["Retry-After"]).toBeUndefined()
    })
  })
})
