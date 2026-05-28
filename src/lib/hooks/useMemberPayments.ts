"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { MemberPortalMember } from "./useMemberPortalData"

export interface MemberPaymentRecord {
  id: string
  receipt_number: string | null
  payment_date: string
  amount: number
  payment_type: string
  payment_method: string
  notes: string | null
}

export interface MemberPaymentStats {
  totalPaid: number
  thisYearPaid: number
  lastPaymentDate: string | null
  paymentCount: number
}

export interface UseMemberPaymentsReturn {
  payments: MemberPaymentRecord[]
  stats: MemberPaymentStats
  loading: boolean
}

const EMPTY_STATS: MemberPaymentStats = {
  totalPaid: 0,
  thisYearPaid: 0,
  lastPaymentDate: null,
  paymentCount: 0,
}

export function useMemberPayments(
  member: MemberPortalMember | null,
  memberLoading: boolean
): UseMemberPaymentsReturn {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<MemberPaymentRecord[]>([])
  const [stats, setStats] = useState<MemberPaymentStats>(EMPTY_STATS)

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchPayments = async () => {
      const supabase = createClient()

      const { data: paymentsData } = await supabase
        .from("library_payments")
        .select(
          "id, receipt_number, payment_date, amount, payment_type, payment_method, notes"
        )
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })

      const records: MemberPaymentRecord[] = paymentsData || []

      const totalPaid = records.reduce(
        (sum: number, p: MemberPaymentRecord) => sum + Number(p.amount),
        0
      )
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0]
      const thisYearPaid = records
        .filter((p: MemberPaymentRecord) => p.payment_date >= yearStart)
        .reduce((sum: number, p: MemberPaymentRecord) => sum + Number(p.amount), 0)

      setPayments(records)
      setStats({
        totalPaid,
        thisYearPaid,
        lastPaymentDate: records.length > 0 ? records[0].payment_date : null,
        paymentCount: records.length,
      })
      setLoading(false)
    }

    fetchPayments().catch((err: unknown) => {
      logger.error("useMemberPayments: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [member, memberLoading])

  return { payments, stats, loading }
}
