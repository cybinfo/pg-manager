"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { usePaymentBulk } from "@/lib/hooks/usePaymentBulk"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency } from "@/lib/format"
import { getTodayISO } from "@/lib/date-helpers"
import { PAYMENT_METHODS } from "@/lib/status/billing"
import { recordBulkPayments, BulkPaymentInput } from "@/lib/workflows/payment.workflow"

export function useBulkPaymentForm() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const { loading, tenantDues, rowStates, setRowStates } = usePaymentBulk()
  const [submitting, setSubmitting] = useState(false)
  const [paymentDate, setPaymentDate] = useState(getTodayISO())
  const [globalMethod, setGlobalMethod] = useState("cash")

  const paymentMethodOptions = Object.entries(PAYMENT_METHODS).map(([value, label]) => ({
    value,
    label,
  }))

  const selectedCount = Object.values(rowStates).filter((r) => r.selected).length
  const allSelected = tenantDues.length > 0 && selectedCount === tenantDues.length

  const toggleAll = useCallback(() => {
    setRowStates((prev) => {
      const newSelected = !allSelected
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], selected: newSelected }
      }
      return next
    })
  }, [allSelected, setRowStates])

  const toggleRow = useCallback((billId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], selected: !prev[billId].selected },
    }))
  }, [setRowStates])

  const updateRowAmount = useCallback((billId: string, amount: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], amount },
    }))
  }, [setRowStates])

  const updateRowMethod = useCallback((billId: string, method: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], payment_method: method },
    }))
  }, [setRowStates])

  const applyGlobalMethod = useCallback(() => {
    setRowStates((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], payment_method: globalMethod }
      }
      return next
    })
  }, [globalMethod, setRowStates])

  const totalSelectedAmount = tenantDues.reduce((sum: number, due) => {
    const row = rowStates[due.bill_id]
    if (row?.selected) {
      return sum + (parseFloat(row.amount) || 0)
    }
    return sum
  }, 0)

  const handleSubmit = async () => {
    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    const selectedPayments = tenantDues
      .filter((due) => rowStates[due.bill_id]?.selected)
      .map((due) => {
        const row = rowStates[due.bill_id]
        const amount = parseFloat(row.amount)

        if (!amount || amount <= 0) {
          return null
        }

        if (amount > due.balance_due) {
          return null
        }

        return {
          tenant_id: due.tenant_id,
          property_id: due.property_id,
          bill_id: due.bill_id,
          amount,
          payment_method: row.payment_method as BulkPaymentInput["payments"][number]["payment_method"],
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    if (selectedPayments.length === 0) {
      showError("No valid payments selected. Check amounts are positive and do not exceed balance due.")
      return
    }

    setSubmitting(true)

    try {
      const result = await recordBulkPayments(
        {
          payments: selectedPayments,
          payment_date: paymentDate,
          send_receipts: false,
        },
        user.id,
        "owner",
        workspaceId || user.id
      )

      if (result.total_payments > 0) {
        showSuccess(
          `${result.total_payments} payment${result.total_payments > 1 ? "s" : ""} recorded totalling ${formatCurrency(result.total_amount)}`
        )
        router.push("/payments")
      } else {
        showError("No payments were recorded. Please check the selected entries and try again.")
      }
    } catch (error: unknown) {
      handleClientError(error, "Recording bulk payments")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    loading,
    submitting,
    tenantDues,
    rowStates,
    paymentDate,
    setPaymentDate,
    globalMethod,
    setGlobalMethod,
    paymentMethodOptions,
    selectedCount,
    allSelected,
    totalSelectedAmount,
    toggleAll,
    toggleRow,
    updateRowAmount,
    updateRowMethod,
    applyGlobalMethod,
    handleSubmit,
  }
}
