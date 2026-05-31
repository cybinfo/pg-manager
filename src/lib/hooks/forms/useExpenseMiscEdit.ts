"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { EXPENSE_MISC_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type {
  MiscTransaction,
  MiscTransactionCategory,
  MiscTransactionFormData,
  MiscPaymentMode,
} from "@/types/expense-enhanced.types"

export { PAYMENT_MODE_OPTIONS }

export function useExpenseMiscEdit(id: string) {
  const router = useRouter()
  const { workspaceId } = useAuthContext()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses", defaultLabel: "All Expenses" })

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])

  const [formData, setFormData] = useState<MiscTransactionFormData>({
    transaction_type: "in",
    category_id: "",
    person_name: "",
    description: "",
    amount: 0,
    transaction_date: getTodayISO(),
    payment_mode: "cash",
    payment_reference: "",
    notes: "",
  })

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: txData, error: txError } = await supabase
        .from("misc_transactions")
        .select(`
          *,
          category:misc_transaction_categories(id, name, name_hi, default_type)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (txError || !txData) {
        setNotFound(true)
        setLoadingData(false)
        return
      }

      const transaction = {
        ...txData,
        category: transformJoin(txData.category),
      } as MiscTransaction

      setFormData({
        transaction_type: transaction.transaction_type,
        category_id: transaction.category_id || "",
        person_name: transaction.person_name || "",
        description: transaction.description || "",
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        payment_mode: transaction.payment_mode || "cash",
        payment_reference: transaction.payment_reference || "",
        notes: transaction.notes || "",
      })

      const { data: catData } = await supabase
        .from("misc_transaction_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")

      setCategories(catData || [])
      setLoadingData(false)
    }

    loadData()
  }, [id, workspaceId])

  const filteredCategories = categories.filter(
    (cat) => cat.default_type === "both" || cat.default_type === formData.transaction_type
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.amount <= 0) {
      showError("Amount must be greater than 0")
      return
    }

    if (!formData.person_name?.trim() && !formData.description?.trim()) {
      showError("Please enter person name or description")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const selectedCategory = categories.find((c) => c.id === formData.category_id)

      const updateData = {
        transaction_type: formData.transaction_type,
        category_id: formData.category_id || null,
        category_name: selectedCategory?.name || null,
        person_name: formData.person_name?.trim() || null,
        description: formData.description?.trim() || null,
        amount: formData.amount,
        transaction_date: formData.transaction_date,
        payment_mode: formData.payment_mode || "cash",
        payment_reference: formData.payment_reference?.trim() || null,
        notes: formData.notes?.trim() || null,
        updated_at: getNowISO(),
      }

      const { error } = await supabase
        .from("misc_transactions")
        .update(updateData)
        .eq("id", id)

      if (error) throw error

      showSuccess("Transaction updated")
      router.push(`/expenses/misc/${id}`)
    } catch (error) {
      logger.error("Failed to update transaction:", { detail: error })
      showError("Failed to update transaction")
    } finally {
      setLoading(false)
    }
  }

  const setTransactionType = (type: "in" | "out") => {
    setFormData((prev) => ({ ...prev, transaction_type: type, category_id: "" }))
  }

  const setField = <K extends keyof MiscTransactionFormData>(key: K, value: MiscTransactionFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return {
    backHref,
    backLabel,
    loading,
    loadingData,
    notFound,
    formData,
    setFormData,
    filteredCategories,
    handleSubmit,
    setTransactionType,
    setField,
    id,
    router,
    PAYMENT_MODE_OPTIONS,
  }
}

export type { MiscPaymentMode }
