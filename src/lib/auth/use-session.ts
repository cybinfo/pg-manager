/**
 * useSession Hook
 *
 * Centralized session management hook that provides:
 * - Consistent session state across the app
 * - Automatic session refresh
 * - Error handling with retry logic
 * - Activity-based session extension
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js"
import {
  SessionState,
  SessionError,
  getSession,
  refreshSession,
  signOut,
  isSessionExpired,
  getTimeUntilExpiry,
  clearStoredContextId,
  createSessionError,
} from "./session"
import {
  SESSION_CHECK_INTERVAL_MS,
  SESSION_REFRESH_BUFFER_MS,
  AUTH_MAX_RETRY_ATTEMPTS,
  AUTH_BASE_RETRY_DELAY_MS,
  AUTH_MAX_RETRY_DELAY_MS,
} from "@/lib/constants"

/**
 * CQ-011: Calculate exponential backoff delay with jitter
 * Formula: min(cap, base * 2^attempt) + random jitter
 *
 * This prevents "thundering herd" problems where many clients
 * retry simultaneously after a server outage.
 *
 * @param attempt - Current retry attempt (0-indexed)
 * @param base - Base delay in milliseconds
 * @param cap - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds with random jitter
 */
function getExponentialBackoffDelay(
  attempt: number,
  base: number = AUTH_BASE_RETRY_DELAY_MS,
  cap: number = AUTH_MAX_RETRY_DELAY_MS
): number {
  // Exponential backoff: base * 2^attempt
  const exponentialDelay = base * Math.pow(2, attempt)
  // Cap the delay
  const cappedDelay = Math.min(exponentialDelay, cap)
  // Add jitter (random value between 0 and 50% of the delay)
  const jitter = Math.random() * cappedDelay * 0.5
  return Math.floor(cappedDelay + jitter)
}

// ============================================
// Hook State
// ============================================

interface UseSessionOptions {
  /** Auto-refresh session before expiry (default: true) */
  autoRefresh?: boolean
  /** Callback when session expires */
  onSessionExpired?: () => void
  /** Callback when session error occurs */
  onError?: (error: SessionError) => void
}

interface UseSessionReturn extends SessionState {
  /** Manually refresh the session */
  refresh: () => Promise<boolean>
  /** Sign out the current user */
  logout: () => Promise<boolean>
  /** Check if session will expire soon (within 5 minutes) */
  willExpireSoon: boolean
  /** Time until session expires (in milliseconds) */
  timeUntilExpiry: number | null
}

// ============================================
// Singleton State (prevents duplicate initialization)
// AUTH-014: Thread-safe global state management
// ============================================

/**
 * AUTH-014: Global initialization state
 *
 * These flags prevent multiple hook instances from triggering
 * concurrent initialization. The pattern works as follows:
 *
 * 1. First hook to mount sets globalInitializing = true
 * 2. Other hooks see this flag and wait on initializationPromise
 * 3. When initialization completes, globalInitialized = true
 * 4. Subsequent hooks skip initialization entirely
 *
 * This is safe in React because:
 * - JavaScript is single-threaded (no true concurrent access)
 * - React's render cycle is synchronous within a batch
 * - useEffect callbacks run after render, in order
 */
let globalInitialized = false
let globalInitializing = false

/**
 * AUTH-014: Promise to coordinate concurrent initialization attempts.
 * All hooks waiting on initialization will await this same promise.
 */
const initializationPromise: { current: Promise<void> | null } = { current: null }

/**
 * AUTH-014: Reset global state (for testing or logout scenarios)
 */
export function resetSessionState(): void {
  globalInitialized = false
  globalInitializing = false
  initializationPromise.current = null
}

// ============================================
// Hook Implementation
// ============================================

export function useSession(options: UseSessionOptions = {}): UseSessionReturn {
  const { autoRefresh = true, onSessionExpired, onError } = options

  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    error: null,
  })

  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  const [willExpireSoon, setWillExpireSoon] = useState(false)

  const mountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)
  // UTIL-001: Track retry timeout to prevent memory leak
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // AUTH-013: Add refresh lock to prevent race conditions
  const isRefreshingRef = useRef(false)
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)

  // Update state safely (only if mounted)
  const safeSetState = useCallback((newState: Partial<SessionState>) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...newState }))
    }
  }, [])

  // Initialize session
  const initializeSession = useCallback(async () => {
    // Prevent concurrent initialization
    if (globalInitializing) {
      if (initializationPromise.current) {
        await initializationPromise.current
      }
      return
    }

    if (globalInitialized && state.session) {
      return
    }

    globalInitializing = true

    initializationPromise.current = (async () => {
      try {
        const result = await getSession()

        if (!mountedRef.current) return

        if (result.error) {
          // CQ-011: Retry on network errors with exponential backoff + jitter
          if (result.error.code === "NETWORK_ERROR" && retryCountRef.current < AUTH_MAX_RETRY_ATTEMPTS) {
            const delay = getExponentialBackoffDelay(retryCountRef.current)
            retryCountRef.current++
            console.log(`[useSession] Retry attempt ${retryCountRef.current}/${AUTH_MAX_RETRY_ATTEMPTS} in ${delay}ms`)
            // UTIL-001: Store timeout ref to prevent memory leak
            retryTimeoutRef.current = setTimeout(() => initializeSession(), delay)
            return
          }

          safeSetState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            session: null,
            error: result.error,
          })
          onError?.(result.error)
          return
        }

        retryCountRef.current = 0
        safeSetState({
          isLoading: false,
          isAuthenticated: !!result.session,
          user: result.user,
          session: result.session,
          error: null,
        })

        globalInitialized = true

        // Update expiry time
        if (result.session) {
          const expiry = getTimeUntilExpiry(result.session)
          setTimeUntilExpiry(expiry)
          setWillExpireSoon(expiry !== null && expiry < SESSION_REFRESH_BUFFER_MS)
        }
      } catch (err) {
        console.error("[useSession] Initialization error:", err)
        safeSetState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          session: null,
          error: createSessionError("UNKNOWN_ERROR", "Failed to initialize session"),
        })
      } finally {
        globalInitializing = false
        initializationPromise.current = null
      }
    })()

    await initializationPromise.current
  }, [safeSetState, onError, state.session])

  // Refresh session with lock to prevent race conditions (AUTH-013)
  const refresh = useCallback(async (): Promise<boolean> => {
    // If already refreshing, wait for the existing promise
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      console.log("[useSession] Refresh already in progress, waiting...")
      return refreshPromiseRef.current
    }

    isRefreshingRef.current = true

    refreshPromiseRef.current = (async () => {
      try {
        const result = await refreshSession()

        if (!mountedRef.current) return false

        if (result.error) {
          safeSetState({ error: result.error })
          onError?.(result.error)
          return false
        }

        safeSetState({
          user: result.user,
          session: result.session,
          error: null,
        })

        if (result.session) {
          const expiry = getTimeUntilExpiry(result.session)
          setTimeUntilExpiry(expiry)
          setWillExpireSoon(false)
        }

        return true
      } catch (err) {
        console.error("[useSession] Refresh error:", err)
        return false
      } finally {
        isRefreshingRef.current = false
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [safeSetState, onError])

  // Logout
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const result = await signOut()

      if (!mountedRef.current) return result.success

      if (result.success) {
        // Clear all state
        safeSetState({
          isAuthenticated: false,
          user: null,
          session: null,
          error: null,
        })
        clearStoredContextId()
        globalInitialized = false
      } else if (result.error) {
        onError?.(result.error)
      }

      return result.success
    } catch (err) {
      console.error("[useSession] Logout error:", err)
      return false
    }
  }, [safeSetState, onError])

  // Set up auth state listener
  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()

    // Initialize on mount
    initializeSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return

        console.log("[useSession] Auth state changed:", event)

        switch (event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
            safeSetState({
              isAuthenticated: true,
              user: session?.user ?? null,
              session,
              error: null,
            })
            if (session) {
              const expiry = getTimeUntilExpiry(session)
              setTimeUntilExpiry(expiry)
              setWillExpireSoon(expiry !== null && expiry < SESSION_REFRESH_BUFFER_MS)
            }
            break

          case "SIGNED_OUT":
            safeSetState({
              isAuthenticated: false,
              user: null,
              session: null,
              error: null,
            })
            setTimeUntilExpiry(null)
            setWillExpireSoon(false)
            globalInitialized = false
            onSessionExpired?.()
            break

          case "USER_UPDATED":
            if (session) {
              safeSetState({
                user: session.user,
                session,
              })
            }
            break
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      // UTIL-001: Clean up retry timeout to prevent memory leak
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [initializeSession, safeSetState, onSessionExpired])

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !state.session) return

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }

      const expiry = getTimeUntilExpiry(state.session)
      if (expiry === null) return

      // Refresh 5 minutes before expiry
      const refreshIn = Math.max(0, expiry - SESSION_REFRESH_BUFFER_MS)

      if (refreshIn > 0) {
        console.log(`[useSession] Scheduling refresh in ${Math.round(refreshIn / 1000)}s`)
        refreshTimerRef.current = setTimeout(() => {
          console.log("[useSession] Auto-refreshing session")
          refresh()
        }, refreshIn)
      } else {
        // Already close to expiry, refresh now
        refresh()
      }
    }

    scheduleRefresh()

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [autoRefresh, state.session, refresh])

  // Periodic session check
  useEffect(() => {
    if (!state.isAuthenticated) return

    const checkSession = async () => {
      if (!state.session) return

      if (isSessionExpired(state.session)) {
        console.warn("[useSession] Session expired during check")
        const refreshed = await refresh()
        if (!refreshed) {
          onSessionExpired?.()
        }
      }

      // Update expiry time
      const expiry = getTimeUntilExpiry(state.session)
      setTimeUntilExpiry(expiry)
      setWillExpireSoon(expiry !== null && expiry < SESSION_REFRESH_BUFFER_MS)
    }

    checkTimerRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current)
      }
    }
  }, [state.isAuthenticated, state.session, refresh, onSessionExpired])

  return {
    ...state,
    refresh,
    logout,
    willExpireSoon,
    timeUntilExpiry,
  }
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook that returns only authentication state (lighter weight)
 */
export function useIsAuthenticated(): { isAuthenticated: boolean; isLoading: boolean } {
  const { isAuthenticated, isLoading } = useSession()
  return { isAuthenticated, isLoading }
}

/**
 * Hook that returns only the current user
 */
export function useCurrentUser(): { user: User | null; isLoading: boolean } {
  const { user, isLoading } = useSession()
  return { user, isLoading }
}
