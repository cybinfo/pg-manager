"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { useTenantPortalData } from "./useTenantPortalData"

export interface TenantPayment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  receipt_number: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
  charge_type: { name: string } | null
}

interface RawPayment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  receipt_number: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
  charge_type: { name: string }[] | null
}

export interface TenantPaymentStats {
  totalPaid: number
  totalPaidThisYear: number
  paymentsCount: number
  monthlyRent: number
}

export interface UseTenantPaymentsReturn {
  payments: TenantPayment[]
  stats: TenantPaymentStats
  loading: boolean
}

export function useTenantPayments(): UseTenantPaymentsReturn {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [payments, setPayments] = useState<TenantPayment[]>([])
  const [stats, setStats] = useState<TenantPaymentStats>({
    totalPaid: 0,
    totalPaidThisYear: 0,
    paymentsCount: 0,
    monthlyRent: 0,
  })
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant) {
      setDataLoading(false)
      return
    }

    let cancelled = false

    const fetchPayments = async () => {
      try {
        const supabase = createClient()

        const { data: paymentsData } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            payment_method,
            payment_date,
            for_period,
            receipt_number,
            reference_number,
            notes,
            created_at,
            charge_type:charge_types(name)
          `)
          .eq("tenant_id", tenant.id)
          .is("deleted_at", null)
          .order("payment_date", { ascending: false })

        if (cancelled) return

        const allPayments: TenantPayment[] = ((paymentsData as RawPayment[]) || []).map((p) => ({
          ...p,
          charge_type: p.charge_type && p.charge_type.length > 0 ? p.charge_type[0] : null,
        }))

        const totalPaid = allPayments.reduce((sum: number, p: TenantPayment) => sum + Number(p.amount), 0)
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
        const totalPaidThisYear = allPayments
          .filter((p) => p.payment_date >= yearStart)
          .reduce((sum: number, p: TenantPayment) => sum + Number(p.amount), 0)

        setPayments(allPayments)
        setStats({
          totalPaid,
          totalPaidThisYear,
          paymentsCount: allPayments.length,
          monthlyRent: tenant.monthly_rent,
        })
      } catch (err) {
        logger.error("useTenantPayments: failed to fetch payments", { error: String(err) })
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchPayments()

    return () => {
      cancelled = true
    }
  }, [tenant, tenantLoading])

  return {
    payments,
    stats,
    loading: tenantLoading || dataLoading,
  }
}
