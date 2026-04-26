"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import {
  Loader2,
  ArrowLeft,
  Receipt,
  Wallet,
  FileText,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

interface ExpenseType {
  id: string
  name: string
  code: string
}

interface Property {
  id: string
  name: string
}

export default function EditExpensePage() {
  return (
    <PermissionGuard permission="expenses.edit">
      <EditExpenseContent />
    </PermissionGuard>
  )
}

function EditExpenseContent() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [formData, setFormData] = useState({
    expense_type_id: "",
    property_id: "",
    amount: "",
    expense_date: "",
    vendor_name: "",
    reference_number: "",
    payment_method: "cash",
    description: "",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Fetch expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", params.id)
        .single()

      if (expenseError) throw expenseError

      setFormData({
        expense_type_id: expense.expense_type_id,
        property_id: expense.property_id || "",
        amount: String(expense.amount),
        expense_date: expense.expense_date,
        vendor_name: expense.vendor_name || "",
        reference_number: expense.reference_number || "",
        payment_method: expense.payment_method,
        description: expense.description || "",
        notes: expense.notes || "",
      })

      // Fetch expense types (owner-scoped)
      const { data: typesData } = await supabase
        .from("expense_types")
        .select("id, name, code")
        .eq("owner_id", user.id)
        .eq("is_enabled", true)
        .order("display_order")

      setExpenseTypes(typesData || [])

      // Fetch properties
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")

      setProperties(propertiesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
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
          property_id: formData.property_id || null,
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
        console.error("Error updating expense:", error)
        showError(`Failed to update expense: ${error.message}`)
        return
      }

      showSuccess("Expense updated successfully")
      router.push(`/expenses/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to update expense")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/expenses/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Expense</h1>
          <p className="text-muted-foreground">Update expense details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Receipt className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>Basic information about the expense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense_type_id">Category *</Label>
                <Select
                  id="expense_type_id"
                  name="expense_type_id"
                  value={formData.expense_type_id}
                  onChange={handleChange}
                  required
                  placeholder="Select category"
                  options={expenseTypes.map((type) => ({
                    value: type.id,
                    label: type.name,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Property</Label>
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  placeholder="All Properties (General)"
                  options={properties.map((prop) => ({
                    value: prop.id,
                    label: prop.name,
                  }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date">Date *</Label>
                <Input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vendor & Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Wallet className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>Vendor and payment details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor / Payee</Label>
                <Input
                  id="vendor_name"
                  name="vendor_name"
                  placeholder="Name of vendor or payee"
                  value={formData.vendor_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference / Invoice #</Label>
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="Invoice or receipt number"
                  value={formData.reference_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                options={EXPENSE_PAYMENT_MODE_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any extra information about this expense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              id="notes"
              name="notes"
              placeholder="Add any additional notes here..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/expenses/${params.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
