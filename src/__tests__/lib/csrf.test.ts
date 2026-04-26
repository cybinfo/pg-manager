/**
 * CSRF Protection Tests
 * Tests for CSRF token utilities including timing-safe comparison
 */

const mockNextResponseJson = jest.fn((data: unknown, opts?: { status?: number }) => ({
  status: opts?.status ?? 200,
  _data: data,
  cookies: { set: jest.fn() },
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockNextResponseJson(...args),
  },
}))

const mockCookiesGet = jest.fn()
const mockCookiesStore = { get: (...args: unknown[]) => mockCookiesGet(...args) }
const mockCookiesFn = jest.fn().mockResolvedValue(mockCookiesStore)

jest.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookiesFn(...args),
}))

import {
  timingSafeEqual,
  generateCsrfToken,
  createCsrfTokenData,
  encodeCsrfToken,
  decodeCsrfToken,
  setCsrfCookie,
  validateCsrf,
  ensureCsrfCookie,
  csrfErrorResponse,
  withCsrf,
  getServerCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/csrf"

// Build a mock NextRequest with configurable method, path, headers, cookies
function makeNextRequest(options: {
  method?: string
  path?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
}) {
  return {
    method: options.method ?? "POST",
    nextUrl: { pathname: options.path ?? "/api/test" },
    headers: { get: (name: string) => (options.headers ?? {})[name.toLowerCase()] ?? null },
    cookies: {
      get: (name: string) => {
        const v = (options.cookies ?? {})[name]
        return v ? { value: v } : undefined
      },
    },
  }
}

// Build a mock NextResponse with a cookies.set mock
function makeNextResponse() {
  return { cookies: { set: jest.fn() } }
}

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

// ============================================================================
// setCsrfCookie
// ============================================================================

describe("setCsrfCookie", () => {
  it("calls response.cookies.set with CSRF cookie name", () => {
    const response = makeNextResponse()
    const { token } = setCsrfCookie(response as never)

    expect(response.cookies.set).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: "strict" })
    )
    expect(typeof token).toBe("string")
    expect(token).toHaveLength(64)
  })

  it("returns the same response object", () => {
    const response = makeNextResponse()
    const { response: returned } = setCsrfCookie(response as never)
    expect(returned).toBe(response)
  })
})

// ============================================================================
// validateCsrf
// ============================================================================

describe("validateCsrf", () => {
  it("returns valid=true for GET requests (safe method)", () => {
    const req = makeNextRequest({ method: "GET" })
    expect(validateCsrf(req as never)).toEqual({ valid: true })
  })

  it("returns valid=true for HEAD requests", () => {
    expect(validateCsrf(makeNextRequest({ method: "HEAD" }) as never)).toEqual({ valid: true })
  })

  it("returns valid=true for OPTIONS requests", () => {
    expect(validateCsrf(makeNextRequest({ method: "OPTIONS" }) as never)).toEqual({ valid: true })
  })

  it("returns valid=true for cron endpoint paths", () => {
    const req = makeNextRequest({ method: "POST", path: "/api/cron/generate-bills" })
    expect(validateCsrf(req as never)).toEqual({ valid: true })
  })

  it("returns valid=false when CSRF header is missing", () => {
    const req = makeNextRequest({ method: "POST" })
    const result = validateCsrf(req as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Missing CSRF token in header")
  })

  it("returns valid=false when CSRF cookie is missing", () => {
    const req = makeNextRequest({ method: "POST", headers: { [CSRF_HEADER_NAME]: "some-token" } })
    const result = validateCsrf(req as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Missing CSRF cookie")
  })

  it("returns valid=false when cookie has invalid format", () => {
    const req = makeNextRequest({
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: "some-token" },
      cookies: { [CSRF_COOKIE_NAME]: "invalid-cookie-value" },
    })
    const result = validateCsrf(req as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Invalid CSRF cookie format")
  })

  it("returns valid=false when token is expired", () => {
    const expired = encodeCsrfToken({ token: "abc123def456".repeat(5) + "ab", expires: Date.now() - 1000 })
    const req = makeNextRequest({
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: "abc123def456" },
      cookies: { [CSRF_COOKIE_NAME]: expired },
    })
    const result = validateCsrf(req as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("expired")
  })

  it("returns valid=false when token does not match cookie", () => {
    const realToken = generateCsrfToken()
    const cookieEncoded = encodeCsrfToken({ token: realToken, expires: Date.now() + 3600000 })
    const req = makeNextRequest({
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: "wrong-token-entirely" },
      cookies: { [CSRF_COOKIE_NAME]: cookieEncoded },
    })
    const result = validateCsrf(req as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("mismatch")
  })

  it("returns valid=true when header token matches cookie token", () => {
    const realToken = generateCsrfToken()
    const cookieEncoded = encodeCsrfToken({ token: realToken, expires: Date.now() + 3600000 })
    const req = makeNextRequest({
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: realToken },
      cookies: { [CSRF_COOKIE_NAME]: cookieEncoded },
    })
    expect(validateCsrf(req as never)).toEqual({ valid: true })
  })
})

// ============================================================================
// ensureCsrfCookie
// ============================================================================

describe("ensureCsrfCookie", () => {
  it("returns original response when cookie exists and is valid", () => {
    const realToken = generateCsrfToken()
    const cookieEncoded = encodeCsrfToken({ token: realToken, expires: Date.now() + 3600000 })
    const req = makeNextRequest({ cookies: { [CSRF_COOKIE_NAME]: cookieEncoded } })
    const response = makeNextResponse()
    const returned = ensureCsrfCookie(req as never, response as never)
    expect(returned).toBe(response)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })

  it("sets new CSRF cookie when cookie is missing", () => {
    const req = makeNextRequest({ cookies: {} })
    const response = makeNextResponse()
    ensureCsrfCookie(req as never, response as never)
    expect(response.cookies.set).toHaveBeenCalled()
  })

  it("sets new CSRF cookie when existing cookie is expired", () => {
    const expired = encodeCsrfToken({ token: generateCsrfToken(), expires: Date.now() - 1000 })
    const req = makeNextRequest({ cookies: { [CSRF_COOKIE_NAME]: expired } })
    const response = makeNextResponse()
    ensureCsrfCookie(req as never, response as never)
    expect(response.cookies.set).toHaveBeenCalled()
  })

  it("sets new CSRF cookie when existing cookie has invalid format", () => {
    const req = makeNextRequest({ cookies: { [CSRF_COOKIE_NAME]: "not-valid-base64-json" } })
    const response = makeNextResponse()
    ensureCsrfCookie(req as never, response as never)
    expect(response.cookies.set).toHaveBeenCalled()
  })
})

// ============================================================================
// csrfErrorResponse
// ============================================================================

describe("csrfErrorResponse", () => {
  it("calls NextResponse.json with 403 status", () => {
    mockNextResponseJson.mockClear()
    csrfErrorResponse("Token expired")
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: "CSRF_VALIDATION_FAILED", message: "Token expired" }),
      { status: 403 }
    )
  })
})

// ============================================================================
// withCsrf
// ============================================================================

describe("withCsrf", () => {
  it("calls handler when CSRF is valid", async () => {
    const realToken = generateCsrfToken()
    const cookieEncoded = encodeCsrfToken({ token: realToken, expires: Date.now() + 3600000 })
    const req = makeNextRequest({
      method: "POST",
      headers: { [CSRF_HEADER_NAME]: realToken },
      cookies: { [CSRF_COOKIE_NAME]: cookieEncoded },
    })
    const handler = jest.fn().mockResolvedValue({ status: 200 })
    const wrapped = withCsrf(handler as never)
    await wrapped(req as never)
    expect(handler).toHaveBeenCalled()
  })

  it("returns 403 error response when CSRF is invalid", async () => {
    mockNextResponseJson.mockClear()
    const req = makeNextRequest({ method: "POST" }) // missing CSRF header
    const handler = jest.fn()
    const wrapped = withCsrf(handler as never)
    await wrapped(req as never)
    expect(handler).not.toHaveBeenCalled()
    expect(mockNextResponseJson).toHaveBeenCalled()
  })
})

// ============================================================================
// getServerCsrfToken
// ============================================================================

describe("getServerCsrfToken", () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockCookiesFn.mockResolvedValue(mockCookiesStore)
  })

  it("returns null when CSRF cookie is missing", async () => {
    mockCookiesGet.mockReturnValue(undefined)
    expect(await getServerCsrfToken()).toBeNull()
  })

  it("returns null when cookie value is invalid", async () => {
    mockCookiesGet.mockReturnValue({ value: "invalid-encoded" })
    expect(await getServerCsrfToken()).toBeNull()
  })

  it("returns null when token is expired", async () => {
    const expired = encodeCsrfToken({ token: generateCsrfToken(), expires: Date.now() - 1000 })
    mockCookiesGet.mockReturnValue({ value: expired })
    expect(await getServerCsrfToken()).toBeNull()
  })

  it("returns token string when cookie is valid", async () => {
    const realToken = generateCsrfToken()
    const encoded = encodeCsrfToken({ token: realToken, expires: Date.now() + 3600000 })
    mockCookiesGet.mockReturnValue({ value: encoded })
    const result = await getServerCsrfToken()
    expect(result).toBe(realToken)
  })

  it("returns null when cookies() throws", async () => {
    mockCookiesFn.mockRejectedValue(new Error("headers unavailable"))
    expect(await getServerCsrfToken()).toBeNull()
  })
})
