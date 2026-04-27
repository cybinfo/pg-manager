/**
 * useTenantPortalData Hook
 *
 * Centralized data fetching for the tenant portal.
 * Handles auth check, tenant lookup, property/room details,
 * and owner/workspace context resolution.
 *
 * Built on the shared usePortalData base hook for common portal patterns.
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

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { TenantWithContext } from "@/types/tenants.types"
import type { User } from "@supabase/supabase-js"
import { usePortalData } from "./usePortalData"

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
// CONFIG
// ============================================================================

export const TENANT_PORTAL_CONFIG = {
  table: "tenants" as const,
  select: `
    *,
    property:properties(name, address, city, state, owner_id, tenant_features),
    room:rooms(room_number, room_type, floor, amenities, has_ac, has_attached_bathroom)
  `,
  joinFields: ["property", "room"],
  statusFilter: { column: "status", value: "active" },
  errorContext: "tenant portal",
  postTransform: (data: Record<string, unknown>): TenantPortalTenant => {
    return data as unknown as TenantPortalTenant
  },
}

// ============================================================================
// HOOK
// ============================================================================

export function useTenantPortalData(): UseTenantPortalDataReturn {
  const {
    data: tenant,
    rawData,
    user,
    loading: baseLoading,
    error,
    refresh,
  } = usePortalData<TenantPortalTenant>(TENANT_PORTAL_CONFIG)

  const [tenantContext, setTenantContext] = useState<TenantWithContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)

  // Resolve owner and workspace context after tenant data is fetched
  useEffect(() => {
    if (!rawData) {
      setTenantContext(null)
      return
    }

    let cancelled = false

    const resolveContext = async () => {
      setContextLoading(true)
      try {
        const property = rawData.property as TenantPortalTenant["property"]
        const ownerId = property?.owner_id || (rawData.owner_id as string)

        const supabase = createClient()
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_user_id", ownerId)
          .single()

        if (!cancelled) {
          setTenantContext({
            id: rawData.id as string,
            workspace_id: workspace?.id || "",
            owner_id: ownerId,
            property_id: rawData.property_id as string,
            room_id: rawData.room_id as string | undefined,
          })
        }
      } catch (err) {
        console.error("Error resolving tenant context:", err)
        if (!cancelled) {
          setTenantContext(null)
        }
      } finally {
        if (!cancelled) {
          setContextLoading(false)
        }
      }
    }

    resolveContext()

    return () => {
      cancelled = true
    }
  }, [rawData])

  // Combined loading: base query + context resolution
  const loading = useMemo(
    () => baseLoading || contextLoading,
    [baseLoading, contextLoading]
  )

  return {
    tenant,
    tenantContext,
    user,
    loading,
    error,
    refresh,
  }
}
