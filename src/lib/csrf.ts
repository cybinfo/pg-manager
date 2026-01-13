/**
 * CSRF Protection Utility
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * Works with both API routes and Server Actions.
 *
 * Usage:
 *   // In API route:
 *   const csrfResult = validateCsrf(request)
 *   if (!csrfResult.valid) { return 403 }
 *
 *   // In client:
 *   fetch('/api/endpoint', {
 *     headers: { 'X-CSRF-Token': getCsrfToken() }
 *   })
 */

import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// Cookie name for CSRF token
export const CSRF_COOKIE_NAME = "__csrf"
export const CSRF_HEADER_NAME = "x-csrf-token"

// Token expiry (24 hours)
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

interface CsrfToken {
  token: string
  expires: number
}

/**
 * Generate a cryptographically secure CSRF token
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Create CSRF token data with expiry
 */
export function createCsrfTokenData(): CsrfToken {
  return {
    token: generateCsrfToken(),
    expires: Date.now() + TOKEN_EXPIRY_MS,
  }
}

/**
 * Encode token data for cookie storage
 * Uses btoa for Edge Runtime compatibility
 */
export function encodeCsrfToken(data: CsrfToken): string {
  return btoa(JSON.stringify(data))
}

/**
 * Decode token data from cookie
 * Uses atob for Edge Runtime compatibility
 */
export function decodeCsrfToken(encoded: string): CsrfToken | null {
  try {
    const decoded = atob(encoded)
    const data = JSON.parse(decoded) as CsrfToken
    if (data.token && data.expires) {
      return data
    }
    return null
  } catch {
    return null
  }
}

/**
 * Set CSRF cookie on response
 */
export function setCsrfCookie(response: NextResponse): { response: NextResponse; token: string } {
  const tokenData = createCsrfTokenData()
  const encoded = encodeCsrfToken(tokenData)

  response.cookies.set(CSRF_COOKIE_NAME, encoded, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_EXPIRY_MS / 1000,
  })

  return { response, token: tokenData.token }
}

/**
 * Validate CSRF token from request
 * Returns validation result with details
 */
export function validateCsrf(request: NextRequest): {
  valid: boolean
  error?: string
} {
  // Skip CSRF for safe methods
  const method = request.method.toUpperCase()
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true }
  }

  // Skip CSRF for cron endpoints (authenticated via secret)
  const path = request.nextUrl.pathname
  if (path.startsWith("/api/cron/")) {
    return { valid: true }
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (!headerToken) {
    return { valid: false, error: "Missing CSRF token in header" }
  }

  // Get token from cookie
  const cookieValue = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!cookieValue) {
    return { valid: false, error: "Missing CSRF cookie" }
  }

  // Decode and validate cookie
  const tokenData = decodeCsrfToken(cookieValue)
  if (!tokenData) {
    return { valid: false, error: "Invalid CSRF cookie format" }
  }

  // Check expiry
  if (tokenData.expires < Date.now()) {
    return { valid: false, error: "CSRF token expired" }
  }

  // Constant-time comparison to prevent timing attacks
  if (tokenData.token.length !== headerToken.length) {
    return { valid: false, error: "CSRF token mismatch" }
  }

  // Constant-time string comparison
  let mismatch = 0
  for (let i = 0; i < tokenData.token.length; i++) {
    mismatch |= tokenData.token.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  if (mismatch !== 0) {
    return { valid: false, error: "CSRF token mismatch" }
  }

  return { valid: true }
}

/**
 * Middleware helper to ensure CSRF cookie exists
 * Call this in middleware for authenticated routes
 */
export function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existingCookie = request.cookies.get(CSRF_COOKIE_NAME)

  // If cookie exists and is valid, return as-is
  if (existingCookie) {
    const tokenData = decodeCsrfToken(existingCookie.value)
    if (tokenData && tokenData.expires > Date.now()) {
      return response
    }
  }

  // Set new CSRF cookie
  const { response: newResponse } = setCsrfCookie(response)
  return newResponse
}

/**
 * Create CSRF validation error response
 */
export function csrfErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error: "CSRF_VALIDATION_FAILED",
      message: error,
    },
    { status: 403 }
  )
}

/**
 * HOC to wrap API route with CSRF validation
 */
export function withCsrf<T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const result = validateCsrf(request)
    if (!result.valid) {
      return csrfErrorResponse(result.error || "CSRF validation failed")
    }
    return handler(request, ...args)
  }) as T
}

/**
 * Server-side function to get current CSRF token
 * Use in server components to pass token to client
 */
export async function getServerCsrfToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(CSRF_COOKIE_NAME)?.value
    if (!cookieValue) return null

    const tokenData = decodeCsrfToken(cookieValue)
    if (!tokenData || tokenData.expires < Date.now()) return null

    return tokenData.token
  } catch {
    return null
  }
}
