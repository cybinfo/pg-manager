"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredSelect, requiredAmount, requiredDate } from "@/lib/validation"
import {
  Loader2,
  ArrowLeft,
  Receipt,
  Wallet,
  FileText,
} from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { PageSkeleton } from "@/components/ui/loading"
import { getTodayISO } from "@/lib/date-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

interface ExpenseType {
  id: string
  name: string
  code: string
}

export default function NewExpensePage() {
  return (
    <PermissionGuard permission="expenses.create">
      <NewExpenseContent />
    </PermissionGuard>
  )
}

function NewExpenseContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses" })
  const { user: authUser } = useAuth()
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    formData,
    handleChange,
    handleSubmit,
    saving,
    router,
    errors,
    validateField,
  } = useFormPage({
    table: "expenses",
    initialData: {
      expense_type_id: "",
      property_id: "",
      amount: "",
      expense_date: getTodayISO(),
      vendor_name: "",
      reference_number: "",
      payment_method: "cash",
      description: "",
      notes: "",
    },
    redirectTo: "/expenses",
    successMessage: "Expense added successfully",
    errorMessage: "Failed to add expense",
    useCreatedBy: false, // We manually add owner_id and created_by in transform
    addOwnerId: false,
    validationSchema: {
      expense_type_id: requiredSelect("Category"),
      amount: requiredAmount("Amount"),
      expense_date: requiredDate("Date"),
    },
    transform: (data, userId) => ({
      owner_id: userId,
      created_by: userId,
      expense_type_id: data.expense_type_id,
      property_id: data.property_id || null,
      amount: Number(data.amount),
      expense_date: data.expense_date,
      vendor_name: data.vendor_name || null,
      reference_number: data.reference_number || null,
      payment_method: data.payment_method,
      description: data.description || null,
      notes: data.notes || null,
    }),
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!authUser) {
          router.push("/login")
          return
        }

        const supabase = createClient()
        // Fetch expense types - create defaults if none exist (owner-scoped)
        const { error: typesError, data: initialTypesData } = await supabase
          .from("expense_types")
          .select("id, name, code")
          .eq("owner_id", authUser.id)
          .eq("is_enabled", true)
          .order("display_order")
        let typesData = initialTypesData

        if (typesError) {
          logger.error("Error fetching expense types:", { detail: typesError })
        }

        // If no expense types exist, create defaults
        if (!typesData || typesData.length === 0) {
          await (supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<unknown>)("create_default_expense_types", { p_owner_id: authUser.id })

          // Fetch again after creating defaults (owner-scoped)
          const { data: newTypesData } = await supabase
            .from("expense_types")
            .select("id, name, code")
            .eq("owner_id", authUser.id)
            .eq("is_enabled", true)
            .order("display_order")

          typesData = newTypesData
        }

        setExpenseTypes(typesData || [])

        // Fetch properties
        const { data: propertiesData } = await supabase
          .from("properties")
          .select("id, name")
          .order("name")

        setProperties(propertiesData || [])
      } catch (error) {
        logger.error("Error fetching data:", { detail: error })
        showError("Failed to load form data")
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [router, authUser])

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Expense</h1>
          <p className="text-muted-foreground">Record a new property expense</p>
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
              <FormField label="Category" htmlFor="expense_type_id" required error={errors.expense_type_id}>
                <Select
                  id="expense_type_id"
                  name="expense_type_id"
                  value={formData.expense_type_id as string}
                  onChange={handleChange}
                  placeholder="Select category"
                  options={expenseTypes.map((type) => ({
                    value: type.id,
                    label: type.name,
                  }))}
                />
              </FormField>

              <FormField label="Property" htmlFor="property_id" hint="Leave empty for expenses that apply to all properties">
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id as string}
                  onChange={handleChange}
                  placeholder="All Properties (General)"
                  options={properties.map((prop) => ({
                    value: prop.id,
                    label: prop.name,
                  }))}
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Amount (₹)" htmlFor="amount" required error={errors.amount}>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount as string}
                  onChange={handleChange}
                  onBlur={() => validateField("amount")}
                />
              </FormField>

              <FormField label="Date" htmlFor="expense_date" required error={errors.expense_date}>
                <Input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  value={formData.expense_date as string}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description">
              <Input
                id="description"
                name="description"
                placeholder="Brief description of the expense"
                value={formData.description as string}
                onChange={handleChange}
              />
            </FormField>
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
              <FormField label="Vendor / Payee" htmlFor="vendor_name">
                <Input
                  id="vendor_name"
                  name="vendor_name"
                  placeholder="Name of vendor or payee"
                  value={formData.vendor_name as string}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="Reference / Invoice #" htmlFor="reference_number">
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="Invoice or receipt number"
                  value={formData.reference_number as string}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Payment Method" htmlFor="payment_method">
              <Select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method as string}
                onChange={handleChange}
                options={EXPENSE_PAYMENT_MODE_OPTIONS}
              />
            </FormField>
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
              value={formData.notes as string}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/expenses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Expense
          </Button>
        </div>
      </form>
    </div>
  )
}
