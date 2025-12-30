"use client"

import { ReactNode } from 'react'
import { usePermission, usePermissions, useAuth } from '@/lib/auth'
import { Permission } from '@/lib/auth/types'
import { AlertTriangle, Lock } from 'lucide-react'

// ============================================
// Permission Gate Component
// Conditionally renders children based on permissions
// ============================================

interface PermissionGateProps {
  /** Single permission to check */
  permission?: Permission | string
  /** Multiple permissions - user must have at least one */
  anyOf?: (Permission | string)[]
  /** Multiple permissions - user must have all */
  allOf?: (Permission | string)[]
  /** What to show when permission is denied */
  fallback?: ReactNode
  /** Show nothing instead of fallback when denied */
  hide?: boolean
  children: ReactNode
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback,
  hide = false,
  children,
}: PermissionGateProps) {
  const singlePermission = usePermission(permission || '')
  const { hasAny, hasAll } = usePermissions(anyOf || allOf || [])

  let hasAccess = true

  if (permission) {
    hasAccess = singlePermission
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAny
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAll
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (hide) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return null
}

// ============================================
// Access Denied Component
// Shows a user-friendly access denied message
// ============================================

interface AccessDeniedProps {
  title?: string
  message?: string
  showIcon?: boolean
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  showIcon = true,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {showIcon && (
        <div className="p-3 rounded-full bg-rose-100 text-rose-600 mb-4">
          <Lock className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message}</p>
    </div>
  )
}

// ============================================
// Role Gate Component
// Conditionally renders based on context type
// ============================================

interface RoleGateProps {
  /** Allowed context types */
  allow: ('owner' | 'staff' | 'tenant')[]
  /** What to show when role is not allowed */
  fallback?: ReactNode
  /** Show nothing instead of fallback */
  hide?: boolean
  children: ReactNode
}

export function RoleGate({ allow, fallback, hide = false, children }: RoleGateProps) {
  const { currentContext } = useAuth()

  if (!currentContext) {
    return hide ? null : (fallback || null)
  }

  if (allow.includes(currentContext.context_type)) {
    return <>{children}</>
  }

  if (hide) {
    return null
  }

  return <>{fallback}</>
}

// ============================================
// Owner Only Component
// Shorthand for owner-only content
// ============================================

interface OwnerOnlyProps {
  fallback?: ReactNode
  hide?: boolean
  children: ReactNode
}

export function OwnerOnly({ fallback, hide = false, children }: OwnerOnlyProps) {
  return (
    <RoleGate allow={['owner']} fallback={fallback} hide={hide}>
      {children}
    </RoleGate>
  )
}

// ============================================
// Staff Only Component
// ============================================

export function StaffOnly({ fallback, hide = false, children }: OwnerOnlyProps) {
  return (
    <RoleGate allow={['owner', 'staff']} fallback={fallback} hide={hide}>
      {children}
    </RoleGate>
  )
}

// ============================================
// Tenant Only Component
// ============================================

export function TenantOnly({ fallback, hide = false, children }: OwnerOnlyProps) {
  return (
    <RoleGate allow={['tenant']} fallback={fallback} hide={hide}>
      {children}
    </RoleGate>
  )
}

// ============================================
// Permission Badge
// Shows what permission is required
// ============================================

interface PermissionBadgeProps {
  permission: string
  className?: string
}

export function PermissionBadge({ permission, className }: PermissionBadgeProps) {
  const hasIt = usePermission(permission)

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        hasIt
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      } ${className || ''}`}
    >
      {hasIt ? '✓' : '✗'} {permission}
    </span>
  )
}

// ============================================
// Upgrade Prompt
// Shows when user needs higher permissions
// ============================================

interface UpgradePromptProps {
  feature: string
  requiredRole?: string
}

export function UpgradePrompt({ feature, requiredRole = "owner" }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center border rounded-lg bg-amber-50 border-amber-200">
      <AlertTriangle className="h-8 w-8 text-amber-600 mb-3" />
      <h3 className="text-lg font-semibold text-amber-900">Feature Locked</h3>
      <p className="text-sm text-amber-700 mt-1 max-w-sm">
        {feature} requires {requiredRole} access. Contact your administrator to upgrade your permissions.
      </p>
    </div>
  )
}
