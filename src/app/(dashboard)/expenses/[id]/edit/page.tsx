"use client"

import Link from "next/link"
import {
  Loader2,
  Receipt,
  Wallet,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { DetailHero, DetailSection } from "@/components/ui"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/auth"
import { DatePicker } from "@/components/ui/date-picker"
import { useExpenseEdit } from "@/lib/hooks/forms/useExpenseEdit"

export default function EditExpensePage() {
  return (
    <PermissionGuard permission="expenses.edit">
      <EditExpenseContent />
    </PermissionGuard>
  )
}

function EditExpenseContent() {
  const {
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
  } = useExpenseEdit()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="Edit Expense"
        subtitle="Update expense details"
        backHref={backHref}
        backLabel="All Expenses"
        icon={Receipt}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Edit Expense"}]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Expense Details" description="Basic information about the expense" icon={Receipt}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Category" required>
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
              </FormField>

              <FormField label="Property">
                <Select
                  id="entity_id"
                  name="entity_id"
                  value={formData.entity_id}
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
              <FormField label="Amount (₹)" required>
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
              </FormField>

              <FormField label="Date" required>
                <DatePicker
                  id="expense_date"
                  value={formData.expense_date}
                  onChange={(val) => setFormData((prev) => ({ ...prev, expense_date: val }))}
                  placeholder="Pick a date"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <Input
                id="description"
                name="description"
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={handleChange}
              />
            </FormField>
        </DetailSection>

        <DetailSection title="Payment Information" description="Vendor and payment details" icon={Wallet}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Vendor / Payee">
                <Input
                  id="vendor_name"
                  name="vendor_name"
                  placeholder="Name of vendor or payee"
                  value={formData.vendor_name}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="Reference / Invoice #">
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="Invoice or receipt number"
                  value={formData.reference_number}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Payment Method">
              <Select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                options={EXPENSE_PAYMENT_MODE_OPTIONS}
              />
            </FormField>
        </DetailSection>

        <DetailSection title="Additional Notes" description="Any extra information about this expense" icon={FileText}>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any additional notes here..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="resize-none"
            />
        </DetailSection>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href={`/expenses/${params.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
