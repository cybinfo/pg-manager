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
} from './types'
import {
  getSession as getSessionUtil,
  signOut as signOutUtil,
  clearStoredContextId,
  getStoredContextId,
  setStoredContextId,
  SessionError,
} from './session'

// Singleton supabase client for the entire app
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
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
      return []
    } catch {
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
      return null
    } catch {
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
  const switchContext = useCallback(async (contextId: string): Promise<boolean> => {
    if (!user) return false
    const targetContext = contexts.find(c => c.context_id === contextId)
    if (!targetContext) return false

    try {
      const { error } = await supabase.rpc('switch_context', {
        p_user_id: user.id,
        p_to_context_id: contextId,
        p_from_context_id: currentContext?.context_id || null,
      })

      if (error) {
        console.error('[Auth] Error switching context:', error)
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
  }, [user, contexts, currentContext, supabase])

  // Set default context
  const setDefaultContext = useCallback(async (contextId: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.rpc('set_default_context', {
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

  // Permission checks - Centralized access control
  // Access hierarchy: Platform Admin > Owner > Staff > Tenant
  const hasPermission = useCallback((permission: Permission | string): boolean => {
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
    // Staff - Role-based permissions
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

  // Check if user is a platform admin (super user)
  const checkPlatformAdmin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()

      // Ignore errors (user might not have access to see this table)
      if (error) {
        return false
      }
      return !!data
    } catch {
      return false
    }
  }, [supabase])

  // Load user data
  const loadUserData = useCallback(async (sessionUser: User, accessToken: string) => {
    try {
      const userProfile = await fetchProfile(sessionUser.id, accessToken)
      const userContexts = await fetchContexts(sessionUser.id, accessToken)
      const isAdmin = await checkPlatformAdmin(sessionUser.id)

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

    // Timeout wrapper to prevent hanging forever
    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => {
          setTimeout(() => {
            console.warn(`[Auth] Operation timed out after ${ms}ms`)
            resolve(fallback)
          }, ms)
        })
      ])
    }

    const initAuth = async () => {
      // Double-check logging out flag
      if (globalAuthState.loggingOut) {
        return
      }

      initializingRef.current = true
      const startTime = Date.now()
      console.log('[Auth] Starting initialization...')

      try {
        // Get session with 10s timeout
        const sessionResult = await withTimeout(
          getSessionUtil(),
          10000,
          { user: null, session: null, error: { code: 'TIMEOUT' as const, message: 'Session check timed out' } }
        )

        console.log(`[Auth] Session check completed in ${Date.now() - startTime}ms`)

        if (sessionResult.error) {
          console.warn('[Auth] Session check error:', sessionResult.error.message)
          // Continue anyway - user might not be logged in
        }

        if (sessionResult.session?.user && sessionResult.session?.access_token) {
          if (mountedRef.current) {
            setUser(sessionResult.session.user)
          }
          globalAuthState.user = sessionResult.session.user
          globalAuthState.explicitLogout = false

          // Load user data with 15s timeout
          await withTimeout(
            loadUserData(sessionResult.session.user, sessionResult.session.access_token),
            15000,
            undefined
          )
          console.log(`[Auth] User data loaded in ${Date.now() - startTime}ms`)
        } else {
          console.log('[Auth] No valid session found')
          globalAuthState.user = null
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err)
        // Clear state on error to prevent stale data
        globalAuthState.user = null
      } finally {
        globalAuthState.initialized = true
        initializingRef.current = false
        if (mountedRef.current) {
          setIsLoading(false)
        }
        console.log(`[Auth] Initialization complete in ${Date.now() - startTime}ms`)
      }
    }

    initAuth()

    // Listen for auth changes - but ONLY handle SIGNED_IN and TOKEN_REFRESHED
    // SIGNED_OUT is ignored unless it was an explicit logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      if (event === 'SIGNED_IN' && session?.user && session?.access_token) {
        // Only process if we don't already have this user
        if (globalAuthState.user?.id !== session.user.id) {
          setUser(session.user)
          globalAuthState.user = session.user
          globalAuthState.explicitLogout = false
          globalAuthState.initialized = true
          await loadUserData(session.user, session.access_token)
          setIsLoading(false)
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
        globalAuthState.user = session.user
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
        }
        // Ignore spurious SIGNED_OUT events from Supabase
      }
    })

    return () => {
      mountedRef.current = false
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
