/**
 * Edit Bill Page
 *
 * Allows editing non-financial fields of a bill: due date, billing period, notes, status.
 * Line items and amounts are immutable for financial integrity.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { getNowISO } from "@/lib/date-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, FormField } from "@/components/ui/form-components"
import { FileText } from "lucide-react"
import { DetailHero, DetailSection } from "@/components/ui"
import { DatePicker } from "@/components/ui/date-picker"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredDate } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { BILL_STATUS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

const BILL_STATUS_OPTIONS = Object.entries(BILL_STATUS).map(([value, config]) => ({
  value,
  label: config.label,
}))

export default function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="bills.edit">
      <EditBillContent params={params} />
    </PermissionGuard>
  )
}

function EditBillContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/bills" })

  const {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
    validateField,
  } = useFormEditPage({
    table: "bills",
    id,
    initialData: {
      due_date: "",
      billing_period_start: "",
      billing_period_end: "",
      notes: "",
      status: "unpaid",
    },
    redirectTo: `/bills/${id}`,
    successMessage: "Bill updated successfully!",
    errorMessage: "Failed to update bill",
    validationSchema: {
      due_date: requiredDate("Due date"),
    },
    mapToForm: (rec) => ({
      due_date: (rec.due_date as string) || "",
      billing_period_start: (rec.billing_period_start as string) || (rec.period_start as string) || "",
      billing_period_end: (rec.billing_period_end as string) || (rec.period_end as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "unpaid",
    }),
    transform: (data): Record<string, unknown> => ({
      due_date: data.due_date,
      billing_period_start: data.billing_period_start || null,
      billing_period_end: data.billing_period_end || null,
      notes: data.notes || null,
      status: data.status,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading bill..." />
  }

  const billNumber = (record?.bill_number as string) || "Bill"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Bill"
        subtitle={billNumber}
        backHref={backHref}
        backLabel="All Bills"
        icon={FileText}
        breadcrumbs={[
          { label: "Bills", href: "/bills" },
          { label: "Edit Bill" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Bill Details" description="Update bill dates, status, and notes. Line items and amounts cannot be changed." icon={FileText}>
            {/* Status & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Status" htmlFor="status">
                <Select
                  value={formData.status as string}
                  onChange={handleChange}
                  name="status"
                  disabled={saving}
                  options={BILL_STATUS_OPTIONS}
                />
              </FormField>
              <FormField label="Due Date" htmlFor="due_date" required error={errors.due_date}>
                <DatePicker
                  id="due_date"
                  value={formData.due_date as string}
                  onChange={(val) => setFormData((prev) => ({ ...prev, due_date: val }))}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Period Start" htmlFor="billing_period_start">
                <DatePicker
                  id="billing_period_start"
                  value={formData.billing_period_start as string}
                  onChange={(val) => setFormData((prev) => ({ ...prev, billing_period_start: val }))}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Period End" htmlFor="billing_period_end">
                <DatePicker
                  id="billing_period_end"
                  value={formData.billing_period_end as string}
                  onChange={(val) => setFormData((prev) => ({ ...prev, billing_period_end: val }))}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Notes */}
            <FormField label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this bill..."
                value={formData.notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/bills/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
