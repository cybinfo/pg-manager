/**
 * useRequireAuth Hook
 *
 * Centralized authentication check for form submissions.
 * Eliminates duplicate session expiry checks across form pages.
 *
 * @example
 * const { checkAuth, user } = useRequireAuth()
 *
 * const handleSubmit = async () => {
 *   const currentUser = await checkAuth()
 *   if (!currentUser) return // User redirected to login
 *
 *   // Continue with form submission using currentUser
 * }
 */

"use client"

import { useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// ============================================================================
// TYPES
// ============================================================================

interface UseRequireAuthOptions {
  /** Custom redirect path (default: "/login") */
  redirectTo?: string
  /** Custom error message */
  errorMessage?: string
  /** Whether to show toast on session expiry */
  showToast?: boolean
}

interface UseRequireAuthReturn {
  /** Current user (may be null initially while loading) */
  user: User | null
  /** Whether auth state is still loading */
  loading: boolean
  /** Check auth and redirect if not authenticated. Returns user if authenticated. */
  checkAuth: () => Promise<User | null>
  /** Get current user without redirecting */
  getUser: () => Promise<User | null>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for checking authentication before form submissions
 *
 * Replaces the duplicated pattern:
 * ```
 * const { data: { user } } = await supabase.auth.getUser()
 * if (!user) {
 *   toast.error("Session expired. Please login again.")
 *   router.push("/login")
 *   return
 * }
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthReturn {
  const {
    redirectTo = "/login",
    errorMessage = "Session expired. Please login again.",
    showToast = true,
  } = options

  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial auth state load
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      setLoading(false)
    }
    loadUser()
  }, [])

  /**
   * Get current user without any side effects
   */
  const getUser = useCallback(async (): Promise<User | null> => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)
    return currentUser
  }, [])

  /**
   * Check authentication and redirect if not authenticated
   * Returns user if authenticated, null if not (after redirect)
   */
  const checkAuth = useCallback(async (): Promise<User | null> => {
    const currentUser = await getUser()

    if (!currentUser) {
      if (showToast) {
        toast.error(errorMessage)
      }
      router.push(redirectTo)
      return null
    }

    return currentUser
  }, [getUser, router, redirectTo, errorMessage, showToast])

  return {
    user,
    loading,
    checkAuth,
    getUser,
  }
}

// ============================================================================
// UTILITY FUNCTION
// ============================================================================

/**
 * Standalone function for checking auth in form submissions
 * Use this when you don't need the full hook
 *
 * @example
 * const handleSubmit = async () => {
 *   const user = await requireAuth(router)
 *   if (!user) return
 *   // Continue...
 * }
 */
export async function requireAuth(
  router: ReturnType<typeof useRouter>,
  options: Omit<UseRequireAuthOptions, "redirectTo"> & { redirectTo?: string } = {}
): Promise<User | null> {
  const {
    redirectTo = "/login",
    errorMessage = "Session expired. Please login again.",
    showToast = true,
  } = options

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (showToast) {
      toast.error(errorMessage)
    }
    router.push(redirectTo)
    return null
  }

  return user
}
