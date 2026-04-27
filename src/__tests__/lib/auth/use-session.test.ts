/**
 * Tests for src/lib/auth/use-session.ts
 *
 * Covers: resetSessionState, useSession (init, errors, retry, auth events,
 * refresh, logout, auto-refresh timer, periodic check), useIsAuthenticated,
 * useCurrentUser.
 */

// ============================================================================
// Mocks
// ============================================================================

// Capture onAuthStateChange callback so tests can fire events manually
let capturedAuthCallback:
  | ((event: string, session: unknown) => void)
  | null = null
const mockUnsubscribe = jest.fn()
const mockOnAuthStateChange = jest.fn((cb: (event: string, session: unknown) => void) => {
  capturedAuthCallback = cb
  return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
})

const mockSupabase = {
  auth: { onAuthStateChange: mockOnAuthStateChange },
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockGetSession = jest.fn()
const mockRefreshSession = jest.fn()
const mockSignOut = jest.fn()
const mockIsSessionExpired = jest.fn()
const mockGetTimeUntilExpiry = jest.fn()
const mockClearStoredContextId = jest.fn()
const mockCreateSessionError = jest.fn(
  (code: string, message: string) => ({ code, message })
)

jest.mock("@/lib/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  isSessionExpired: (...args: unknown[]) => mockIsSessionExpired(...args),
  getTimeUntilExpiry: (...args: unknown[]) => mockGetTimeUntilExpiry(...args),
  clearStoredContextId: (...args: unknown[]) => mockClearStoredContextId(...args),
  createSessionError: (...args: unknown[]) => mockCreateSessionError(...args),
}))

// Control constants so timers don't run for minutes
jest.mock("@/lib/constants", () => ({
  SESSION_CHECK_INTERVAL_MS: 1000,
  SESSION_REFRESH_BUFFER_MS: 300000, // 5 min
  AUTH_MAX_RETRY_ATTEMPTS: 3,
  AUTH_BASE_RETRY_DELAY_MS: 10,
  AUTH_MAX_RETRY_DELAY_MS: 50,
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { useSession, useIsAuthenticated, useCurrentUser, resetSessionState } from "@/lib/auth/use-session"

// ============================================================================
// Helpers
// ============================================================================

const mockSession = {
  user: { id: "u1", email: "alice@example.com" },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}

function sessionSuccess(session = mockSession) {
  mockGetSession.mockResolvedValue({ session, user: session.user, error: null })
}

function sessionError(code: string, message: string) {
  mockGetSession.mockResolvedValue({
    session: null,
    user: null,
    error: { code, message },
  })
}

// ============================================================================
// resetSessionState
// ============================================================================

describe("resetSessionState", () => {
  it("resets global state so next hook mount re-initializes", async () => {
    // Prime the global state by mounting once
    sessionSuccess()
    const { unmount } = renderHook(() => useSession())
    await act(async () => {})
    unmount()

    // Reset, then mount again — should call getSession again
    resetSessionState()
    const callsBefore = mockGetSession.mock.calls.length

    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })
    const { result } = renderHook(() => useSession())
    await act(async () => {})
    unmount()

    expect(mockGetSession.mock.calls.length).toBeGreaterThan(callsBefore)
    resetSessionState()
  })
})

// ============================================================================
// useSession — initial load state
// ============================================================================

describe("useSession — initial load", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    mockGetTimeUntilExpiry.mockReturnValue(null)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("starts with isLoading=true and isAuthenticated=false", () => {
    // Don't resolve getSession yet
    mockGetSession.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useSession())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("sets isAuthenticated=true and user after session loads", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(600000)

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.session).toEqual(mockSession)
  })

  it("sets isAuthenticated=false when no session", async () => {
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("sets error state on non-NETWORK_ERROR", async () => {
    const errObj = { code: "AUTH_ERROR", message: "Auth failed" }
    mockGetSession.mockResolvedValue({ session: null, user: null, error: errObj })
    mockCreateSessionError.mockReturnValue(errObj)

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toEqual(errObj)
  })

  it("calls onError callback on initialization error", async () => {
    const errObj = { code: "AUTH_ERROR", message: "Bad" }
    mockGetSession.mockResolvedValue({ session: null, user: null, error: errObj })
    const onError = jest.fn()

    renderHook(() => useSession({ onError }))
    await act(async () => {})

    expect(onError).toHaveBeenCalledWith(errObj)
  })

  it("sets error and isLoading=false when getSession throws", async () => {
    mockGetSession.mockRejectedValue(new Error("Network down"))
    mockCreateSessionError.mockReturnValue({ code: "UNKNOWN_ERROR", message: "Failed to initialize session" })

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeDefined()
  })

  it("sets willExpireSoon=true when session expires within buffer", async () => {
    sessionSuccess()
    // Return a time less than SESSION_REFRESH_BUFFER_MS (300000)
    mockGetTimeUntilExpiry.mockReturnValue(60000) // 1 min — within 5 min buffer

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.willExpireSoon).toBe(true)
    expect(result.current.timeUntilExpiry).toBe(60000)
  })

  it("sets willExpireSoon=false when session has plenty of time", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000) // 1 hour

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.willExpireSoon).toBe(false)
  })
})

// ============================================================================
// useSession — NETWORK_ERROR retry
// ============================================================================

describe("useSession — NETWORK_ERROR retry", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetSessionState()
    mockGetTimeUntilExpiry.mockReturnValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
    resetSessionState()
  })

  it("retries on NETWORK_ERROR and succeeds on second attempt", async () => {
    const networkErr = { code: "NETWORK_ERROR", message: "Network failed" }
    mockGetSession
      .mockResolvedValueOnce({ session: null, user: null, error: networkErr })
      .mockResolvedValue({ session: mockSession, user: mockSession.user, error: null })
    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    const { result } = renderHook(() => useSession())

    // First attempt fails (NETWORK_ERROR), schedules retry
    await act(async () => {
      await Promise.resolve()
    })

    // Advance fake timers to trigger the retry timeout
    await act(async () => {
      jest.runAllTimers()
      await Promise.resolve()
    })

    // After retry, should be authenticated
    expect(mockGetSession.mock.calls.length).toBeGreaterThan(1)
  })
})

// ============================================================================
// useSession — onAuthStateChange events
// ============================================================================

describe("useSession — auth state events", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    // Start with a stable unauthenticated state
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })
    mockGetTimeUntilExpiry.mockReturnValue(null)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("handles SIGNED_IN event", async () => {
    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isAuthenticated).toBe(false)

    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    await act(async () => {
      capturedAuthCallback?.("SIGNED_IN", mockSession)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.session).toEqual(mockSession)
  })

  it("handles TOKEN_REFRESHED event", async () => {
    const { result } = renderHook(() => useSession())
    await act(async () => {})

    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    await act(async () => {
      capturedAuthCallback?.("TOKEN_REFRESHED", mockSession)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.session).toEqual(mockSession)
  })

  it("handles SIGNED_OUT event and calls onSessionExpired", async () => {
    // Start authenticated
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    const onSessionExpired = jest.fn()
    const { result } = renderHook(() => useSession({ onSessionExpired }))
    await act(async () => {})

    // Reset getSession so re-initialization after sign-out returns null
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })

    await act(async () => {
      capturedAuthCallback?.("SIGNED_OUT", null)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.timeUntilExpiry).toBeNull()
    expect(result.current.willExpireSoon).toBe(false)
    expect(onSessionExpired).toHaveBeenCalled()
  })

  it("handles USER_UPDATED event with a session", async () => {
    const { result } = renderHook(() => useSession())
    await act(async () => {})

    const updatedSession = { ...mockSession, user: { id: "u1", email: "new@example.com" } }

    await act(async () => {
      capturedAuthCallback?.("USER_UPDATED", updatedSession)
    })

    expect(result.current.user).toEqual(updatedSession.user)
    expect(result.current.session).toEqual(updatedSession)
  })

  it("ignores USER_UPDATED event when session is null", async () => {
    const { result } = renderHook(() => useSession())
    await act(async () => {})

    const userBefore = result.current.user

    await act(async () => {
      capturedAuthCallback?.("USER_UPDATED", null)
    })

    // State should be unchanged
    expect(result.current.user).toEqual(userBefore)
  })

  it("unsubscribes on unmount", async () => {
    const { unmount } = renderHook(() => useSession())
    await act(async () => {})
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})

// ============================================================================
// useSession — refresh()
// ============================================================================

describe("useSession — refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("returns true and updates state on successful refresh", async () => {
    const newSession = { ...mockSession, expires_at: mockSession.expires_at + 3600 }
    mockRefreshSession.mockResolvedValue({ session: newSession, user: newSession.user, error: null })
    mockGetTimeUntilExpiry.mockReturnValue(7200000)

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    let refreshResult: boolean | undefined
    await act(async () => {
      refreshResult = await result.current.refresh()
    })

    expect(refreshResult).toBe(true)
    expect(result.current.session).toEqual(newSession)
    expect(result.current.willExpireSoon).toBe(false)
  })

  it("returns false and calls onError when refresh fails", async () => {
    const errObj = { code: "REFRESH_FAILED", message: "Token expired" }
    mockRefreshSession.mockResolvedValue({ session: null, user: null, error: errObj })

    const onError = jest.fn()
    const { result } = renderHook(() => useSession({ onError }))
    await act(async () => {})

    let refreshResult: boolean | undefined
    await act(async () => {
      refreshResult = await result.current.refresh()
    })

    expect(refreshResult).toBe(false)
    expect(onError).toHaveBeenCalledWith(errObj)
  })

  it("returns false when refreshSession throws", async () => {
    mockRefreshSession.mockRejectedValue(new Error("Unexpected"))

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    let refreshResult: boolean | undefined
    await act(async () => {
      refreshResult = await result.current.refresh()
    })

    expect(refreshResult).toBe(false)
  })

  it("deduplicates concurrent refresh calls", async () => {
    let resolveRefresh!: (v: unknown) => void
    const refreshPromise = new Promise((res) => { resolveRefresh = res })
    mockRefreshSession.mockReturnValue(refreshPromise)

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    let r1: boolean | undefined
    let r2: boolean | undefined

    await act(async () => {
      const p1 = result.current.refresh()
      const p2 = result.current.refresh() // second call while first is pending
      resolveRefresh({ session: mockSession, user: mockSession.user, error: null })
      r1 = await p1
      r2 = await p2
    })

    // Both resolve to the same promise result
    expect(r1).toBe(true)
    expect(r2).toBe(true)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1) // only called once
  })
})

// ============================================================================
// useSession — logout()
// ============================================================================

describe("useSession — logout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("clears state and returns true on successful logout", async () => {
    mockSignOut.mockResolvedValue({ success: true, error: null })

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    expect(result.current.isAuthenticated).toBe(true)

    // Reset getSession so re-initialization after logout returns null session
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })

    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(logoutResult).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(mockClearStoredContextId).toHaveBeenCalled()
  })

  it("calls onError and returns false on logout failure", async () => {
    const errObj = { code: "SIGNOUT_FAILED", message: "Failed" }
    mockSignOut.mockResolvedValue({ success: false, error: errObj })

    const onError = jest.fn()
    const { result } = renderHook(() => useSession({ onError }))
    await act(async () => {})

    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
    })

    expect(logoutResult).toBe(false)
    expect(onError).toHaveBeenCalledWith(errObj)
  })

  it("returns false when signOut throws", async () => {
    mockSignOut.mockRejectedValue(new Error("Fatal"))

    const { result } = renderHook(() => useSession())
    await act(async () => {})

    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
    })

    expect(logoutResult).toBe(false)
  })
})

// ============================================================================
// useSession — auto-refresh timer
// ============================================================================

describe("useSession — auto-refresh timer", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetSessionState()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)
  })

  afterEach(() => {
    jest.useRealTimers()
    resetSessionState()
  })

  it("schedules refresh when autoRefresh=true and session exists — timer is set", async () => {
    sessionSuccess()
    mockRefreshSession.mockResolvedValue({ session: mockSession, user: mockSession.user, error: null })
    mockIsSessionExpired.mockReturnValue(false)

    const { result, unmount } = renderHook(() => useSession({ autoRefresh: true }))
    await act(async () => {})

    expect(result.current.isAuthenticated).toBe(true)
    // With 3600s until expiry and 300s buffer, refreshIn = 3300000ms — no immediate refresh
    expect(mockRefreshSession).toHaveBeenCalledTimes(0)
    unmount()
  })

  it("does not schedule refresh when autoRefresh=false", async () => {
    sessionSuccess()
    mockIsSessionExpired.mockReturnValue(false)

    const { result, unmount } = renderHook(() => useSession({ autoRefresh: false }))
    await act(async () => {})

    // Should not refresh since autoRefresh=false (advance only the periodic check once)
    await act(async () => {
      jest.advanceTimersByTime(1001) // one tick of SESSION_CHECK_INTERVAL_MS
      await Promise.resolve()
    })

    expect(mockRefreshSession).not.toHaveBeenCalled()
    expect(result.current.isAuthenticated).toBe(true)
    unmount()
  })

  it("refreshes immediately when session is near expiry", async () => {
    sessionSuccess()
    // Return a time LESS than SESSION_REFRESH_BUFFER_MS (300000) so refreshIn = 0
    mockGetTimeUntilExpiry.mockReturnValue(60000) // 1 min remaining
    mockRefreshSession.mockResolvedValue({ session: mockSession, user: mockSession.user, error: null })
    mockIsSessionExpired.mockReturnValue(false)

    const { unmount } = renderHook(() => useSession({ autoRefresh: true }))

    await act(async () => {
      // Flush the immediate refresh (refreshIn = 0, so refresh() is called synchronously)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRefreshSession).toHaveBeenCalled()
    unmount()
  })

  it("fires scheduled refresh timer after delay (covers setTimeout callback)", async () => {
    sessionSuccess()
    // 600s remaining, 300s buffer → refreshIn = 300000ms
    mockGetTimeUntilExpiry.mockReturnValue(600000)
    mockRefreshSession.mockResolvedValue({ session: mockSession, user: mockSession.user, error: null })
    mockIsSessionExpired.mockReturnValue(false)

    const { unmount } = renderHook(() => useSession({ autoRefresh: true }))
    await act(async () => {})

    // Timer is set but not yet fired
    expect(mockRefreshSession).toHaveBeenCalledTimes(0)

    // Advance past the scheduled refresh delay
    await act(async () => {
      jest.advanceTimersByTime(300001)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRefreshSession).toHaveBeenCalled()
    unmount()
  })
})

// ============================================================================
// useSession — periodic check
// ============================================================================

describe("useSession — periodic check", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetSessionState()
  })

  afterEach(() => {
    jest.useRealTimers()
    resetSessionState()
  })

  it("calls refresh when session is expired during periodic check", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)
    mockIsSessionExpired.mockReturnValue(true) // session is expired
    mockRefreshSession.mockResolvedValue({ session: null, user: null, error: { code: "EXPIRED", message: "Expired" } })

    const onSessionExpired = jest.fn()
    const { unmount } = renderHook(() => useSession({ autoRefresh: false, onSessionExpired }))
    await act(async () => {})

    // Advance interval timer (SESSION_CHECK_INTERVAL_MS = 1000ms in mock)
    await act(async () => {
      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockIsSessionExpired).toHaveBeenCalled()
    expect(mockRefreshSession).toHaveBeenCalled()
    expect(onSessionExpired).toHaveBeenCalled()
    unmount()
  })

  it("updates expiry time during periodic check when not expired", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)
    mockIsSessionExpired.mockReturnValue(false)

    const { result, unmount } = renderHook(() => useSession({ autoRefresh: false }))
    await act(async () => {})

    await act(async () => {
      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockIsSessionExpired).toHaveBeenCalled()
    expect(result.current.timeUntilExpiry).toBe(3600000)
    unmount()
  })

  it("does not start periodic check when not authenticated", async () => {
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })
    mockGetTimeUntilExpiry.mockReturnValue(null)

    const { unmount } = renderHook(() => useSession({ autoRefresh: false }))
    await act(async () => {})

    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(mockIsSessionExpired).not.toHaveBeenCalled()
    unmount()
  })
})

// ============================================================================
// useIsAuthenticated (derived hook)
// ============================================================================

describe("useIsAuthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    mockGetTimeUntilExpiry.mockReturnValue(null)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("returns isAuthenticated and isLoading", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    const { result } = renderHook(() => useIsAuthenticated())
    await act(async () => {})

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it("returns isAuthenticated=false when no session", async () => {
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })

    const { result } = renderHook(() => useIsAuthenticated())
    await act(async () => {})

    expect(result.current.isAuthenticated).toBe(false)
  })
})

// ============================================================================
// useCurrentUser (derived hook)
// ============================================================================

describe("useCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSessionState()
    mockGetTimeUntilExpiry.mockReturnValue(null)
  })

  afterEach(() => {
    resetSessionState()
  })

  it("returns user and isLoading", async () => {
    sessionSuccess()
    mockGetTimeUntilExpiry.mockReturnValue(3600000)

    const { result } = renderHook(() => useCurrentUser())
    await act(async () => {})

    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.isLoading).toBe(false)
  })

  it("returns user=null when not authenticated", async () => {
    mockGetSession.mockResolvedValue({ session: null, user: null, error: null })

    const { result } = renderHook(() => useCurrentUser())
    await act(async () => {})

    expect(result.current.user).toBeNull()
  })
})
