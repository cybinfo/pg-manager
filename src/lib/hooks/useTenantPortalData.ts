/**
 * useTenantPortalData Hook
 *
 * Centralized data fetching for the tenant portal.
 * Handles auth check, tenant lookup, property/room details,
 * and owner/workspace context resolution.
 *
 * Eliminates duplicated data fetching across 6 tenant portal pages:
 * - tenant/page.tsx (dashboard)
 * - tenant/bills/page.tsx
 * - tenant/payments/page.tsx
 * - tenant/complaints/page.tsx
 * - tenant/notices/page.tsx
 * - tenant/profile/page.tsx
 *
 * @example
 * const { tenant, tenantContext, user, loading, error } = useTenantPortalData()
 *
 * if (loading) return <PageSkeleton variant="detail" />
 * if (!tenant) return <NoActiveTenancy />
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { TenantWithContext } from "@/types/tenants.types"
import type { User } from "@supabase/supabase-js"

// ============================================================================
// TYPES
// ============================================================================

export interface TenantPortalTenant {
  id: string
  name: string
  phone: string
  email: string | null
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  check_in_date: string
  check_out_date: string | null
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, unknown> | null
  owner_id: string
  property_id: string
  room_id: string | null
  user_id: string | null
  property: {
    name: string
    address: string | null
    city: string
    state?: string | null
    owner_id: string
    tenant_features?: {
      view_bills: boolean
      view_payments: boolean
      submit_complaints: boolean
      view_notices: boolean
      request_visitors: boolean
      download_receipts: boolean
      update_profile: boolean
    } | null
  } | null
  room: {
    room_number: string
    room_type: string
    floor?: number | null
    amenities: string[] | null
    has_ac?: boolean
    has_attached_bathroom?: boolean
  } | null
}

export interface UseTenantPortalDataReturn {
  /** Full tenant record with joined property/room data */
  tenant: TenantPortalTenant | null
  /** Tenant context with workspace and owner IDs (for approvals/reports) */
  tenantContext: TenantWithContext | null
  /** The authenticated Supabase user */
  user: User | null
  /** Whether data is currently loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Re-fetch all data */
  refresh: () => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function useTenantPortalData(): UseTenantPortalDataReturn {
  const [tenant, setTenant] = useState<TenantPortalTenant | null>(null)
  const [tenantContext, setTenantContext] = useState<TenantWithContext | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        setError("Not authenticated")
        return
      }

      setUser(authUser)

      // Fetch tenant with property and room details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(name, address, city, state, owner_id, tenant_features),
          room:rooms(room_number, room_type, floor, amenities, has_ac, has_attached_bathroom)
        `)
        .eq("user_id", authUser.id)
        .eq("status", "active")
        .single()

      if (tenantError || !tenantData) {
        setTenant(null)
        setTenantContext(null)
        setLoading(false)
        return
      }

      // Transform Supabase joins
      const property = transformJoin(tenantData.property)
      const room = transformJoin(tenantData.room)

      const normalizedTenant: TenantPortalTenant = {
        ...tenantData,
        property,
        room,
      }

      setTenant(normalizedTenant)

      // Resolve owner and workspace context
      const ownerId = property?.owner_id || tenantData.owner_id
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", ownerId)
        .single()

      setTenantContext({
        id: tenantData.id,
        workspace_id: workspace?.id || "",
        owner_id: ownerId,
        property_id: tenantData.property_id,
        room_id: tenantData.room_id,
      })
    } catch (err) {
      console.error("Error fetching tenant portal data:", err)
      setError(err instanceof Error ? err.message : "Failed to load tenant data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    tenant,
    tenantContext,
    user,
    loading,
    error,
    refresh: fetchData,
  }
}
