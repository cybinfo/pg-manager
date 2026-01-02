"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  ContextWithDetails,
  UserProfile,
  ContextType,
  Permission,
  TENANT_PERMISSIONS,
} from './types'

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
}

const globalAuthState: GlobalAuthState = {
  initialized: false,
  user: null,
  profile: null,
  contexts: [],
  currentContext: null,
  explicitLogout: false,
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
      setIsLoading(false)
    }
  }, [])

  // Fetch user's contexts from database
  const fetchContexts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_contexts', {
        p_user_id: userId
      })
      if (error) {
        console.error('[Auth] Error fetching contexts:', error)
        return []
      }
      return (data || []) as ContextWithDetails[]
    } catch (err) {
      console.error('[Auth] Exception fetching contexts:', err)
      return []
    }
  }, [supabase])

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[Auth] Error fetching profile:', error)
        return null
      }
      return data as UserProfile | null
    } catch (err) {
      console.error('[Auth] Exception fetching profile:', err)
      return null
    }
  }, [supabase])

  // Refresh all contexts
  const refreshContexts = useCallback(async () => {
    if (!user) return
    const newContexts = await fetchContexts(user.id)
    setContexts(newContexts)
    globalAuthState.contexts = newContexts

    if (currentContext && !newContexts.find(c => c.context_id === currentContext.context_id)) {
      const defaultCtx = newContexts.find(c => c.is_default) || newContexts[0]
      setCurrentContext(defaultCtx || null)
      globalAuthState.currentContext = defaultCtx || null
    }
  }, [user, currentContext, fetchContexts])

  // Switch to a different context
  const switchContext = useCallback(async (contextId: string): Promise<boolean> => {
    if (!user) return false
    const targetContext = contexts.find(c => c.context_id === contextId)
    if (!targetContext) return false

    const { error } = await supabase.rpc('switch_context', {
      p_user_id: user.id,
      p_to_context_id: contextId,
      p_from_context_id: currentContext?.context_id || null,
    })

    if (error) {
      console.error('[Auth] Error switching context:', error)
      return false
    }

    setCurrentContext(targetContext)
    globalAuthState.currentContext = targetContext
    localStorage.setItem('currentContextId', contextId)
    return true
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

  // Permission checks
  const hasPermission = useCallback((permission: Permission | string): boolean => {
    if (!currentContext) return false
    if (currentContext.context_type === 'owner') return true
    if (currentContext.context_type === 'tenant') {
      return TENANT_PERMISSIONS.includes(permission as Permission)
    }
    if (currentContext.context_type === 'staff') {
      return currentContext.permissions.includes(permission)
    }
    return false
  }, [currentContext])

  const hasAnyPermission = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }, [hasPermission])

  const hasAllPermissions = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }, [hasPermission])

  // Explicit logout - sets flag to distinguish from spurious SIGNED_OUT
  const logout = useCallback(async () => {
    console.log('[Auth] Explicit logout called')
    globalAuthState.explicitLogout = true
    localStorage.removeItem('currentContextId')

    // Clear state first
    setUser(null)
    setProfile(null)
    setContexts([])
    setCurrentContext(null)
    globalAuthState.initialized = false
    globalAuthState.user = null
    globalAuthState.profile = null
    globalAuthState.contexts = []
    globalAuthState.currentContext = null

    // Then sign out from Supabase
    await supabase.auth.signOut()
  }, [supabase])

  // Load user data
  const loadUserData = useCallback(async (sessionUser: User) => {
    console.log('[Auth] Loading user data for:', sessionUser.email)
    try {
      const [userProfile, userContexts] = await Promise.all([
        fetchProfile(sessionUser.id),
        fetchContexts(sessionUser.id),
      ])
      console.log('[Auth] Loaded - profile:', !!userProfile, 'contexts:', userContexts?.length)

      if (!mountedRef.current) return

      setProfile(userProfile)
      setContexts(userContexts)
      globalAuthState.profile = userProfile
      globalAuthState.contexts = userContexts

      // Determine initial context
      const savedContextId = localStorage.getItem('currentContextId')
      let initialContext: ContextWithDetails | null = null

      if (savedContextId) {
        initialContext = userContexts.find(c => c.context_id === savedContextId) || null
      }
      if (!initialContext) {
        initialContext = userContexts.find(c => c.is_default) || userContexts[0] || null
      }

      console.log('[Auth] Setting context:', initialContext?.context_type, initialContext?.workspace_name)
      setCurrentContext(initialContext)
      globalAuthState.currentContext = initialContext
    } catch (err) {
      console.error('[Auth] Error loading user data:', err)
    }
  }, [fetchProfile, fetchContexts])

  // Initialize auth
  useEffect(() => {
    mountedRef.current = true
    console.log('[Auth] useEffect - initialized:', globalAuthState.initialized)

    // If already initialized with valid data, just sync state
    if (globalAuthState.initialized && globalAuthState.user) {
      console.log('[Auth] Using cached auth state')
      setUser(globalAuthState.user)
      setProfile(globalAuthState.profile)
      setContexts(globalAuthState.contexts)
      setCurrentContext(globalAuthState.currentContext)
      setIsLoading(false)
      return
    }

    // Prevent concurrent initialization
    if (initializingRef.current) {
      console.log('[Auth] Already initializing, skipping')
      return
    }

    const initAuth = async () => {
      initializingRef.current = true
      console.log('[Auth] Starting initialization')

      try {
        const { data: { user: sessionUser }, error } = await supabase.auth.getUser()

        if (error) {
          console.log('[Auth] getUser error:', error.message)
        }

        if (sessionUser) {
          console.log('[Auth] User found:', sessionUser.email)
          setUser(sessionUser)
          globalAuthState.user = sessionUser
          globalAuthState.explicitLogout = false
          await loadUserData(sessionUser)
        } else {
          console.log('[Auth] No user found')
          globalAuthState.user = null
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
      } finally {
        globalAuthState.initialized = true
        initializingRef.current = false
        if (mountedRef.current) {
          setIsLoading(false)
        }
        console.log('[Auth] Initialization complete')
      }
    }

    initAuth()

    // Listen for auth changes - but ONLY handle SIGNED_IN and TOKEN_REFRESHED
    // SIGNED_OUT is ignored unless it was an explicit logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      console.log('[Auth] Auth event:', event, 'hasSession:', !!session, 'explicitLogout:', globalAuthState.explicitLogout)

      if (event === 'SIGNED_IN' && session?.user) {
        // Only process if we don't already have this user
        if (globalAuthState.user?.id !== session.user.id) {
          console.log('[Auth] Processing SIGNED_IN for:', session.user.email)
          setUser(session.user)
          globalAuthState.user = session.user
          globalAuthState.explicitLogout = false
          globalAuthState.initialized = true
          await loadUserData(session.user)
          setIsLoading(false)
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[Auth] Token refreshed')
        setUser(session.user)
        globalAuthState.user = session.user
      } else if (event === 'SIGNED_OUT') {
        // ONLY process if user explicitly logged out via our logout() function
        if (globalAuthState.explicitLogout) {
          console.log('[Auth] Processing explicit SIGNED_OUT')
          setUser(null)
          setProfile(null)
          setContexts([])
          setCurrentContext(null)
          globalAuthState.initialized = false
          globalAuthState.user = null
          globalAuthState.profile = null
          globalAuthState.contexts = []
          globalAuthState.currentContext = null
        } else {
          console.log('[Auth] Ignoring spurious SIGNED_OUT event')
        }
      }
    })

    return () => {
      console.log('[Auth] Cleanup')
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
  const { currentContext, contexts, switchContext, hasMultipleContexts } = useAuth()
  return {
    context: currentContext,
    contexts,
    switchContext,
    hasMultipleContexts,
    isOwner: currentContext?.context_type === 'owner',
    isStaff: currentContext?.context_type === 'staff',
    isTenant: currentContext?.context_type === 'tenant',
    workspaceName: currentContext?.workspace_name || '',
    roleName: currentContext?.role_name || currentContext?.context_type || '',
  }
}
