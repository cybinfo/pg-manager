/**
 * Tests for src/lib/auth/session.ts
 *
 * Covers: createSessionError, isSessionExpired, getSessionExpiryTime, getTimeUntilExpiry,
 * getSession, getUser, refreshSession, signOut, isSessionValid, requireSession,
 * getStoredContextId, setStoredContextId, clearStoredContextId.
 */

const mockCreateClient = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-01-01T00:00:00.000Z"),
}))

import type { Session } from "@supabase/supabase-js"
import {
  createSessionError,
  isSessionExpired,
  getSessionExpiryTime,
  getTimeUntilExpiry,
  getSession,
  getUser,
  refreshSession,
  signOut,
  isSessionValid,
  requireSession,
  getStoredContextId,
  setStoredContextId,
  clearStoredContextId,
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

// ============================================================================
// Helpers for Supabase-dependent tests
// ============================================================================

function makeUser(id = "user-1") {
  return {
    id,
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  }
}

function makeAuthSupabase(opts: {
  getSession?: unknown
  getUser?: unknown
  refreshSession?: unknown
  signOut?: unknown
  userContextResult?: unknown
  throwAuth?: string
}) {
  const authMethods = {
    getSession:
      opts.throwAuth === "getSession"
        ? jest.fn().mockRejectedValue(new Error("getSession threw"))
        : jest.fn().mockResolvedValue(opts.getSession ?? { data: { session: null }, error: null }),
    getUser:
      opts.throwAuth === "getUser"
        ? jest.fn().mockRejectedValue(new Error("getUser threw"))
        : jest.fn().mockResolvedValue(opts.getUser ?? { data: { user: null }, error: null }),
    refreshSession:
      opts.throwAuth === "refreshSession"
        ? jest.fn().mockRejectedValue(new Error("refreshSession threw"))
        : jest.fn().mockResolvedValue(
            opts.refreshSession ?? { data: { session: null }, error: null }
          ),
    signOut:
      opts.throwAuth === "signOut"
        ? jest.fn().mockRejectedValue(new Error("signOut threw"))
        : jest.fn().mockResolvedValue(opts.signOut ?? { error: null }),
  }

  const contextChain: Record<string, jest.Mock> = {}
  contextChain.select = jest.fn().mockReturnValue(contextChain)
  contextChain.eq = jest.fn().mockReturnValue(contextChain)
  contextChain.limit = jest.fn().mockReturnValue(contextChain)
  contextChain.single = jest
    .fn()
    .mockResolvedValue(opts.userContextResult ?? { data: null, error: null })

  const auditInsertResult = {
    then: jest
      .fn()
      .mockImplementation((cb: (v: { error: null }) => void) => {
        cb({ error: null })
        return Promise.resolve()
      }),
  }
  const auditChain = { insert: jest.fn().mockReturnValue(auditInsertResult) }

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === "audit_events") return auditChain
    return contextChain
  })

  return { auth: authMethods, from: mockFrom }
}

// ============================================================================
// getSession
// ============================================================================

describe("getSession", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("returns user and session when session is valid", async () => {
    const session = makeSession(Math.floor(Date.now() / 1000) + 3600)
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session }, error: null } })
    )

    const result = await getSession()
    expect(result.session).toBe(session)
    expect(result.user).toBe(session.user)
    expect(result.error).toBeNull()
  })

  it("returns NO_SESSION error when supabase returns error", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getSession: { data: { session: null }, error: { message: "Auth error" } },
      })
    )

    const result = await getSession()
    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
    expect(result.error?.code).toBe("NO_SESSION")
    expect(result.error?.message).toBe("Auth error")
  })

  it("returns NO_SESSION error when data.session is null", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session: null }, error: null } })
    )

    const result = await getSession()
    expect(result.error?.code).toBe("NO_SESSION")
    expect(result.error?.message).toBe("No active session")
  })

  it("calls refreshSession when session is expired", async () => {
    const expiredSession = makeSession(Math.floor(Date.now() / 1000) - 100)
    const freshSession = makeSession(Math.floor(Date.now() / 1000) + 3600)

    // First createClient() call: returns expired session
    mockCreateClient.mockReturnValueOnce(
      makeAuthSupabase({ getSession: { data: { session: expiredSession }, error: null } })
    )
    // Second createClient() call (inside refreshSession): returns fresh session
    mockCreateClient.mockReturnValueOnce(
      makeAuthSupabase({
        refreshSession: { data: { session: freshSession }, error: null },
      })
    )

    const result = await getSession()
    expect(result.session).toBe(freshSession)
    expect(result.error).toBeNull()
  })

  it("returns NETWORK_ERROR when createClient throws", async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error("network failure")
    })

    const result = await getSession()
    expect(result.error?.code).toBe("NETWORK_ERROR")
    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
  })
})

// ============================================================================
// getUser
// ============================================================================

describe("getUser", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("returns user when authenticated", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getUser: { data: { user }, error: null } })
    )

    const result = await getUser()
    expect(result.user).toBe(user)
    expect(result.error).toBeNull()
  })

  it("returns NO_SESSION error when user is null", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getUser: { data: { user: null }, error: null } })
    )

    const result = await getUser()
    expect(result.user).toBeNull()
    expect(result.error?.code).toBe("NO_SESSION")
  })

  it("returns SESSION_EXPIRED when error message contains 'expired'", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getUser: { data: { user: null }, error: { message: "JWT expired" } },
      })
    )

    const result = await getUser()
    expect(result.error?.code).toBe("SESSION_EXPIRED")
  })

  it("returns UNKNOWN_ERROR for non-expiry auth errors", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getUser: { data: { user: null }, error: { message: "invalid token" } },
      })
    )

    const result = await getUser()
    expect(result.error?.code).toBe("UNKNOWN_ERROR")
  })

  it("returns NETWORK_ERROR when createClient throws", async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error("network failure")
    })

    const result = await getUser()
    expect(result.error?.code).toBe("NETWORK_ERROR")
    expect(result.user).toBeNull()
  })
})

// ============================================================================
// refreshSession
// ============================================================================

describe("refreshSession", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("returns refreshed session on success", async () => {
    const session = makeSession(Math.floor(Date.now() / 1000) + 3600)
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ refreshSession: { data: { session }, error: null } })
    )

    const result = await refreshSession()
    expect(result.session).toBe(session)
    expect(result.user).toBe(session.user)
    expect(result.error).toBeNull()
  })

  it("returns REFRESH_FAILED error on supabase error", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        refreshSession: { data: { session: null }, error: { message: "Refresh failed" } },
      })
    )

    const result = await refreshSession()
    expect(result.error?.code).toBe("REFRESH_FAILED")
    expect(result.session).toBeNull()
  })

  it("returns NO_SESSION when refresh returns null session", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ refreshSession: { data: { session: null }, error: null } })
    )

    const result = await refreshSession()
    expect(result.error?.code).toBe("NO_SESSION")
    expect(result.error?.message).toBe("Refresh returned no session")
  })

  it("returns NETWORK_ERROR when createClient throws", async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error("network failure")
    })

    const result = await refreshSession()
    expect(result.error?.code).toBe("NETWORK_ERROR")
    expect(result.session).toBeNull()
  })
})

// ============================================================================
// signOut
// ============================================================================

describe("signOut", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("signs out successfully when no user", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getUser: { data: { user: null }, error: null },
        signOut: { error: null },
      })
    )

    const result = await signOut()
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it("signs out successfully with user but no active workspace", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getUser: { data: { user }, error: null },
        userContextResult: { data: null, error: null },
        signOut: { error: null },
      })
    )

    const result = await signOut()
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it("logs audit event and signs out when user has active workspace", async () => {
    const user = makeUser()
    const supabaseMock = makeAuthSupabase({
      getUser: { data: { user }, error: null },
      userContextResult: { data: { workspace_id: "ws-1" }, error: null },
      signOut: { error: null },
    })
    mockCreateClient.mockReturnValue(supabaseMock)

    const result = await signOut()
    expect(result.success).toBe(true)
    expect(supabaseMock.from).toHaveBeenCalledWith("audit_events")
  })

  it("returns error when supabase.auth.signOut fails", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getUser: { data: { user: null }, error: null },
        signOut: { error: { message: "Sign out failed" } },
      })
    )

    const result = await signOut()
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe("UNKNOWN_ERROR")
  })

  it("still succeeds when audit log insert fails", async () => {
    const user = makeUser()
    const contextChain: Record<string, jest.Mock> = {}
    contextChain.select = jest.fn().mockReturnValue(contextChain)
    contextChain.eq = jest.fn().mockReturnValue(contextChain)
    contextChain.limit = jest.fn().mockReturnValue(contextChain)
    contextChain.single = jest
      .fn()
      .mockResolvedValue({ data: { workspace_id: "ws-audit-fail" }, error: null })

    const auditInsertResult = {
      then: jest
        .fn()
        .mockImplementation((cb: (v: { error: { message: string } }) => void) => {
          cb({ error: { message: "audit insert failed" } })
          return Promise.resolve()
        }),
    }

    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "audit_events") return { insert: jest.fn().mockReturnValue(auditInsertResult) }
        return contextChain
      }),
    })

    const result = await signOut()
    expect(result.success).toBe(true)
  })

  it("returns NETWORK_ERROR when createClient throws", async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error("network failure")
    })

    const result = await signOut()
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe("NETWORK_ERROR")
  })
})

// ============================================================================
// isSessionValid
// ============================================================================

describe("isSessionValid", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("returns true when session is valid", async () => {
    const session = makeSession(Math.floor(Date.now() / 1000) + 3600)
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session }, error: null } })
    )

    expect(await isSessionValid()).toBe(true)
  })

  it("returns false when there is no session", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session: null }, error: null } })
    )

    expect(await isSessionValid()).toBe(false)
  })

  it("returns false when getSession returns an error", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getSession: { data: { session: null }, error: { message: "Auth error" } },
      })
    )

    expect(await isSessionValid()).toBe(false)
  })
})

// ============================================================================
// requireSession
// ============================================================================

describe("requireSession", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
  })

  it("returns user and session when session is valid", async () => {
    const session = makeSession(Math.floor(Date.now() / 1000) + 3600)
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session }, error: null } })
    )

    const result = await requireSession()
    expect(result.session).toBe(session)
    expect(result.user).toBe(session.user)
  })

  it("throws when session is missing", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({ getSession: { data: { session: null }, error: null } })
    )

    await expect(requireSession()).rejects.toThrow("No active session")
  })

  it("throws with error message when getSession returns error", async () => {
    mockCreateClient.mockReturnValue(
      makeAuthSupabase({
        getSession: { data: { session: null }, error: { message: "Token invalid" } },
      })
    )

    await expect(requireSession()).rejects.toThrow("Token invalid")
  })
})

// ============================================================================
// getStoredContextId
// ============================================================================

describe("getStoredContextId", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns null when no value is stored", () => {
    expect(getStoredContextId()).toBeNull()
  })

  it("returns stored context ID", () => {
    localStorage.setItem("currentContextId", "ctx-123")
    expect(getStoredContextId()).toBe("ctx-123")
  })

  it("returns null when localStorage.getItem throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage error")
    })
    expect(getStoredContextId()).toBeNull()
    jest.spyOn(Storage.prototype, "getItem").mockRestore()
  })
})

// ============================================================================
// setStoredContextId
// ============================================================================

describe("setStoredContextId", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores the context ID in localStorage", () => {
    setStoredContextId("ctx-456")
    expect(localStorage.getItem("currentContextId")).toBe("ctx-456")
  })

  it("does not throw when localStorage.setItem throws", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full")
    })
    expect(() => setStoredContextId("ctx-789")).not.toThrow()
    jest.spyOn(Storage.prototype, "setItem").mockRestore()
  })
})

// ============================================================================
// clearStoredContextId
// ============================================================================

describe("clearStoredContextId", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("removes the stored context ID", () => {
    localStorage.setItem("currentContextId", "ctx-to-clear")
    clearStoredContextId()
    expect(localStorage.getItem("currentContextId")).toBeNull()
  })

  it("does not throw when localStorage.removeItem throws", () => {
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage error")
    })
    expect(() => clearStoredContextId()).not.toThrow()
    jest.spyOn(Storage.prototype, "removeItem").mockRestore()
  })
})
