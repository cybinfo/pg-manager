/**
 * Centralized Session Management
 *
 * This module provides consistent session handling across the application.
 * All session operations should go through these utilities to ensure:
 * - Consistent error handling
 * - Proper token validation
 * - Race condition prevention
 * - Unified logging
 */

import { createClient, hasStoredSession } from "@/lib/supabase/client"
import { User, Session, AuthError } from "@supabase/supabase-js"

// ============================================
// Types
// ============================================

export interface SessionResult {
  user: User | null
  session: Session | null
  error: SessionError | null
}

export interface SessionError {
  code: SessionErrorCode
  message: string
  originalError?: AuthError | Error
}

export type SessionErrorCode =
  | "NO_SESSION"
  | "SESSION_EXPIRED"
  | "NETWORK_ERROR"
  | "INVALID_TOKEN"
  | "REFRESH_FAILED"
  | "TIMEOUT"
  | "UNKNOWN_ERROR"

export interface SessionState {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  session: Session | null
  error: SessionError | null
}

// ============================================
// Session Error Handling
// ============================================

export function createSessionError(
  code: SessionErrorCode,
  message: string,
  originalError?: AuthError | Error
): SessionError {
  return { code, message, originalError }
}

export function isSessionExpired(session: Session | null): boolean {
  if (!session) return true
  const expiresAt = session.expires_at
  if (!expiresAt) return false
  // Add 30 second buffer
  return Date.now() / 1000 > expiresAt - 30
}

export function getSessionExpiryTime(session: Session | null): number | null {
  if (!session?.expires_at) return null
  return session.expires_at * 1000 // Convert to milliseconds
}

export function getTimeUntilExpiry(session: Session | null): number | null {
  const expiryTime = getSessionExpiryTime(session)
  if (!expiryTime) return null
  return Math.max(0, expiryTime - Date.now())
}

// ============================================
// Core Session Operations
// ============================================

// Helper to wrap a promise with a timeout (cancellable)
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

/**
 * Get the current session with proper error handling.
 * Uses Supabase client's getSession() which reads from cookies.
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const supabase = createClient()

    // Get session from Supabase - this reads from cookies/storage
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("[Session] getSession error:", error.message)
      return {
        user: null,
        session: null,
        error: createSessionError("NO_SESSION", error.message, error),
      }
    }

    if (!data.session) {
      return {
        user: null,
        session: null,
        error: createSessionError("NO_SESSION", "No active session"),
      }
    }

    const session = data.session

    // Check if session is expired
    if (isSessionExpired(session)) {
      return refreshSession()
    }

    // Session exists and is valid - return it
    return {
      user: session.user,
      session: session,
      error: null,
    }
  } catch (err) {
    console.error("[Session] Exception in getSession:", err)
    return {
      user: null,
      session: null,
      error: createSessionError(
        "NETWORK_ERROR",
        "Failed to check session",
        err instanceof Error ? err : undefined
      ),
    }
  }
}

/**
 * Get the current user with proper error handling.
 * Use this when you only need user info, not the full session.
 */
export async function getUser(): Promise<{ user: User | null; error: SessionError | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("[Session] getUser error:", error.message)
      return {
        user: null,
        error: createSessionError(
          error.message.includes("expired") ? "SESSION_EXPIRED" : "UNKNOWN_ERROR",
          error.message,
          error
        ),
      }
    }

    return {
      user: data.user,
      error: data.user ? null : createSessionError("NO_SESSION", "No authenticated user"),
    }
  } catch (err) {
    console.error("[Session] Exception in getUser:", err)
    return {
      user: null,
      error: createSessionError(
        "NETWORK_ERROR",
        "Failed to get user",
        err instanceof Error ? err : undefined
      ),
    }
  }
}

/**
 * Refresh the current session.
 * Call this when the session is about to expire.
 */
export async function refreshSession(): Promise<SessionResult> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      return {
        user: null,
        session: null,
        error: createSessionError("REFRESH_FAILED", error.message, error),
      }
    }

    if (!data.session) {
      return {
        user: null,
        session: null,
        error: createSessionError("NO_SESSION", "Refresh returned no session"),
      }
    }

    return {
      user: data.session.user,
      session: data.session,
      error: null,
    }
  } catch (err) {
    console.error("[Session] Exception in refreshSession:", err)
    return {
      user: null,
      session: null,
      error: createSessionError(
        "NETWORK_ERROR",
        "Failed to refresh session",
        err instanceof Error ? err : undefined
      ),
    }
  }
}

/**
 * Sign out the current user.
 * Returns true if successful, false otherwise.
 * AUTH-011: Now includes audit logging for session revocation.
 */
export async function signOut(): Promise<{ success: boolean; error: SessionError | null }> {
  try {
    const supabase = createClient()

    // AUTH-011: Get user info before signing out for audit trail
    const { data: { user } } = await supabase.auth.getUser()
    let workspaceId: string | null = null

    if (user) {
      // Try to get user's primary workspace for audit logging
      const { data: context } = await supabase
        .from("user_contexts")
        .select("workspace_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single()

      workspaceId = context?.workspace_id || null

      // Log logout event to audit trail
      if (workspaceId) {
        await supabase.from("audit_events").insert({
          entity_type: "staff",
          entity_id: user.id,
          action: "update",
          actor_id: user.id,
          actor_type: "staff",
          workspace_id: workspaceId,
          metadata: {
            operation: "logout",
            email: user.email,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        }).then(({ error: auditError }: { error: { message: string } | null }) => {
          if (auditError) {
            console.warn("[Session] Failed to log logout audit event:", auditError.message)
          }
        })
      }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[Session] signOut error:", error.message)
      return {
        success: false,
        error: createSessionError("UNKNOWN_ERROR", error.message, error),
      }
    }

    console.log("[Session] Signed out successfully")
    return { success: true, error: null }
  } catch (err) {
    console.error("[Session] Exception in signOut:", err)
    return {
      success: false,
      error: createSessionError(
        "NETWORK_ERROR",
        "Failed to sign out",
        err instanceof Error ? err : undefined
      ),
    }
  }
}

// ============================================
// Session Validation
// ============================================

/**
 * Check if the current session is valid.
 * Returns true only if there's an active, non-expired session.
 */
export async function isSessionValid(): Promise<boolean> {
  const result = await getSession()
  return result.session !== null && result.error === null
}

/**
 * Require a valid session, throw if not authenticated.
 * Use this in server actions or API routes.
 */
export async function requireSession(): Promise<{ user: User; session: Session }> {
  const result = await getSession()

  if (result.error || !result.session || !result.user) {
    throw new Error(result.error?.message || "Authentication required")
  }

  return { user: result.user, session: result.session }
}

// ============================================
// Session Storage (Client-side)
// ============================================

const CONTEXT_STORAGE_KEY = "currentContextId"

export function getStoredContextId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(CONTEXT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredContextId(contextId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CONTEXT_STORAGE_KEY, contextId)
  } catch (err) {
    console.warn("[Session] Failed to store context ID:", err)
  }
}

export function clearStoredContextId(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CONTEXT_STORAGE_KEY)
  } catch (err) {
    console.warn("[Session] Failed to clear context ID:", err)
  }
}

// ============================================
// Session Event Types
// ============================================

export type SessionEventType =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "SESSION_EXPIRED"

export interface SessionEvent {
  type: SessionEventType
  user: User | null
  session: Session | null
  timestamp: number
}
