/**
 * Tests for getCsrfToken, useCsrf hook, and standalone secureFetch from use-csrf.ts.
 */

import { renderHook } from "@testing-library/react"
import { getCsrfToken, useCsrf, secureFetch } from "@/lib/hooks/use-csrf"
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf"

const mockFetch = jest.fn().mockResolvedValue(new Response("OK", { status: 200 }))
global.fetch = mockFetch

// ============================================================================
// Helpers
// ============================================================================

function makeCsrfCookieValue(token: string, expiresOffset: number = 60000): string {
  const payload = { token, expires: Date.now() + expiresOffset }
  return btoa(JSON.stringify(payload))
}

function setCookie(name: string, value: string) {
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: `${name}=${value}`,
    configurable: true,
  })
}

function clearCookies() {
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: "",
    configurable: true,
  })
}

// ============================================================================
// getCsrfToken
// ============================================================================

describe("getCsrfToken", () => {
  afterEach(clearCookies)

  it("returns token from a valid CSRF cookie", () => {
    const value = makeCsrfCookieValue("my-secret-token")
    setCookie(CSRF_COOKIE_NAME, value)

    const token = getCsrfToken()
    expect(token).toBe("my-secret-token")
  })

  it("returns null when no cookies exist", () => {
    clearCookies()
    expect(getCsrfToken()).toBeNull()
  })

  it("returns null when cookie is expired", () => {
    const value = makeCsrfCookieValue("expired-token", -1000) // 1 second ago
    setCookie(CSRF_COOKIE_NAME, value)

    expect(getCsrfToken()).toBeNull()
  })

  it("returns null when cookie value is not valid base64", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: `${CSRF_COOKIE_NAME}=not-valid-base64!!!`,
      configurable: true,
    })
    expect(getCsrfToken()).toBeNull()
  })

  it("returns null when cookie JSON has no token field", () => {
    const payload = { expires: Date.now() + 60000 }
    const value = btoa(JSON.stringify(payload))
    setCookie(CSRF_COOKIE_NAME, value)

    expect(getCsrfToken()).toBeNull()
  })

  it("returns null when cookie value is empty string", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: `${CSRF_COOKIE_NAME}=`,
      configurable: true,
    })
    expect(getCsrfToken()).toBeNull()
  })

  it("finds the correct cookie among multiple cookies", () => {
    const value = makeCsrfCookieValue("correct-token")
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: `other_cookie=something; ${CSRF_COOKIE_NAME}=${value}; another=test`,
      configurable: true,
    })

    expect(getCsrfToken()).toBe("correct-token")
  })
})

// ============================================================================
// useCsrf hook
// ============================================================================

describe("useCsrf", () => {
  beforeEach(() => {
    clearCookies()
    mockFetch.mockClear()
  })

  it("getToken returns null when no cookie is set", () => {
    const { result } = renderHook(() => useCsrf())
    expect(result.current.getToken()).toBeNull()
  })

  it("getToken returns token when valid cookie is set", () => {
    const value = makeCsrfCookieValue("hook-token")
    setCookie(CSRF_COOKIE_NAME, value)

    const { result } = renderHook(() => useCsrf())
    expect(result.current.getToken()).toBe("hook-token")
  })

  it("secureFetch adds CSRF header when token is available", async () => {
    const value = makeCsrfCookieValue("fetch-token")
    setCookie(CSRF_COOKIE_NAME, value)

    const { result } = renderHook(() => useCsrf())
    await result.current.secureFetch("https://example.com/api", { method: "POST" })

    expect(mockFetch).toHaveBeenCalled()
    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get(CSRF_HEADER_NAME)).toBe("fetch-token")
  })

  it("secureFetch does not add CSRF header when no token", async () => {
    const { result } = renderHook(() => useCsrf())
    await result.current.secureFetch("https://example.com/api")

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get(CSRF_HEADER_NAME)).toBeNull()
  })

  it("securePost sends JSON with CSRF header when token is available", async () => {
    const value = makeCsrfCookieValue("post-token")
    setCookie(CSRF_COOKIE_NAME, value)

    const { result } = renderHook(() => useCsrf())
    await result.current.securePost("https://example.com/api", { name: "Alice" })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://example.com/api")
    expect(options.method).toBe("POST")
    expect(options.body).toBe(JSON.stringify({ name: "Alice" }))
    expect((options.headers as Record<string, string>)[CSRF_HEADER_NAME]).toBe("post-token")
  })

  it("securePost does not add CSRF header when no token", async () => {
    const { result } = renderHook(() => useCsrf())
    await result.current.securePost("https://example.com/api", { name: "Bob" })

    const [, options] = mockFetch.mock.calls[0]
    expect((options.headers as Record<string, string>)[CSRF_HEADER_NAME]).toBeUndefined()
  })
})

// ============================================================================
// standalone secureFetch
// ============================================================================

describe("secureFetch (standalone)", () => {
  beforeEach(() => {
    clearCookies()
    mockFetch.mockClear()
  })

  it("adds CSRF header when token is available", async () => {
    const value = makeCsrfCookieValue("standalone-token")
    setCookie(CSRF_COOKIE_NAME, value)

    await secureFetch("https://example.com/api", { method: "POST" })

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get(CSRF_HEADER_NAME)).toBe("standalone-token")
  })

  it("does not add CSRF header when no token", async () => {
    await secureFetch("https://example.com/api")

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get(CSRF_HEADER_NAME)).toBeNull()
  })

  it("passes through all fetch options", async () => {
    await secureFetch("https://example.com/api", {
      method: "DELETE",
      body: "data",
    })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.method).toBe("DELETE")
    expect(options.body).toBe("data")
  })
})
