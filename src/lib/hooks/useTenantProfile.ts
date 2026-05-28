"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { useTenantPortalData } from "./useTenantPortalData"

export interface TenantApprovalRequest {
  id: string
  type: string
  status: string
  description: string | null
  payload: Record<string, unknown>
  created_at: string
  decided_at: string | null
}

export interface UseTenantProfileReturn {
  requests: TenantApprovalRequest[]
  loading: boolean
  refetch: (tenantId: string) => void
}

export function useTenantProfile(): UseTenantProfileReturn {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [requests, setRequests] = useState<TenantApprovalRequest[]>([])

  const fetchRequests = useCallback(async (tenantId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("approvals")
        .select("id, type, status, description, payload, created_at, decided_at")
        .eq("requester_tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (data) {
        setRequests(data as TenantApprovalRequest[])
      }
    } catch (err) {
      logger.error("useTenantProfile: failed to fetch approval requests", { error: String(err) })
    }
  }, [])

  useEffect(() => {
    if (tenantLoading || !tenant) return
    fetchRequests(tenant.id)
  }, [tenant, tenantLoading, fetchRequests])

  return {
    requests,
    loading: tenantLoading,
    refetch: fetchRequests,
  }
}
