"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
import { User, SupabaseClient, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  ContextWithDetails,
  UserProfile,
  ContextType,
  Permission,
  TENANT_PERMISSIONS,
  isValidPermission,
} from './types'
import {
  getSession as getSessionUtil,
  signOut as signOutUtil,
  clearStoredContextId,
  getStoredContextId,
  setStoredContextId,
  SessionError,
} from './session'
import { AUTH_INIT_TIMEOUT_MS } from '@/lib/constants'

// Singleton supabase client for the entire app
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance!
}

// ============================================
// Global Auth State (persists across remounts)
// ============================================
interface GlobalAuthState {
  initialized: boolean
  user: User | null
  profile: UserProfile | null
  contexts: ContextWithDetails[]
  currentContext: ContextWithDetails | null
  // Flag to indicate user explicitly logged out (vs spurious SIGNED_OUT)
  explicitLogout: boolean
  // Flag to prevent re-initialization during logout
  loggingOut: boolean
  // Platform admin status (super user with access to all workspaces)
  isPlatformAdmin: boolean
}

const globalAuthState: GlobalAuthState = {
  initialized: false,
  user: null,
  profile: null,
  contexts: [],
  currentContext: null,
  explicitLogout: false,
  loggingOut: false,
  isPlatformAdmin: false,
}

// ============================================
// Auth Context Types
// ============================================

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  contexts: ContextWithDetails[]
  currentContext: ContextWithDetails | null
  hasMultipleContexts: boolean
  isPlatformAdmin: boolean
  refreshContexts: () => Promise<void>
  switchContext: (contextId: string) => Promise<boolean>
  setDefaultContext: (contextId: string) => Promise<boolean>
  hasPermission: (permission: Permission | string) => boolean
  hasAnyPermission: (permissions: (Permission | string)[]) => boolean
  hasAllPermissions: (permissions: (Permission | string)[]) => boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

// ============================================
// Auth Provider Component
// ============================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => globalAuthState.user)
  const [profile, setProfile] = useState<UserProfile | null>(() => globalAuthState.profile)
  const [contexts, setContexts] = useState<ContextWithDetails[]>(() => globalAuthState.contexts)
  const [currentContext, setCurrentContext] = useState<ContextWithDetails | null>(() => globalAuthState.currentContext)
  const [isLoading, setIsLoading] = useState(() => !globalAuthState.initialized)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(() => globalAuthState.isPlatformAdmin)
  const mountedRef = useRef(true)
  const initializingRef = useRef(false)

  const supabase = useMemo(() => getSupabaseClient(), [])

  // Sync from global state on mount
  useLayoutEffect(() => {
    if (globalAuthState.initialized) {
      setUser(globalAuthState.user)
      setProfile(globalAuthState.profile)
      setContexts(globalAuthState.contexts)
      setCurrentContext(globalAuthState.currentContext)
      setIsPlatformAdmin(globalAuthState.isPlatformAdmin)
      setIsLoading(false)
    }
  }, [])

  // Fetch user's contexts from database - using direct fetch
  const fetchContexts = useCallback(async (userId: string, accessToken?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_user_contexts`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId })
      })

      const data = await response.json()

      if (Array.isArray(data)) {
        return data as ContextWithDetails[]
      }
      // UTIL-002: Log unexpected response format
      console.warn('[Auth] fetchContexts: unexpected response format', { data })
      return []
    } catch (err) {
      // UTIL-002: Log fetch errors for debugging (was silent before)
      console.error('[Auth] fetchContexts failed:', err)
      return []
    }
  }, [])

  // Fetch user profile - using direct fetch with passed token
  const fetchProfile = useCallback(async (userId: string, accessToken?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}&select=*`

      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        return data[0] as UserProfile
      }
      // UTIL-002: Log when profile not found (vs. fetch error)
      if (Array.isArray(data) && data.length === 0) {
        console.warn('[Auth] fetchProfile: no profile found for user', { userId })
      } else {
        console.warn('[Auth] fetchProfile: unexpected response format', { data })
      }
      return null
    } catch (err) {
      // UTIL-002: Log fetch errors for debugging (was silent before)
      console.error('[Auth] fetchProfile failed:', err)
      return null
    }
  }, [])

  // Refresh all contexts
  const refreshContexts = useCallback(async () => {
    if (!user) return

    // Get current session for token using centralized utility
    const sessionResult = await getSessionUtil()
    if (sessionResult.error || !sessionResult.session?.access_token) {
      console.warn('[Auth] Cannot refresh contexts: no valid session')
      return
    }

    const newContexts = await fetchContexts(user.id, sessionResult.session.access_token)
    if (mountedRef.current) {
      setContexts(newContexts)
    }
    globalAuthState.contexts = newContexts

    if (currentContext && !newContexts.find(c => c.context_id === currentContext.context_id)) {
      const defaultCtx = newContexts.find(c => c.is_default) || newContexts[0]
      if (mountedRef.current) {
        setCurrentContext(defaultCtx || null)
      }
      globalAuthState.currentContext = defaultCtx || null
    }
  }, [user, currentContext, fetchContexts])

  // Switch to a different context
  // AUTH-006: Enhanced validation to verify user has access before switching
  const switchContext = useCallback(async (contextId: string): Promise<boolean> => {
    // Validate user is authenticated
    if (!user) {
      console.warn('[Auth] Cannot switch context: user not authenticated')
      return false
    }

    // Validate contextId is provided
    if (!contextId || typeof contextId !== 'string') {
      console.warn('[Auth] Cannot switch context: invalid contextId')
      return false
    }

    // AUTH-006: Verify user has access to the target context
    // The contexts array contains only contexts the user has been granted access to
    const targetContext = contexts.find(c => c.context_id === contextId)
    if (!targetContext) {
      console.warn(`[Auth] Cannot switch context: user does not have access to context ${contextId}`)
      // Context not in user's available contexts - they don't have access
      return false
    }

    // AUTH-006: Verify the target workspace is active
    if (!targetContext.workspace_id) {
      console.warn('[Auth] Cannot switch context: target context has no workspace')
      return false
    }

    try {
      // The RPC function also validates access server-side
      const { error } = await (supabase.rpc as Function)('switch_context', {
        p_user_id: user.id,
        p_to_context_id: contextId,
        p_from_context_id: currentContext?.context_id || null,
      })

      if (error) {
        console.error('[Auth] Error switching context:', error)
        // AUTH-006: If server rejects, refresh contexts as user may have lost access
        await refreshContexts()
        return false
      }

      if (mountedRef.current) {
        setCurrentContext(targetContext)
      }
      globalAuthState.currentContext = targetContext
      setStoredContextId(contextId)
      return true
    } catch (err) {
      console.error('[Auth] Exception switching context:', err)
      return false
    }
  }, [user, contexts, currentContext, supabase, refreshContexts])

  // Set default context
  const setDefaultContext = useCallback(async (contextId: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await (supabase.rpc as Function)('set_default_context', {
      p_user_id: user.id,
      p_context_id: contextId,
    })
    if (error) {
      console.error('[Auth] Error setting default context:', error)
      return false
    }
    await refreshContexts()
    return true
  }, [user, supabase, refreshContexts])

  /**
   * Permission checks - Centralized access control
   *
   * AUTH-017: Permission Aggregation Behavior
   * =========================================
   * Access hierarchy (from highest to lowest privilege):
   *
   * 1. Platform Admin (Super User)
   *    - Full access to ALL workspaces and ALL permissions
   *    - Defined in `platform_admins` table
   *
   * 2. Owner
   *    - Full access to their own workspace
   *    - Automatically has all permissions for their workspace
   *
   * 3. Staff
   *    - Role-based permissions from `user_roles` table
   *    - If staff has MULTIPLE roles, permissions are AGGREGATED (UNION)
   *    - Example: If Role A has [tenants.view] and Role B has [payments.view],
   *      the staff member gets BOTH permissions
   *    - Aggregation happens in the `get_user_contexts` database function
   *    - The `currentContext.permissions` array contains the merged set
   *
   * 4. Tenant
   *    - Fixed hardcoded permissions (see TENANT_PERMISSIONS)
   *    - Limited to profile, payments view, complaints, and notices
   *
   * AUTH-015: Added runtime validation for permission strings in development
   */
  const hasPermission = useCallback((permission: Permission | string): boolean => {
    // AUTH-015: Validate permission in development to catch typos early
    if (process.env.NODE_ENV === 'development' && typeof permission === 'string') {
      if (!isValidPermission(permission)) {
        console.warn(`[Auth] Invalid permission: "${permission}". This will fail silently in production.`)
      }
    }
    // Platform Admin (Super User) - Full access to everything
    if (isPlatformAdmin) return true
    // No context means no permissions
    if (!currentContext) return false
    // Owner - Full access to their workspace
    if (currentContext.context_type === 'owner') return true
    // Tenant - Limited hardcoded permissions
    if (currentContext.context_type === 'tenant') {
      return TENANT_PERMISSIONS.includes(permission as Permission)
    }
    // Staff - Role-based permissions (aggregated from all assigned roles)
    if (currentContext.context_type === 'staff') {
      return currentContext.permissions.includes(permission)
    }
    return false
  }, [currentContext, isPlatformAdmin])

  const hasAnyPermission = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }, [hasPermission])

  const hasAllPermissions = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }, [hasPermission])

  // Explicit logout - sets flag to distinguish from spurious SIGNED_OUT
  const logout = useCallback(async () => {
    globalAuthState.explicitLogout = true
    globalAuthState.loggingOut = true
    clearStoredContextId()

    // Sign out using centralized utility (has proper error handling)
    const result = await signOutUtil()

    if (!result.success) {
      console.error('[Auth] Logout failed:', result.error?.message)
      // Even if sign out fails server-side, clear local state
    }

    // Clear state after signOut completes (or fails)
    if (mountedRef.current) {
      setUser(null)
      setProfile(null)
      setContexts([])
      setCurrentContext(null)
      setIsPlatformAdmin(false)
    }
    globalAuthState.initialized = false
    globalAuthState.user = null
    globalAuthState.profile = null
    globalAuthState.contexts = []
    globalAuthState.currentContext = null
    globalAuthState.isPlatformAdmin = false
    globalAuthState.loggingOut = false
  }, [])

  // Check if user is a platform admin (super user) - using direct fetch to avoid client hanging
  const checkPlatformAdmin = useCallback(async (userId: string, accessToken: string): Promise<boolean> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/platform_admins?user_id=eq.${userId}&select=user_id`

      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      // Check if user exists in platform_admins
      if (Array.isArray(data)) {
        return data.length > 0
      }
      // UTIL-002: Log unexpected response format
      console.warn('[Auth] checkPlatformAdmin: unexpected response format', { data })
      return false
    } catch (err) {
      // UTIL-002: Log fetch errors for debugging (was silent before)
      console.error('[Auth] checkPlatformAdmin failed:', err)
      return false
    }
  }, [])

  // Load user data
  const loadUserData = useCallback(async (sessionUser: User, accessToken: string) => {
    try {
      console.log('[Auth] fetchProfile...')
      const userProfile = await fetchProfile(sessionUser.id, accessToken)
      console.log('[Auth] fetchContexts...')
      const userContexts = await fetchContexts(sessionUser.id, accessToken)
      console.log('[Auth] checkPlatformAdmin...')
      const isAdmin = await checkPlatformAdmin(sessionUser.id, accessToken)
      console.log('[Auth] All data fetched')

      if (!mountedRef.current) return

      setProfile(userProfile)
      setContexts(userContexts)
      setIsPlatformAdmin(isAdmin)
      globalAuthState.profile = userProfile
      globalAuthState.contexts = userContexts
      globalAuthState.isPlatformAdmin = isAdmin

      // Determine initial context using centralized storage
      const savedContextId = getStoredContextId()
      let initialContext: ContextWithDetails | null = null

      if (savedContextId) {
        initialContext = userContexts.find(c => c.context_id === savedContextId) || null
      }
      if (!initialContext) {
        initialContext = userContexts.find(c => c.is_default) || userContexts[0] || null
      }

      setCurrentContext(initialContext)
      globalAuthState.currentContext = initialContext

      // Persist the resolved context ID
      if (initialContext) {
        setStoredContextId(initialContext.context_id)
      }
    } catch (err) {
      console.error('[Auth] Error loading user data:', err)
      // Continue with partial data rather than failing completely
    }
  }, [fetchProfile, fetchContexts, checkPlatformAdmin])

  // Initialize auth with timeout to prevent infinite loading
  useEffect(() => {
    mountedRef.current = true

    // If already initialized with valid data, just sync state
    if (globalAuthState.initialized && globalAuthState.user) {
      setUser(globalAuthState.user)
      setProfile(globalAuthState.profile)
      setContexts(globalAuthState.contexts)
      setCurrentContext(globalAuthState.currentContext)
      setIsLoading(false)
      return
    }

    // Prevent concurrent initialization
    if (initializingRef.current) {
      return
    }

    // Prevent re-initialization during logout
    if (globalAuthState.loggingOut) {
      return
    }

    // Timeout wrapper to prevent hanging forever (cancellable)
    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      let timeoutId: NodeJS.Timeout
      const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms)
      })
      return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId)
      })
    }

    // NEW APPROACH: Don't call getSession() which hangs.
    // Instead, rely entirely on onAuthStateChange which fires reliably.

    console.log('[Auth] Setting up auth listener...')
    initializingRef.current = true

    // CQ-010: Set a timeout - if no auth event fires within timeout, assume not logged in
    const authTimeout = setTimeout(() => {
      if (!globalAuthState.initialized && mountedRef.current) {
        console.log('[Auth] Auth timeout - assuming not logged in')
        globalAuthState.initialized = true
        initializingRef.current = false
        setIsLoading(false)
      }
    }, AUTH_INIT_TIMEOUT_MS)

    // Listen for auth state changes - this is the PRIMARY way to get session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state change:', event, session?.user?.email || 'no user')

      if (!mountedRef.current) return

      // Clear the timeout since we got an auth event
      clearTimeout(authTimeout)

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && session?.access_token) {
        // Skip if logging out
        if (globalAuthState.loggingOut) return

        // Update user state
        if (mountedRef.current) {
          setUser(session.user)
        }
        globalAuthState.user = session.user
        globalAuthState.explicitLogout = false

        // Load user data if not already loaded for this user
        if (!globalAuthState.initialized || globalAuthState.user?.id !== session.user.id) {
          console.log('[Auth] Loading user data...')
          await loadUserData(session.user, session.access_token)
          console.log('[Auth] User data loaded')
        }

        globalAuthState.initialized = true
        initializingRef.current = false
        if (mountedRef.current) {
          setIsLoading(false)
        }
        console.log('[Auth] Init complete')
      } else if (event === 'SIGNED_OUT') {
        // ONLY process if user explicitly logged out via our logout() function
        if (globalAuthState.explicitLogout) {
          setUser(null)
          setProfile(null)
          setContexts([])
          setCurrentContext(null)
          setIsPlatformAdmin(false)
          globalAuthState.initialized = false
          globalAuthState.user = null
          globalAuthState.profile = null
          globalAuthState.contexts = []
          globalAuthState.currentContext = null
          globalAuthState.isPlatformAdmin = false
          setIsLoading(false)
        }
        // Ignore spurious SIGNED_OUT events from Supabase
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session on initial load - user not logged in
        console.log('[Auth] No session on initial load')
        globalAuthState.initialized = true
        initializingRef.current = false
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      mountedRef.current = false
      clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, loadUserData])

  const value: AuthState = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    contexts,
    currentContext,
    hasMultipleContexts: contexts.length > 1,
    isPlatformAdmin,
    refreshContexts,
    switchContext,
    setDefaultContext,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// Hooks
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function usePermission(permission: Permission | string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

export function usePermissions(permissions: (Permission | string)[]): {
  hasAny: boolean
  hasAll: boolean
  check: (p: Permission | string) => boolean
} {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()
  return {
    hasAny: hasAnyPermission(permissions),
    hasAll: hasAllPermissions(permissions),
    check: hasPermission,
  }
}

export function useCurrentContext() {
  const { currentContext, contexts, switchContext, hasMultipleContexts, isPlatformAdmin } = useAuth()
  return {
    context: currentContext,
    contexts,
    switchContext,
    hasMultipleContexts,
    isPlatformAdmin,
    isOwner: currentContext?.context_type === 'owner',
    isStaff: currentContext?.context_type === 'staff',
    isTenant: currentContext?.context_type === 'tenant',
    workspaceName: currentContext?.workspace_name || '',
    roleName: currentContext?.role_name || currentContext?.context_type || '',
  }
}
