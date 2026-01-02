"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
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
// Auth Context Types
// ============================================

interface AuthState {
  // Authentication
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean

  // Contexts
  contexts: ContextWithDetails[]
  currentContext: ContextWithDetails | null
  hasMultipleContexts: boolean

  // Methods
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [contexts, setContexts] = useState<ContextWithDetails[]>([])
  const [currentContext, setCurrentContext] = useState<ContextWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initializingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  // Use singleton supabase client to maintain session state
  const supabase = useMemo(() => getSupabaseClient(), [])

  // Fetch user's contexts from database
  const fetchContexts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_contexts', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error fetching contexts:', error)
        return []
      }

      return (data || []) as ContextWithDetails[]
    } catch (err) {
      console.error('Exception fetching contexts:', err)
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
        console.error('Error fetching profile:', error)
        return null
      }

      return data as UserProfile | null
    } catch (err) {
      console.error('Exception fetching profile:', err)
      return null
    }
  }, [supabase])

  // Refresh all contexts
  const refreshContexts = useCallback(async () => {
    if (!user) return

    const newContexts = await fetchContexts(user.id)
    setContexts(newContexts)

    // If current context is no longer valid, switch to default or first
    if (currentContext && !newContexts.find(c => c.context_id === currentContext.context_id)) {
      const defaultCtx = newContexts.find(c => c.is_default) || newContexts[0]
      setCurrentContext(defaultCtx || null)
    }
  }, [user, currentContext, fetchContexts])

  // Switch to a different context
  const switchContext = useCallback(async (contextId: string): Promise<boolean> => {
    if (!user) return false

    const targetContext = contexts.find(c => c.context_id === contextId)
    if (!targetContext) return false

    // Call database function to log the switch
    const { error } = await supabase.rpc('switch_context', {
      p_user_id: user.id,
      p_to_context_id: contextId,
      p_from_context_id: currentContext?.context_id || null,
    })

    if (error) {
      console.error('Error switching context:', error)
      return false
    }

    // Update local state
    setCurrentContext(targetContext)

    // Store in localStorage for persistence
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
      console.error('Error setting default context:', error)
      return false
    }

    // Refresh contexts to get updated is_default values
    await refreshContexts()
    return true
  }, [user, supabase, refreshContexts])

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: Permission | string): boolean => {
    if (!currentContext) return false

    // Owners have all permissions
    if (currentContext.context_type === 'owner') return true

    // Tenants have fixed permissions
    if (currentContext.context_type === 'tenant') {
      return TENANT_PERMISSIONS.includes(permission as Permission)
    }

    // Staff check role permissions
    if (currentContext.context_type === 'staff') {
      return currentContext.permissions.includes(permission)
    }

    return false
  }, [currentContext])

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }, [hasPermission])

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }, [hasPermission])

  // Logout
  const logout = useCallback(async () => {
    localStorage.removeItem('currentContextId')
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setContexts([])
    setCurrentContext(null)
  }, [supabase])

  // Helper to load user data
  const loadUserData = useCallback(async (sessionUser: User, selectContext: boolean = true) => {
    console.log('[Auth] loadUserData called for:', sessionUser.email, 'selectContext:', selectContext)
    try {
      // Fetch profile and contexts in parallel
      console.log('[Auth] Fetching profile and contexts...')
      const [userProfile, userContexts] = await Promise.all([
        fetchProfile(sessionUser.id),
        fetchContexts(sessionUser.id),
      ])
      console.log('[Auth] Fetched - profile:', !!userProfile, 'contexts:', userContexts?.length)

      setProfile(userProfile)
      setContexts(userContexts)

      if (selectContext) {
        // Determine initial context
        const savedContextId = localStorage.getItem('currentContextId')
        console.log('[Auth] Saved context ID:', savedContextId)
        let initialContext: ContextWithDetails | null = null

        if (savedContextId) {
          initialContext = userContexts.find(c => c.context_id === savedContextId) || null
        }

        if (!initialContext) {
          // Use default context or first context
          initialContext = userContexts.find(c => c.is_default) || userContexts[0] || null
        }

        console.log('[Auth] Setting current context:', initialContext?.context_type, initialContext?.workspace_name)
        setCurrentContext(initialContext)
      }
    } catch (err) {
      console.error('[Auth] Error loading user data:', err)
    }
  }, [fetchProfile, fetchContexts])

  // Refresh session - validates token with server
  const refreshSession = useCallback(async () => {
    console.log('[Auth] Refreshing session...')
    try {
      // First try to get the user (validates token server-side)
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        console.log('[Auth] Session invalid or expired, user needs to re-login')
        // Session is invalid - clear state
        setUser(null)
        setProfile(null)
        setContexts([])
        setCurrentContext(null)
        localStorage.removeItem('currentContextId')
        setIsLoading(false)
        return false
      }

      // Session is valid - update user if needed
      if (!user || user.id !== currentUser.id) {
        console.log('[Auth] Updating user from refreshed session')
        setUser(currentUser)
        await loadUserData(currentUser, !currentContext)
      }

      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[Auth] Error refreshing session:', err)
      setIsLoading(false)
      return false
    }
  }, [supabase, user, currentContext, loadUserData])

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    console.log('[Auth] useEffect triggered, isLoading:', isLoading)

    const initAuth = async () => {
      // Prevent duplicate initialization within same mount cycle
      if (initializingRef.current) {
        console.log('[Auth] Already initializing, skipping')
        return
      }
      initializingRef.current = true
      console.log('[Auth] Starting initialization')

      try {
        // Use getUser() instead of getSession() to validate token server-side
        console.log('[Auth] Getting user (validates token)...')
        const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
        console.log('[Auth] User result:', { hasUser: !!sessionUser, error: error?.message })

        if (!mounted) {
          console.log('[Auth] Component unmounted, aborting')
          return
        }

        if (error) {
          console.error('[Auth] Error getting user:', error)
          // Clear any stale state
          setUser(null)
          setProfile(null)
          setContexts([])
          setCurrentContext(null)
          setIsLoading(false)
          return
        }

        if (sessionUser) {
          console.log('[Auth] User found:', sessionUser.email)
          setUser(sessionUser)
          console.log('[Auth] Loading user data...')
          await loadUserData(sessionUser, true)
          console.log('[Auth] User data loaded')
        } else {
          console.log('[Auth] No user in session')
        }
      } catch (err) {
        console.error('[Auth] Exception during auth init:', err)
      } finally {
        if (mounted) {
          console.log('[Auth] Setting isLoading to false')
          initialLoadDoneRef.current = true
          setIsLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('[Auth] Auth state change:', event, 'initialLoadDone:', initialLoadDoneRef.current)

      // Skip SIGNED_IN during initial load - initAuth handles it
      if (event === 'SIGNED_IN' && !initialLoadDoneRef.current) {
        console.log('[Auth] Skipping SIGNED_IN during initial load')
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] Processing SIGNED_IN event')
        setUser(session.user)
        await loadUserData(session.user, false) // Don't auto-select context on sign in
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - update user but keep everything else
        console.log('[Auth] Token refreshed')
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] Signed out')
        setUser(null)
        setProfile(null)
        setContexts([])
        setCurrentContext(null)
        localStorage.removeItem('currentContextId')
      }
    })

    // Handle visibility change - refresh session when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialLoadDoneRef.current) {
        console.log('[Auth] Tab became visible, refreshing session...')
        refreshSession()
      }
    }

    // Handle focus - refresh session when window gains focus
    const handleFocus = () => {
      if (initialLoadDoneRef.current) {
        console.log('[Auth] Window focused, refreshing session...')
        refreshSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      console.log('[Auth] Cleanup - unmounting')
      mounted = false
      initializingRef.current = false
      initialLoadDoneRef.current = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [supabase, loadUserData, refreshSession])

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
// Hook to use auth context
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ============================================
// Hook to check permissions
// ============================================

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

// ============================================
// Hook to get current context details
// ============================================

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
