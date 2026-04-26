/**
 * Tests for API Middleware Utilities
 *
 * Tests all exported functions from api-middleware.ts:
 * - Rate limiting helpers
 * - Cron secret validation
 * - Admin Supabase client
 * - CSRF validation
 * - Tenant access authorization
 * - Combined validation helpers
 */

// These are declared at module scope and initialized immediately so jest.mock factories
// can close over them. Declared as const since the variable bindings are never reassigned
// (calling .mockResolvedValue etc. mutates the mock object, not the binding).
const mockCronCheck: jest.Mock = jest.fn()
const mockApiCheck: jest.Mock = jest.fn()
const mockSensitiveCheck: jest.Mock = jest.fn()
const mockAdminCheck: jest.Mock = jest.fn()
const mockValidateCsrfToken: jest.Mock = jest.fn()
const mockSupabaseCreateClient: jest.Mock = jest.fn()
const mockGetUser: jest.Mock = jest.fn()
const mockFrom: jest.Mock = jest.fn()

jest.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: jest.fn(() => "test-client-id"),
  rateLimitHeaders: jest.fn((result: { limit: number; remaining: number; reset: number; retryAfter?: number }) => {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    }
    if (result.retryAfter) {
      headers["Retry-After"] = result.retryAfter.toString()
    }
    return headers
  }),
  cronLimiter: { check: (...args: unknown[]) => mockCronCheck(...args) },
  apiLimiter: { check: (...args: unknown[]) => mockApiCheck(...args) },
  sensitiveLimiter: { check: (...args: unknown[]) => mockSensitiveCheck(...args) },
  adminLimiter: { check: (...args: unknown[]) => mockAdminCheck(...args) },
}))

jest.mock("@/lib/csrf", () => ({
  timingSafeEqual: jest.fn((a: string | null, b: string | null) => {
    if (!a || !b) return false
    return a === b
  }),
  validateCsrf: (...args: unknown[]) => mockValidateCsrfToken(...args),
}))

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockSupabaseCreateClient(...args),
}))

const mockServerSupabase = {
  auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  from: (...args: unknown[]) => mockFrom(...args),
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockServerSupabase)),
}))

import {
  checkRateLimit,
  checkCronRateLimit,
  checkApiRateLimit,
  checkSensitiveRateLimit,
  checkAdminRateLimit,
  validateCronSecret,
  validateCronRequest,
  getAdminSupabaseClient,
  validateCsrf,
  validateApiRequest,
  validateSensitiveRequest,
  checkTenantAccess,
  validateTenantRequest,
} from "@/lib/api-middleware"

// Helper to extract JSON body from a response
async function getResponseBody(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>
}

describe("API Middleware Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  describe("checkRateLimit", () => {
    it("returns success when rate limit is not exceeded", async () => {
      const mockLimiter = {
        check: jest.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: 1700000000,
        }),
      }

      const request = new Request("https://example.com/api/test")
      const result = await checkRateLimit(request, mockLimiter, "test endpoint")

      expect(result.success).toBe(true)
      expect(result.result?.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it("returns error response when rate limit is exceeded", async () => {
      const mockLimiter = {
        check: jest.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: 1700000000,
          retryAfter: 30,
        }),
      }

      const request = new Request("https://example.com/api/test")
      const result = await checkRateLimit(request, mockLimiter, "test endpoint")

      expect(result.success).toBe(false)
      expect(result.response).toBeDefined()
      expect(result.response!.status).toBe(429)

      const body = await getResponseBody(result.response!)
      expect(body.success).toBe(false)
      const error = body.error as Record<string, unknown>
      expect(error.code).toBe("TOO_MANY_REQUESTS")
      expect(error.message).toContain("test endpoint")
    })

    it("uses default endpoint description when not provided", async () => {
      const mockLimiter = {
        check: jest.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: 1700000000,
          retryAfter: 30,
        }),
      }

      const request = new Request("https://example.com/api/test")
      const result = await checkRateLimit(request, mockLimiter)

      expect(result.success).toBe(false)
      const body = await getResponseBody(result.response!)
      const error = body.error as Record<string, unknown>
      expect(error.message).toContain("this endpoint")
    })
  })

  describe("checkCronRateLimit", () => {
    it("uses cron limiter", async () => {
      mockCronCheck.mockResolvedValue({
        success: true,
        limit: 2,
        remaining: 1,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/cron/test")
      const result = await checkCronRateLimit(request)

      expect(result.success).toBe(true)
      expect(mockCronCheck).toHaveBeenCalledWith("test-client-id")
    })

    it("returns error when cron rate limit exceeded", async () => {
      mockCronCheck.mockResolvedValue({
        success: false,
        limit: 2,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      })

      const request = new Request("https://example.com/api/cron/test")
      const result = await checkCronRateLimit(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(429)
    })
  })

  describe("checkApiRateLimit", () => {
    it("uses api limiter", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/test")
      const result = await checkApiRateLimit(request)

      expect(result.success).toBe(true)
      expect(mockApiCheck).toHaveBeenCalledWith("test-client-id")
    })
  })

  describe("checkSensitiveRateLimit", () => {
    it("uses sensitive limiter", async () => {
      mockSensitiveCheck.mockResolvedValue({
        success: true,
        limit: 3,
        remaining: 2,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/sensitive")
      const result = await checkSensitiveRateLimit(request)

      expect(result.success).toBe(true)
      expect(mockSensitiveCheck).toHaveBeenCalledWith("test-client-id")
    })
  })

  describe("checkAdminRateLimit", () => {
    it("uses admin limiter", async () => {
      mockAdminCheck.mockResolvedValue({
        success: true,
        limit: 20,
        remaining: 19,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/admin")
      const result = await checkAdminRateLimit(request)

      expect(result.success).toBe(true)
      expect(mockAdminCheck).toHaveBeenCalledWith("test-client-id")
    })
  })

  // ==========================================================================
  // CRON SECRET VALIDATION
  // ==========================================================================

  describe("validateCronSecret", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it("returns error when CRON_SECRET env var is not set", () => {
      delete process.env.CRON_SECRET

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer some-secret" },
      })

      const result = validateCronSecret(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(500)
    })

    it("returns error for invalid authorization header", () => {
      process.env.CRON_SECRET = "my-cron-secret"

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer wrong-secret" },
      })

      const result = validateCronSecret(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(401)
    })

    it("returns error when authorization header is missing", () => {
      process.env.CRON_SECRET = "my-cron-secret"

      const request = new Request("https://example.com/api/cron/test")

      const result = validateCronSecret(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(401)
    })

    it("returns success with valid authorization header", () => {
      process.env.CRON_SECRET = "my-cron-secret"

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer my-cron-secret" },
      })

      const result = validateCronSecret(request)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })
  })

  // ==========================================================================
  // VALIDATE CRON REQUEST (combined)
  // ==========================================================================

  describe("validateCronRequest", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      process.env.CRON_SECRET = "test-secret"
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
      mockSupabaseCreateClient.mockReturnValue({ mock: "supabase" })
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it("fails when rate limit is exceeded", async () => {
      mockCronCheck.mockResolvedValue({
        success: false,
        limit: 2,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      })

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer test-secret" },
      })

      const result = await validateCronRequest(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(429)
    })

    it("fails when cron secret is invalid", async () => {
      mockCronCheck.mockResolvedValue({
        success: true,
        limit: 2,
        remaining: 1,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer wrong-secret" },
      })

      const result = await validateCronRequest(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(401)
    })

    it("succeeds with valid rate limit and secret, returns supabase client", async () => {
      mockCronCheck.mockResolvedValue({
        success: true,
        limit: 2,
        remaining: 1,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/cron/test", {
        headers: { authorization: "Bearer test-secret" },
      })

      const result = await validateCronRequest(request)

      expect(result.success).toBe(true)
      expect(result.supabase).toBeDefined()
      expect(result.response).toBeUndefined()
    })
  })

  // ==========================================================================
  // ADMIN SUPABASE CLIENT
  // ==========================================================================

  describe("getAdminSupabaseClient", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key"

      expect(() => getAdminSupabaseClient()).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      )
    })

    it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => getAdminSupabaseClient()).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      )
    })

    it("throws when both env vars are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => getAdminSupabaseClient()).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      )
    })

    it("creates Supabase client with correct env vars", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
      mockSupabaseCreateClient.mockReturnValue({ mock: "admin-client" })

      const client = getAdminSupabaseClient()

      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-service-role-key"
      )
      expect(client).toEqual({ mock: "admin-client" })
    })
  })

  // ==========================================================================
  // CSRF VALIDATION
  // ==========================================================================

  describe("validateCsrf", () => {
    it("returns success when CSRF token is valid", () => {
      mockValidateCsrfToken.mockReturnValue({ valid: true })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = validateCsrf(request)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it("returns error when CSRF validation fails", () => {
      mockValidateCsrfToken.mockReturnValue({
        valid: false,
        error: "CSRF token mismatch",
      })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = validateCsrf(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(403)
    })

    it("uses error message from csrf validation when available", async () => {
      mockValidateCsrfToken.mockReturnValue({
        valid: false,
        error: "Missing CSRF token in header",
      })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = validateCsrf(request)

      expect(result.success).toBe(false)
      const body = await getResponseBody(result.response!)
      const error = body.error as Record<string, unknown>
      expect(error.message).toBe("Missing CSRF token in header")
    })

    it("uses default error message when csrf error is empty", async () => {
      mockValidateCsrfToken.mockReturnValue({
        valid: false,
        error: undefined,
      })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = validateCsrf(request)

      expect(result.success).toBe(false)
      const body = await getResponseBody(result.response!)
      const error = body.error as Record<string, unknown>
      expect(error.message).toBe("CSRF validation failed")
    })
  })

  // ==========================================================================
  // COMBINED VALIDATIONS
  // ==========================================================================

  describe("validateApiRequest", () => {
    it("returns success when rate limit passes and no CSRF required", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/test")
      const result = await validateApiRequest(request)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it("returns error when rate limit fails", async () => {
      mockApiCheck.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      })

      const request = new Request("https://example.com/api/test")
      const result = await validateApiRequest(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(429)
    })

    it("validates CSRF when csrf option is true", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })
      mockValidateCsrfToken.mockReturnValue({ valid: true })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = await validateApiRequest(request, { csrf: true })

      expect(result.success).toBe(true)
      expect(mockValidateCsrfToken).toHaveBeenCalled()
    })

    it("returns error when CSRF fails with csrf option true", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })
      mockValidateCsrfToken.mockReturnValue({
        valid: false,
        error: "Missing CSRF token",
      })

      const request = new Request("https://example.com/api/test", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = await validateApiRequest(request, { csrf: true })

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(403)
    })

    it("does not check CSRF when csrf option is false (default)", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })

      const request = new Request("https://example.com/api/test")
      const result = await validateApiRequest(request)

      expect(result.success).toBe(true)
      expect(mockValidateCsrfToken).not.toHaveBeenCalled()
    })

    it("uses custom limiter when provided", async () => {
      const customLimiter = {
        check: jest.fn().mockResolvedValue({
          success: true,
          limit: 50,
          remaining: 49,
          reset: 1700000000,
        }),
      }

      const request = new Request("https://example.com/api/test")
      const result = await validateApiRequest(request, { limiter: customLimiter })

      expect(result.success).toBe(true)
      expect(customLimiter.check).toHaveBeenCalledWith("test-client-id")
      expect(mockApiCheck).not.toHaveBeenCalled()
    })
  })

  describe("validateSensitiveRequest", () => {
    it("uses sensitive limiter and CSRF validation", async () => {
      mockSensitiveCheck.mockResolvedValue({
        success: true,
        limit: 3,
        remaining: 2,
        reset: 1700000000,
      })
      mockValidateCsrfToken.mockReturnValue({ valid: true })

      const request = new Request("https://example.com/api/sensitive", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = await validateSensitiveRequest(request)

      expect(result.success).toBe(true)
      expect(mockSensitiveCheck).toHaveBeenCalled()
      expect(mockValidateCsrfToken).toHaveBeenCalled()
    })

    it("fails when rate limit is exceeded", async () => {
      mockSensitiveCheck.mockResolvedValue({
        success: false,
        limit: 3,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      })

      const request = new Request("https://example.com/api/sensitive", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = await validateSensitiveRequest(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(429)
      expect(mockValidateCsrfToken).not.toHaveBeenCalled()
    })

    it("fails when CSRF check fails", async () => {
      mockSensitiveCheck.mockResolvedValue({
        success: true,
        limit: 3,
        remaining: 2,
        reset: 1700000000,
      })
      mockValidateCsrfToken.mockReturnValue({
        valid: false,
        error: "CSRF token mismatch",
      })

      const request = new Request("https://example.com/api/sensitive", {
        method: "POST",
      }) as unknown as import("next/server").NextRequest

      const result = await validateSensitiveRequest(request)

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(403)
    })
  })

  // ==========================================================================
  // TENANT ACCESS AUTHORIZATION
  // ==========================================================================

  describe("checkTenantAccess", () => {
    it("returns unauthorized when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await checkTenantAccess("tenant-123")

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(401)
    })

    it("returns not found when tenant does not exist", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@test.com" } },
      })

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          }),
        }),
      }))

      const result = await checkTenantAccess("nonexistent-tenant")

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(404)
    })

    it("grants access when user is the owner", async () => {
      const userId = "owner-user-id"
      mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email: "owner@test.com" } },
      })

      const tenantData = { id: "tenant-123", owner_id: userId }
      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: tenantData, error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const result = await checkTenantAccess("tenant-123")

      expect(result.success).toBe(true)
      expect(result.tenant).toEqual(tenantData)
      expect(result.user).toEqual({ id: userId, email: "owner@test.com" })
    })

    it("grants access when user is a platform admin", async () => {
      const userId = "admin-user-id"
      const ownerId = "different-owner-id"
      mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email: "admin@test.com" } },
      })

      const tenantData = { id: "tenant-123", owner_id: ownerId }

      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: tenantData, error: null }),
              }),
            }),
          }
        }
        if (table === "platform_admins") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: userId },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const result = await checkTenantAccess("tenant-123")

      expect(result.success).toBe(true)
      expect(result.tenant).toEqual(tenantData)
      expect(result.user).toEqual({ id: userId, email: "admin@test.com" })
    })

    it("grants access when user is staff with context", async () => {
      const staffUserId = "staff-user-id"
      const ownerId = "owner-id"
      mockGetUser.mockResolvedValue({
        data: { user: { id: staffUserId, email: "staff@test.com" } },
      })

      const tenantData = { id: "tenant-123", owner_id: ownerId }

      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: tenantData, error: null }),
              }),
            }),
          }
        }
        if (table === "platform_admins") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              }),
            }),
          }
        }
        if (table === "user_contexts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: "context-1" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const result = await checkTenantAccess("tenant-123")

      expect(result.success).toBe(true)
      expect(result.tenant).toEqual(tenantData)
      expect(result.user).toEqual({ id: staffUserId, email: "staff@test.com" })
    })

    it("denies access when user is not owner, admin, or staff", async () => {
      const userId = "random-user-id"
      const ownerId = "different-owner-id"
      mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email: "random@test.com" } },
      })

      const tenantData = { id: "tenant-123", owner_id: ownerId }

      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: tenantData, error: null }),
              }),
            }),
          }
        }
        if (table === "platform_admins") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              }),
            }),
          }
        }
        if (table === "user_contexts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const result = await checkTenantAccess("tenant-123")

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(403)
    })
  })

  // ==========================================================================
  // VALIDATE TENANT REQUEST (combined)
  // ==========================================================================

  describe("validateTenantRequest", () => {
    it("fails when rate limit is exceeded", async () => {
      mockApiCheck.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: 1700000000,
        retryAfter: 30,
      })

      const request = new Request("https://example.com/api/tenant")
      const result = await validateTenantRequest(request, "tenant-123")

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(429)
    })

    it("fails when user is not authenticated", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = new Request("https://example.com/api/tenant")
      const result = await validateTenantRequest(request, "tenant-123")

      expect(result.success).toBe(false)
      expect(result.response!.status).toBe(401)
    })

    it("succeeds when rate limit passes and tenant access is granted", async () => {
      mockApiCheck.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000,
      })

      const userId = "owner-id"
      mockGetUser.mockResolvedValue({
        data: { user: { id: userId, email: "owner@test.com" } },
      })

      const tenantData = { id: "tenant-123", owner_id: userId }
      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: tenantData, error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const request = new Request("https://example.com/api/tenant")
      const result = await validateTenantRequest(request, "tenant-123")

      expect(result.success).toBe(true)
      expect(result.tenant).toEqual(tenantData)
      expect(result.user).toEqual({ id: userId, email: "owner@test.com" })
    })
  })
})
