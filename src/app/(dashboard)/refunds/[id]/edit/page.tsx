/**
 * Edit Refund Page
 *
 * Form to edit an existing refund record.
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
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft, Wallet, Loader2 } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredAmount } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import {
  REFUND_TYPE_OPTIONS,
  REFUND_PAYMENT_MODE_OPTIONS,
  REFUND_STATUS,
} from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

const REFUND_STATUS_OPTIONS = Object.entries(REFUND_STATUS).map(([value, config]) => ({
  value,
  label: config.label,
}))

export default function EditRefundPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="payments.edit">
      <EditRefundContent params={params} />
    </PermissionGuard>
  )
}

function EditRefundContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/refunds" })

  const {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    errors,
    validateField,
  } = useFormEditPage({
    table: "refunds",
    id,
    initialData: {
      amount: "",
      payment_mode: "cash",
      refund_type: "security_deposit",
      refund_date: "",
      reference_number: "",
      notes: "",
      status: "pending",
    },
    redirectTo: `/refunds/${id}`,
    successMessage: "Refund updated successfully!",
    errorMessage: "Failed to update refund",
    validationSchema: {
      amount: requiredAmount("Amount"),
    },
    mapToForm: (rec) => ({
      amount: rec.amount?.toString() || "",
      payment_mode: (rec.payment_mode as string) || "cash",
      refund_type: (rec.refund_type as string) || "security_deposit",
      refund_date: (rec.refund_date as string) || "",
      reference_number: (rec.reference_number as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "pending",
    }),
    transform: (data): Record<string, unknown> => {
      const result: Record<string, unknown> = {
        amount: Number(data.amount),
        payment_mode: data.payment_mode,
        refund_type: data.refund_type,
        refund_date: data.refund_date || null,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        status: data.status,
        updated_at: getNowISO(),
      }

      // If marking as completed, set processed_at
      if (data.status === "completed") {
        result.processed_at = getNowISO()
      }

      return result
    },
  })

  if (loading) {
    return <PageLoading message="Loading refund..." />
  }

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
          <h1 className="text-3xl font-bold">Edit Refund</h1>
          <p className="text-muted-foreground">Update refund details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Wallet className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Refund Details</CardTitle>
                <CardDescription>Update refund information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Amount (Rs.)" htmlFor="amount" required error={errors.amount}>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.amount as string}
                  onChange={handleChange}
                  onBlur={() => validateField("amount")}
                  disabled={saving}
                  min={1}
                  step="0.01"
                />
              </FormField>
              <FormField label="Refund Type" htmlFor="refund_type">
                <Select
                  value={formData.refund_type as string}
                  onChange={handleChange}
                  name="refund_type"
                  disabled={saving}
                  options={REFUND_TYPE_OPTIONS}
                />
              </FormField>
            </div>

            {/* Payment Mode & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Mode" htmlFor="payment_mode">
                <Select
                  value={formData.payment_mode as string}
                  onChange={handleChange}
                  name="payment_mode"
                  disabled={saving}
                  options={REFUND_PAYMENT_MODE_OPTIONS}
                />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select
                  value={formData.status as string}
                  onChange={handleChange}
                  name="status"
                  disabled={saving}
                  options={REFUND_STATUS_OPTIONS}
                />
              </FormField>
            </div>

            {/* Date & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Refund Date" htmlFor="refund_date">
                <DatePicker
                  id="refund_date"
                  value={formData.refund_date as string}
                  onChange={(val) => setFormData((prev) => ({ ...prev, refund_date: val }))}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Reference Number" htmlFor="reference_number">
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="Transaction ID / UPI Ref"
                  value={formData.reference_number as string}
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
                placeholder="Any additional notes..."
                value={formData.notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/refunds/${id}`}>
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
