"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash2, IndianRupee } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { ExpenseType } from "@/types/settings.types"

interface ExpenseTypeSettingsProps {
  expenseTypes: ExpenseType[]
  setExpenseTypes: (types: ExpenseType[]) => void
}

export function ExpenseTypeSettings({ expenseTypes, setExpenseTypes }: ExpenseTypeSettingsProps) {
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
      const { data: { user } } = await supabase.auth.getUser()

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
    } catch (error: any) {
      showError(error.message || "Failed to add expense category")
    } finally {
      setSaving(false)
    }
  }

  const deleteExpenseType = async (expenseType: ExpenseType) => {
    if (!confirm(`Delete "${expenseType.name}"? This cannot be undone.`)) return

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
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Configure categories for tracking expenses</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddExpense(!showAddExpense)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Expense Type Form */}
          {showAddExpense && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-medium">Add Expense Category</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="expense_name">Name</Label>
                  <Input
                    id="expense_name"
                    placeholder="e.g., Pest Control"
                    value={newExpenseType.name}
                    onChange={(e) => setNewExpenseType({ ...newExpenseType, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expense_code">Code</Label>
                  <Input
                    id="expense_code"
                    placeholder="e.g., pest_control"
                    value={newExpenseType.code}
                    onChange={(e) => setNewExpenseType({ ...newExpenseType, code: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addExpenseType} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddExpense(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Expense Types List */}
          <div className="space-y-2">
            {expenseTypes.map((expenseType) => (
              <div
                key={expenseType.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  expenseType.is_enabled ? "bg-background" : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${expenseType.is_enabled ? "bg-destructive/10" : "bg-muted"}`}>
                    <IndianRupee className={`h-4 w-4 ${expenseType.is_enabled ? "text-destructive" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${!expenseType.is_enabled && "text-muted-foreground"}`}>
                      {expenseType.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expenseType.code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpenseType(expenseType)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      expenseType.is_enabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        expenseType.is_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteExpenseType(expenseType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {expenseTypes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No expense categories yet.</p>
                <p className="text-sm mt-1">Add your first expense to create default categories automatically.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-info/10 border-info/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-info/20 rounded-lg">
              <IndianRupee className="h-5 w-5 text-info" />
            </div>
            <div>
              <h4 className="font-medium text-info">Track Your Expenses</h4>
              <p className="text-sm text-info mt-1">
                Go to Dashboard → Expenses to record and track all your property-related expenses.
                Expenses are shown in Reports for profitability analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
