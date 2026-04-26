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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, FormField } from "@/components/ui/form-components"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Bill</h1>
          <p className="text-muted-foreground">{billNumber}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Bill Details</CardTitle>
                <CardDescription>
                  Update bill dates, status, and notes. Line items and amounts cannot be changed.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date as string}
                  onChange={handleChange}
                  onBlur={() => validateField("due_date")}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Period Start" htmlFor="billing_period_start">
                <Input
                  id="billing_period_start"
                  name="billing_period_start"
                  type="date"
                  value={formData.billing_period_start as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Period End" htmlFor="billing_period_end">
                <Input
                  id="billing_period_end"
                  name="billing_period_end"
                  type="date"
                  value={formData.billing_period_end as string}
                  onChange={handleChange}
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/bills/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
