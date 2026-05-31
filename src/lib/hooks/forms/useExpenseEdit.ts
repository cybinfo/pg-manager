"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

interface ExpenseType {
  id: string
  name: string
  code: string
}

export function useExpenseEdit() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses" })
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])

  const [formData, setFormData] = useState({
    expense_type_id: "",
    entity_id: "",
    amount: "",
    expense_date: "",
    vendor_name: "",
    reference_number: "",
    payment_method: "cash",
    description: "",
    notes: "",
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchData = async () => {
    try {
      if (!user) {
        router.push("/login")
        return
      }

      const supabase = createClient()

      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", params.id)
        .single()

      if (expenseError) throw expenseError

      setFormData({
        expense_type_id: expense.expense_type_id,
        entity_id: expense.entity_id || "",
        amount: String(expense.amount),
        expense_date: expense.expense_date,
        vendor_name: expense.vendor_name || "",
        reference_number: expense.reference_number || "",
        payment_method: expense.payment_method,
        description: expense.description || "",
        notes: expense.notes || "",
      })

      const { data: typesData } = await supabase
        .from("expense_types")
        .select("id, name, code")
        .eq("owner_id", user.id)
        .eq("is_enabled", true)
        .order("display_order")

      setExpenseTypes(typesData || [])

      const { data: propertiesData } = await supabase
        .from("entities")
        .eq("type", "pg")
        .select("id, name")
        .order("name")

      setProperties(propertiesData || [])
    } catch (error) {
      logger.error("Error fetching data:", { detail: error })
      showError("Failed to load expense")
      router.push("/expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.expense_type_id) {
      showError("Please select an expense category")
      return
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      showError("Please enter a valid amount")
      return
    }

    if (!formData.expense_date) {
      showError("Please select a date")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("expenses")
        .update({
          expense_type_id: formData.expense_type_id,
          entity_id: formData.entity_id || null,
          amount: Number(formData.amount),
          expense_date: formData.expense_date,
          vendor_name: formData.vendor_name || null,
          reference_number: formData.reference_number || null,
          payment_method: formData.payment_method,
          description: formData.description || null,
          notes: formData.notes || null,
        })
        .eq("id", params.id)

      if (error) {
        logger.error("Error updating expense:", { detail: error })
        showError(`Failed to update expense: ${error.message}`)
        return
      }

      showSuccess("Expense updated successfully")
      router.push(`/expenses/${params.id}`)
    } catch (error) {
      logger.error("Error:", { detail: error })
      showError("Failed to update expense")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    backHref,
    params,
    loading,
    submitting,
    expenseTypes,
    properties,
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    EXPENSE_PAYMENT_MODE_OPTIONS,
  }
}
