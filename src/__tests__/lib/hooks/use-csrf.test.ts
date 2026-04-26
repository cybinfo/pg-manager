/**
 * Tests for getCsrfToken from src/lib/hooks/use-csrf.ts
 *
 * The getCsrfToken function reads from document.cookie and decodes a base64 JSON
 * payload containing { token, expires }. Tests use cookie mocking.
 */

import { getCsrfToken } from "@/lib/hooks/use-csrf"
import { CSRF_COOKIE_NAME } from "@/lib/csrf"

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
