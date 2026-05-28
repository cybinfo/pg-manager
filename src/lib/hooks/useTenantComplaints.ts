"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { useTenantPortalData } from "./useTenantPortalData"

export interface TenantComplaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface UseTenantComplaintsReturn {
  complaints: TenantComplaint[]
  loading: boolean
  refetch: () => void
}

export function useTenantComplaints(): UseTenantComplaintsReturn {
  const { tenant, tenantContext, loading: tenantLoading } = useTenantPortalData()
  const [complaints, setComplaints] = useState<TenantComplaint[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const fetchComplaints = useCallback(async () => {
    if (!tenant || !tenantContext) return

    try {
      const supabase = createClient()

      const { data: complaintsData } = await supabase
        .from("complaints")
        .select("*")
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      setComplaints((complaintsData as TenantComplaint[]) || [])
    } catch (err) {
      logger.error("useTenantComplaints: failed to fetch complaints", { error: String(err) })
    }
  }, [tenant, tenantContext])

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant || !tenantContext) {
      setDataLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      await fetchComplaints()
      if (!cancelled) setDataLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [tenant, tenantContext, tenantLoading, fetchComplaints])

  return {
    complaints,
    loading: tenantLoading || dataLoading,
    refetch: fetchComplaints,
  }
}
