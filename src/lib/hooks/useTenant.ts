/**
 * useTenant Hook
 *
 * Centralized tenant data fetching for tenant portal pages.
 * Eliminates 6+ duplicate tenant data fetch patterns.
 *
 * @example
 * const { tenant, workspace, loading, error } = useTenant()
 *
 * if (loading) return <PageLoader />
 * if (error) return <ErrorState message={error} />
 *
 * // Use tenant.id, workspace.id, etc.
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

// ============================================================================
// TYPES
// ============================================================================

interface TenantProperty {
  id: string
  name: string
  address?: string | null
  owner_id: string
}

interface TenantRoom {
  id: string
  room_number: string
  floor?: number | null
}

interface TenantData {
  id: string
  name: string
  phone_numbers?: string[] | null
  email?: string | null
  status: string
  owner_id: string
  property_id: string
  room_id: string | null
  user_id: string | null
  person_id: string | null
  rent_amount?: number | null
  security_deposit?: number | null
  property?: TenantProperty | null
  room?: TenantRoom | null
}

interface WorkspaceData {
  id: string
  owner_id: string
}

interface UseTenantReturn {
  /** Current tenant data */
  tenant: TenantData | null
  /** Workspace data (derived from owner) */
  workspace: WorkspaceData | null
  /** Owner ID for queries */
  ownerId: string | null
  /** Whether data is loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh tenant data */
  refresh: () => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching current tenant's data in tenant portal
 */
export function useTenant(): UseTenantReturn {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenant = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      setError("Not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch tenant data with property and room
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone_numbers,
          email,
          status,
          owner_id,
          property_id,
          room_id,
          user_id,
          person_id,
          rent_amount,
          security_deposit,
          property:properties(id, name, address, owner_id),
          room:rooms(id, room_number, floor)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (tenantError) {
        if (tenantError.code === "PGRST116") {
          setError("No active tenant account found")
        } else {
          throw tenantError
        }
        return
      }

      if (!tenantData) {
        setError("No active tenant account found")
        return
      }

      // Transform joins
      const transformed: TenantData = {
        ...tenantData,
        property: Array.isArray(tenantData.property)
          ? tenantData.property[0]
          : tenantData.property,
        room: Array.isArray(tenantData.room)
          ? tenantData.room[0]
          : tenantData.room,
      }

      setTenant(transformed)

      // Fetch workspace ID from owner
      const ownerId = transformed.property?.owner_id || transformed.owner_id
      if (ownerId) {
        const { data: workspaceData } = await supabase
          .from("workspaces")
          .select("id, owner_id")
          .eq("owner_id", ownerId)
          .single()

        if (workspaceData) {
          setWorkspace(workspaceData)
        }
      }
    } catch (err) {
      logger.error("Error fetching tenant data:", { error: String(err) })
      setError(err instanceof Error ? err.message : "Failed to load tenant data")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchTenant()
  }, [fetchTenant])

  return {
    tenant,
    workspace,
    ownerId: tenant?.owner_id || null,
    loading,
    error,
    refresh: fetchTenant,
  }
}

// ============================================================================
// SIMPLIFIED VARIANTS
// ============================================================================

/**
 * Get just the tenant ID (for simple use cases)
 *
 * @example
 * const { tenantId, ownerId, loading } = useTenantId()
 */
export function useTenantId() {
  const { tenant, loading, error } = useTenant()

  return {
    tenantId: tenant?.id || null,
    ownerId: tenant?.owner_id || null,
    propertyId: tenant?.property_id || null,
    loading,
    error,
  }
}
