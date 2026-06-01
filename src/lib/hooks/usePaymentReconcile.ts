"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins } from "@/lib/supabase/transforms"
import { showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import type { UnreconciledPayment, OutstandingBill } from "@/lib/services/reconciliation"
import { OUTSTANDING_BILL_STATUSES } from "@/lib/status"

export function usePaymentReconcile() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<UnreconciledPayment[]>([])
  const [bills, setBills] = useState<OutstandingBill[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [paymentsResult, billsResult] = await Promise.all([
        supabase
          .from("payments")
          .select(`
            id, amount, payment_method, payment_date, receipt_number, notes,
            tenant:tenants(id, name),
            property:entities(id, name)
          `)
          .is("bill_id", null)
          .is("deleted_at", null)
          .order("payment_date", { ascending: false }),
        supabase
          .from("bills")
          .select(`
            id, bill_number, bill_date, due_date, for_month,
            total_amount, paid_amount, balance_due, status,
            tenant:tenants(id, name),
            property:entities(id, name)
          `)
          .gt("balance_due", 0)
          .in("status", [...OUTSTANDING_BILL_STATUSES])
          .is("deleted_at", null)
          .order("bill_date", { ascending: false }),
      ])

      if (paymentsResult.error) {
        showError("Failed to load unreconciled payments")
        logger.error("Failed to load unreconciled payments", { error: String(paymentsResult.error) })
      }

      if (billsResult.error) {
        showError("Failed to load outstanding bills")
        logger.error("Failed to load outstanding bills", { error: String(billsResult.error) })
      }

      const transformedPayments = transformArrayJoins(
        (paymentsResult.data || []) as Record<string, unknown>[],
        ["tenant", "property"]
      ) as unknown as UnreconciledPayment[]

      const transformedBills = transformArrayJoins(
        (billsResult.data || []) as Record<string, unknown>[],
        ["tenant", "property"]
      ) as unknown as OutstandingBill[]

      setPayments(transformedPayments)
      setBills(transformedBills)
      setLoading(false)
    }

    fetchData()
  }, [])

  return {
    loading,
    payments,
    setPayments,
    bills,
    setBills,
  }
}
