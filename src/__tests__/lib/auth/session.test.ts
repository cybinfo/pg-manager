/**
 * Tests for pure utility functions in src/lib/auth/session.ts
 *
 * Covers: createSessionError, isSessionExpired, getSessionExpiryTime, getTimeUntilExpiry
 * (getSession / refreshSession / requireSession depend on Supabase — not covered here)
 */

import type { Session } from "@supabase/supabase-js"
import {
  createSessionError,
  isSessionExpired,
  getSessionExpiryTime,
  getTimeUntilExpiry,
} from "@/lib/auth/session"

// ============================================================================
// Helpers
// ============================================================================

const TOKEN_REFRESH_BUFFER_SECONDS = 15

function makeSession(expiresAt: number | undefined): Session {
  return {
    expires_at: expiresAt,
    access_token: "token",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: "user-1",
      email: "user@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    },
  } as unknown as Session
}

// ============================================================================
// createSessionError
// ============================================================================

describe("createSessionError", () => {
  it("creates a session error with code and message", () => {
    const err = createSessionError("NO_SESSION", "No active session")
    expect(err.code).toBe("NO_SESSION")
    expect(err.message).toBe("No active session")
    expect(err.originalError).toBeUndefined()
  })

  it("includes originalError when provided", () => {
    const original = new Error("original cause")
    const err = createSessionError("REFRESH_FAILED", "refresh failed", original)
    expect(err.originalError).toBe(original)
  })
})

// ============================================================================
// isSessionExpired
// ============================================================================

describe("isSessionExpired", () => {
  it("returns true for null session", () => {
    expect(isSessionExpired(null)).toBe(true)
  })

  it("returns false when session has no expires_at", () => {
    const session = makeSession(undefined)
    expect(isSessionExpired(session)).toBe(false)
  })

  it("returns false when session expires well in the future", () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const session = makeSession(futureSeconds)
    expect(isSessionExpired(session)).toBe(false)
  })

  it("returns true when session expires_at is in the past", () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 100 // 100 seconds ago
    const session = makeSession(pastSeconds)
    expect(isSessionExpired(session)).toBe(true)
  })

  it("returns true when session expires within the buffer window (15 seconds)", () => {
    // expires 5 seconds from now — within the 15s buffer
    const nearFutureSeconds = Math.floor(Date.now() / 1000) + TOKEN_REFRESH_BUFFER_SECONDS - 10
    const session = makeSession(nearFutureSeconds)
    expect(isSessionExpired(session)).toBe(true)
  })

  it("returns false when session expires just outside the buffer", () => {
    // expires 30 seconds from now — outside the 15s buffer
    const outsideBuffer = Math.floor(Date.now() / 1000) + TOKEN_REFRESH_BUFFER_SECONDS + 15
    const session = makeSession(outsideBuffer)
    expect(isSessionExpired(session)).toBe(false)
  })
})

// ============================================================================
// getSessionExpiryTime
// ============================================================================

describe("getSessionExpiryTime", () => {
  it("returns null for null session", () => {
    expect(getSessionExpiryTime(null)).toBeNull()
  })

  it("returns null when session has no expires_at", () => {
    expect(getSessionExpiryTime(makeSession(undefined))).toBeNull()
  })

  it("converts expires_at from seconds to milliseconds", () => {
    const expiresAtSeconds = 1000000
    const session = makeSession(expiresAtSeconds)
    expect(getSessionExpiryTime(session)).toBe(expiresAtSeconds * 1000)
  })
})

// ============================================================================
// getTimeUntilExpiry
// ============================================================================

describe("getTimeUntilExpiry", () => {
  it("returns null for null session", () => {
    expect(getTimeUntilExpiry(null)).toBeNull()
  })

  it("returns null when session has no expires_at", () => {
    expect(getTimeUntilExpiry(makeSession(undefined))).toBeNull()
  })

  it("returns a positive number for a future session", () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const result = getTimeUntilExpiry(makeSession(futureSeconds))
    expect(result).toBeGreaterThan(0)
    // Allow small timing variance
    expect(result).toBeLessThanOrEqual(3600 * 1000 + 5000)
  })

  it("returns 0 (not negative) for an expired session", () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 100
    const result = getTimeUntilExpiry(makeSession(pastSeconds))
    expect(result).toBe(0)
  })
})
