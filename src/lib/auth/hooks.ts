"use client"

import { useContext } from "react"
import { AuthContext } from "./auth-context"
import type { Permission } from "./types"

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
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
    isOwner: currentContext?.context_type === "owner",
    isStaff: currentContext?.context_type === "staff",
    isTenant: currentContext?.context_type === "tenant",
    workspaceName: currentContext?.workspace_name || "",
    roleName: currentContext?.role_name || currentContext?.context_type || "",
  }
}
