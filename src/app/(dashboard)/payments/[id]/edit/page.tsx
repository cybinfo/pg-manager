/**
 * Edit Payment Page
 *
 * Form to edit an existing PG payment record.
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
import { Receipt } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredAmount, requiredDate } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"
import { DatePicker } from "@/components/ui/date-picker"
import { DetailHero, DetailSection } from "@/components/ui"

export default function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="payments.edit">
      <EditPaymentContent params={params} />
    </PermissionGuard>
  )
}

function EditPaymentContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/payments" })

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
    table: "payments",
    id,
    initialData: {
      amount: "",
      payment_method: "cash",
      payment_date: "",
      transaction_reference: "",
      notes: "",
      status: "completed",
    },
    redirectTo: `/payments/${id}`,
    successMessage: "Payment updated successfully!",
    errorMessage: "Failed to update payment",
    validationSchema: {
      amount: requiredAmount("Amount"),
      payment_date: requiredDate("Payment date"),
    },
    mapToForm: (rec) => ({
      amount: rec.amount?.toString() || "",
      payment_method: (rec.payment_method as string) || "cash",
      payment_date: (rec.payment_date as string) || "",
      transaction_reference: (rec.transaction_reference as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "completed",
    }),
    transform: (data): Record<string, unknown> => ({
      amount: Number(data.amount),
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      transaction_reference: data.transaction_reference || null,
      notes: data.notes || null,
      status: data.status,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading payment..." />
  }

  const receiptNumber = (record?.receipt_number as string) || "Payment"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Payment"
        subtitle={receiptNumber}
        backHref={backHref}
        backLabel="All Payments"
        icon={Receipt}
        breadcrumbs={[
          { label: "Payments", href: "/payments" },
          { label: "Edit Payment" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Payment Details" description="Update payment information" icon={Receipt}>
          {/* Amount & Date */}
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
            <FormField label="Payment Date" htmlFor="payment_date" required error={errors.payment_date}>
              <DatePicker
                id="payment_date"
                value={formData.payment_date as string}
                onChange={(val) => {
                  handleChange({ target: { name: "payment_date", value: val } } as React.ChangeEvent<HTMLInputElement>)
                  validateField("payment_date")
                }}
                disabled={saving}
              />
            </FormField>
          </div>

          {/* Method & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Payment Method" htmlFor="payment_method">
              <Select
                value={formData.payment_method as string}
                onChange={handleChange}
                name="payment_method"
                disabled={saving}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={PAYMENT_STATUS_OPTIONS}
              />
            </FormField>
          </div>

          {/* Reference Number */}
          <FormField label="Reference Number" htmlFor="transaction_reference" hint="Optional: UPI reference, cheque number, or transaction ID">
            <Input
              id="transaction_reference"
              name="transaction_reference"
              placeholder="UPI ID, Cheque No., Transaction ID..."
              value={formData.transaction_reference as string}
              onChange={handleChange}
              disabled={saving}
            />
          </FormField>

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
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/payments/${id}`}>
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
