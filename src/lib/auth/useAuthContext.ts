/**
 * useAuthContext Hook
 *
 * Unified hook combining useAuth and useCurrentContext for pages that need both.
 * Eliminates 7+ locations importing both hooks.
 *
 * @example
 * // Instead of:
 * const { hasPermission, user, isPlatformAdmin } = useAuth()
 * const { isOwner, isTenant, isStaff, currentContext } = useCurrentContext()
 *
 * // Use:
 * const auth = useAuthContext()
 * // auth.hasPermission, auth.user, auth.isOwner, auth.currentContext, etc.
 */

"use client"

import { useMemo } from "react"
import { useAuth, useCurrentContext } from "./auth-context"

// ============================================================================
// TYPES
// ============================================================================

export interface AuthContextState {
  // From useAuth
  /** Current user */
  user: ReturnType<typeof useAuth>["user"]
  /** User profile */
  profile: ReturnType<typeof useAuth>["profile"]
  /** All user contexts */
  contexts: ReturnType<typeof useAuth>["contexts"]
  /** Whether auth is loading */
  isLoading: boolean
  /** Whether user is platform admin */
  isPlatformAdmin: boolean
  /** Check if user has a permission */
  hasPermission: (permission: string) => boolean
  /** Logout function */
  logout: () => Promise<void>

  // From useCurrentContext
  /** Current context/workspace */
  currentContext: ReturnType<typeof useCurrentContext>["context"]
  /** Whether user is owner in current context */
  isOwner: boolean
  /** Whether user is staff in current context */
  isStaff: boolean
  /** Whether user is tenant in current context */
  isTenant: boolean
  /** Current workspace ID */
  workspaceId: string | null
  /** Current workspace name */
  workspaceName: string

  // Derived states
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Whether user is owner or platform admin */
  isOwnerOrAdmin: boolean
  /** Whether user can manage staff */
  canManageStaff: boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Combined auth context hook
 *
 * @example
 * const auth = useAuthContext()
 *
 * if (auth.isLoading) return <PageLoader />
 * if (!auth.isAuthenticated) return <LoginPrompt />
 *
 * if (auth.isOwnerOrAdmin) {
 *   // Show admin features
 * }
 *
 * if (auth.hasPermission("tenants.create")) {
 *   // Show create button
 * }
 */
export function useAuthContext(): AuthContextState {
  const auth = useAuth()
  const context = useCurrentContext()

  return useMemo(
    () => ({
      // From useAuth
      user: auth.user,
      profile: auth.profile,
      contexts: auth.contexts,
      isLoading: auth.isLoading,
      isPlatformAdmin: auth.isPlatformAdmin,
      hasPermission: auth.hasPermission,
      logout: auth.logout,

      // From useCurrentContext
      currentContext: context.context,
      isOwner: context.isOwner,
      isStaff: context.isStaff,
      isTenant: context.isTenant,
      workspaceId: context.context?.workspace_id || null,
      workspaceName: context.workspaceName,

      // Derived states
      isAuthenticated: !!auth.user,
      isOwnerOrAdmin: context.isOwner || auth.isPlatformAdmin,
      canManageStaff: context.isOwner || auth.isPlatformAdmin || auth.hasPermission("staff.manage"),
    }),
    [auth, context]
  )
}

// ============================================================================
// PERMISSION CHECK HELPERS
// ============================================================================

/**
 * Check multiple permissions (ALL must pass)
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { hasPermission } = useAuth()
  return permissions.every((p) => hasPermission(p))
}

/**
 * Check multiple permissions (ANY must pass)
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasPermission } = useAuth()
  return permissions.some((p) => hasPermission(p))
}

// ============================================================================
// QUICK ACCESS HOOKS
// ============================================================================

/**
 * Quick hook for just checking owner/admin status
 *
 * @example
 * const { isOwner, isAdmin } = useOwnerStatus()
 */
export function useOwnerStatus() {
  const { isPlatformAdmin } = useAuth()
  const { isOwner } = useCurrentContext()

  return {
    isOwner,
    isAdmin: isPlatformAdmin,
    isOwnerOrAdmin: isOwner || isPlatformAdmin,
  }
}

/**
 * Quick hook for just getting current context IDs
 *
 * @example
 * const { workspaceId, ownerId } = useContextIds()
 */
export function useContextIds() {
  const { context } = useCurrentContext()

  return {
    workspaceId: context?.workspace_id || null,
    contextId: context?.context_id || null,
  }
}
