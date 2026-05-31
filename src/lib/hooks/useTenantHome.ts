"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { useTenantPortalData } from "./useTenantPortalData"
import { OPEN_COMPLAINT_STATUSES } from "@/lib/status"

export interface RecentPayment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  for_period: string | null
}

export interface UseTenantHomeReturn {
  recentPayments: RecentPayment[]
  openComplaints: number
  unreadNotices: number
  totalPaid: number
  loading: boolean
}

export function useTenantHome(): UseTenantHomeReturn {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [openComplaints, setOpenComplaints] = useState(0)
  const [unreadNotices, setUnreadNotices] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDataLoading(false)
      return
    }

    let cancelled = false

    const fetchDashboardData = async () => {
      try {
        const supabase = createClient()

        const [paymentsRes, complaintsRes, noticesRes, yearPaymentsRes] = await Promise.all([
          supabase
            .from("payments")
            .select("id, amount, payment_date, payment_method, for_period")
            .eq("tenant_id", tenant.id)
            .is("deleted_at", null)
            .order("payment_date", { ascending: false })
            .limit(3),
          supabase
            .from("complaints")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .is("deleted_at", null)
            .in("status", [...OPEN_COMPLAINT_STATUSES]),
          supabase
            .from("notices")
            .select("id", { count: "exact", head: true })
            .eq("entity_id", tenant.entity_id)
            .is("deleted_at", null)
            .eq("is_active", true),
          supabase
            .from("payments")
            .select("amount")
            .eq("tenant_id", tenant.id)
            .is("deleted_at", null)
            .gte("payment_date", new Date(new Date().getFullYear(), 0, 1).toISOString()),
        ])

        if (cancelled) return

        const totalPaidAmount = (yearPaymentsRes.data || []).reduce(
          (sum: number, p: { amount: number }) => sum + Number(p.amount),
          0
        )

        setRecentPayments(paymentsRes.data || [])
        setOpenComplaints(complaintsRes.count || 0)
        setUnreadNotices(noticesRes.count || 0)
        setTotalPaid(totalPaidAmount)
      } catch (err) {
        logger.error("useTenantHome: failed to fetch dashboard data", { error: String(err) })
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [tenant, tenantLoading])

  return {
    recentPayments,
    openComplaints,
    unreadNotices,
    totalPaid,
    loading: tenantLoading || dataLoading,
  }
}
