"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { ExpenseType } from "@/types/settings.types"

interface UseExpenseTypeSettingsOptions {
  expenseTypes: ExpenseType[]
  setExpenseTypes: (types: ExpenseType[]) => void
}

export function useExpenseTypeSettings({ expenseTypes, setExpenseTypes }: UseExpenseTypeSettingsOptions) {
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [saving, setSaving] = useState(false)
  const [newExpenseType, setNewExpenseType] = useState({ name: "", code: "" })
  const [showAddExpense, setShowAddExpense] = useState(false)

  const toggleExpenseType = async (expenseType: ExpenseType) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("expense_types")
      .update({ is_enabled: !expenseType.is_enabled })
      .eq("id", expenseType.id)

    if (error) {
      showError("Failed to update expense type")
      return
    }

    setExpenseTypes(expenseTypes.map((et) =>
      et.id === expenseType.id ? { ...et, is_enabled: !et.is_enabled } : et
    ))
  }

  const addExpenseType = async () => {
    if (!newExpenseType.name || !newExpenseType.code) {
      showError("Please enter name and code")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("expense_types")
        .insert(
          withCreatedBy({
            owner_id: user?.id,
            name: newExpenseType.name,
            code: newExpenseType.code.toLowerCase().replace(/\s+/g, "_"),
            is_enabled: true,
            display_order: expenseTypes.length + 1,
          }, user!.id)
        )
        .select()
        .single()

      if (error) throw error

      setExpenseTypes([...expenseTypes, data])
      setNewExpenseType({ name: "", code: "" })
      setShowAddExpense(false)
      showSuccess("Expense category added")
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Failed to add expense category")
    } finally {
      setSaving(false)
    }
  }

  const deleteExpenseType = (expenseType: ExpenseType) => {
    confirm({
      title: "Delete Expense Category",
      description: `Delete "${expenseType.name}"? This cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        const supabase = createClient()

        const { error } = await supabase
          .from("expense_types")
          .delete()
          .eq("id", expenseType.id)

        if (error) {
          showError("Failed to delete expense category. It may be in use.")
          return
        }

        setExpenseTypes(expenseTypes.filter((et) => et.id !== expenseType.id))
        showSuccess("Expense category deleted")
      },
    })
  }

  return {
    saving,
    newExpenseType,
    setNewExpenseType,
    showAddExpense,
    setShowAddExpense,
    toggleExpenseType,
    addExpenseType,
    deleteExpenseType,
    ConfirmDialogElement,
  }
}
