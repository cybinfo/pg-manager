"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import { type TenantWithBillDues } from "@/types/payments.types"
import { OUTSTANDING_BILL_STATUSES } from "@/lib/status"

interface RowState {
  selected: boolean
  amount: string
  payment_method: string
}

export function usePaymentBulk() {
  const [loading, setLoading] = useState(true)
  const [tenantDues, setTenantDues] = useState<TenantWithBillDues[]>([])
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  useEffect(() => {
    const fetchDues = async () => {
      const supabase = createClient()

      const { data: bills, error } = await supabase
        .from("bills")
        .select(`
          id, bill_number, for_month, balance_due, total_amount,
          tenant:tenants(id, name, phone, entity_id,
            property:entities(id, name),
            room:rooms(id, room_number)
          )
        `)
        .in("status", [...OUTSTANDING_BILL_STATUSES])
        .gt("balance_due", 0)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) {
        logger.error("Error fetching bills with dues:", { detail: error })
        showError("Failed to load outstanding dues")
        setLoading(false)
        return
      }

      const dues: TenantWithBillDues[] = (bills || [])
        .map((bill: Record<string, unknown>) => {
          const tenant = transformJoin(bill.tenant as Record<string, unknown>[] | Record<string, unknown> | null)
          if (!tenant) return null

          const property = transformJoin((tenant as Record<string, unknown>).property as Record<string, unknown>[] | Record<string, unknown> | null)
          const room = transformJoin((tenant as Record<string, unknown>).room as Record<string, unknown>[] | Record<string, unknown> | null)

          return {
            tenant_id: (tenant as Record<string, unknown>).id as string,
            tenant_name: (tenant as Record<string, unknown>).name as string,
            phone: (tenant as Record<string, unknown>).phone as string,
            entity_id: (tenant as Record<string, unknown>).entity_id as string,
            property_name: (property as Record<string, unknown>)?.name as string || "Unknown",
            room_number: (room as Record<string, unknown>)?.room_number as string || "N/A",
            bill_id: bill.id as string,
            bill_number: bill.bill_number as string,
            for_month: bill.for_month as string,
            balance_due: bill.balance_due as number,
          }
        })
        .filter((d: TenantWithBillDues | null): d is TenantWithBillDues => d !== null)

      setTenantDues(dues)

      // Initialize row states
      const initialStates: Record<string, RowState> = {}
      for (const due of dues) {
        initialStates[due.bill_id] = {
          selected: false,
          amount: due.balance_due.toString(),
          payment_method: "cash",
        }
      }
      setRowStates(initialStates)
      setLoading(false)
    }

    fetchDues()
  }, [])

  return {
    loading,
    tenantDues,
    rowStates,
    setRowStates,
  }
}
