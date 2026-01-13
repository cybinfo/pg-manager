"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useCurrentContext } from "@/lib/auth"
import { Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PermissionGuardProps {
  children: React.ReactNode
  permission: string | string[]
  fallback?: "redirect" | "message"
  redirectTo?: string
}

/**
 * Guards page content based on user permissions.
 * - Owners always have access
 * - Staff must have the required permission(s)
 * - Tenants are redirected to tenant portal
 */
export function PermissionGuard({
  children,
  permission,
  fallback = "message",
  redirectTo = "/dashboard",
}: PermissionGuardProps) {
  const router = useRouter()
  const { isLoading, hasPermission, hasAnyPermission, currentContext } = useAuth()
  const { isOwner, isTenant, isStaff } = useCurrentContext()

  // Check if user has required permission(s)
  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasAccess = isOwner || hasAnyPermission(permissions)

  // Debug logging
  console.log('[PermissionGuard] Checking access:', {
    permission,
    isOwner,
    isStaff,
    isTenant,
    contextType: currentContext?.context_type,
    contextPermissions: currentContext?.permissions,
    hasAccess,
    isLoading,
  })

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      if (fallback === "redirect") {
        router.push(redirectTo)
      }
    }
  }, [isLoading, hasAccess, fallback, redirectTo, router])

  // Tenants should never access dashboard pages
  useEffect(() => {
    if (!isLoading && isTenant) {
      router.push("/tenant")
    }
  }, [isLoading, isTenant, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isTenant) {
    return null // Will redirect
  }

  if (!hasAccess) {
    if (fallback === "redirect") {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="p-4 bg-rose-50 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          You don't have permission to view this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Guards page content for owners only.
 * Non-owners see Access Denied message.
 */
export function OwnerGuard({
  children,
  fallback = "message",
  redirectTo = "/dashboard",
}: Omit<PermissionGuardProps, 'permission'>) {
  const router = useRouter()
  const { isLoading, currentContext } = useAuth()
  const { isOwner, isTenant } = useCurrentContext()

  useEffect(() => {
    if (!isLoading && !isOwner) {
      if (fallback === "redirect") {
        router.push(redirectTo)
      }
    }
  }, [isLoading, isOwner, fallback, redirectTo, router])

  useEffect(() => {
    if (!isLoading && isTenant) {
      router.push("/tenant")
    }
  }, [isLoading, isTenant, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isTenant) {
    return null
  }

  if (!isOwner) {
    if (fallback === "redirect") {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="p-4 bg-rose-50 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Owner Access Only</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          This page is only accessible to property owners. Staff members cannot access settings.
        </p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Guards page content for platform admins only.
 * Non-platform-admins see Access Denied message.
 */
export function PlatformAdminGuard({
  children,
  fallback = "message",
  redirectTo = "/dashboard",
}: Omit<PermissionGuardProps, 'permission'>) {
  const router = useRouter()
  const { isLoading, isPlatformAdmin, currentContext } = useAuth()
  const { isTenant } = useCurrentContext()

  useEffect(() => {
    if (!isLoading && !isPlatformAdmin) {
      if (fallback === "redirect") {
        router.push(redirectTo)
      }
    }
  }, [isLoading, isPlatformAdmin, fallback, redirectTo, router])

  useEffect(() => {
    if (!isLoading && isTenant) {
      router.push("/tenant")
    }
  }, [isLoading, isTenant, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isTenant) {
    return null
  }

  if (!isPlatformAdmin) {
    if (fallback === "redirect") {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="p-4 bg-rose-50 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Platform Admin Access Only</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          This page is only accessible to platform administrators.
        </p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Higher-order component for page-level permission checking
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string | string[],
  options?: { fallback?: "redirect" | "message"; redirectTo?: string }
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGuard permission={permission} {...options}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}
