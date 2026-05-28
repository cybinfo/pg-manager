"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { useTenantPortalData } from "./useTenantPortalData"

export interface TenantBill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  line_items: { name: string; amount: number; type?: string }[] | null
  created_at: string
}

export interface TenantBillStats {
  totalBilled: number
  totalPaid: number
  totalDue: number
  billsCount: number
}

export interface UseTenantBillsReturn {
  bills: TenantBill[]
  stats: TenantBillStats
  loading: boolean
}

export function useTenantBills(): UseTenantBillsReturn {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [bills, setBills] = useState<TenantBill[]>([])
  const [stats, setStats] = useState<TenantBillStats>({
    totalBilled: 0,
    totalPaid: 0,
    totalDue: 0,
    billsCount: 0,
  })
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant) {
      setDataLoading(false)
      return
    }

    let cancelled = false

    const fetchBills = async () => {
      try {
        const supabase = createClient()

        const { data: billsData } = await supabase
          .from("bills")
          .select(`
            id,
            bill_number,
            bill_date,
            due_date,
            for_month,
            total_amount,
            paid_amount,
            balance_due,
            status,
            line_items,
            created_at
          `)
          .eq("tenant_id", tenant.id)
          .is("deleted_at", null)
          .order("bill_date", { ascending: false })

        if (cancelled) return

        const allBills = (billsData as TenantBill[]) || []
        const totalBilled = allBills.reduce((sum: number, b: TenantBill) => sum + Number(b.total_amount), 0)
        const totalPaid = allBills.reduce((sum: number, b: TenantBill) => sum + Number(b.paid_amount), 0)
        const totalDue = allBills.reduce((sum: number, b: TenantBill) => sum + Number(b.balance_due), 0)

        setBills(allBills)
        setStats({ totalBilled, totalPaid, totalDue, billsCount: allBills.length })
      } catch (err) {
        logger.error("useTenantBills: failed to fetch bills", { error: String(err) })
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchBills()

    return () => {
      cancelled = true
    }
  }, [tenant, tenantLoading])

  return {
    bills,
    stats,
    loading: tenantLoading || dataLoading,
  }
}
