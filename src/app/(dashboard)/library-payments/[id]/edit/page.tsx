/**
 * Edit Library Payment Page
 *
 * Form to edit an existing library payment record.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getNowISO } from "@/lib/date-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DetailHero, DetailSection } from "@/components/ui"
import { Select, FormField } from "@/components/ui/form-components"
import { CreditCard } from "lucide-react"
import { requiredAmount, requiredDate } from "@/lib/validation"
import { DatePicker } from "@/components/ui/date-picker"
import { PageLoading } from "@/components/ui/loading"
import {
  LIBRARY_PAYMENT_METHOD_OPTIONS,
  LIBRARY_PAYMENT_TYPE_OPTIONS,
  LIBRARY_PAYMENT_STATUS_OPTIONS,
} from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

export default function EditLibraryPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_payments.edit">
      <EditLibraryPaymentContent params={params} />
    </PermissionGuard>
  )
}

function EditLibraryPaymentContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-payments" })

  const {
    formData,
    handleChange,
    setField,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
    validateField,
  } = useFormEditPage({
    table: "library_payments",
    id,
    initialData: {
      amount: "",
      payment_method: "cash",
      payment_type: "subscription",
      payment_date: "",
      payment_reference: "",
      notes: "",
      status: "completed",
    },
    redirectTo: `/library-payments/${id}`,
    successMessage: "Payment updated successfully!",
    errorMessage: "Failed to update payment",
    validationSchema: {
      amount: requiredAmount("Amount"),
      payment_date: requiredDate("Payment date"),
    },
    mapToForm: (rec) => ({
      amount: rec.amount?.toString() || "",
      payment_method: (rec.payment_method as string) || "cash",
      payment_type: (rec.payment_type as string) || "subscription",
      payment_date: (rec.payment_date as string) || "",
      payment_reference: (rec.payment_reference as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "completed",
    }),
    transform: (data): Record<string, unknown> => ({
      amount: Number(data.amount),
      payment_method: data.payment_method,
      payment_type: data.payment_type,
      payment_date: data.payment_date,
      payment_reference: data.payment_reference || null,
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
        icon={CreditCard}
        breadcrumbs={[{ label: "Library Payments", href: "/library-payments" }, { label: "Edit Payment" }]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Payment Details" description="Update payment information" icon={CreditCard}>
            {/* Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Date" htmlFor="payment_date" required error={errors.payment_date}>
                <DatePicker
                  id="payment_date"
                  value={formData.payment_date as string}
                  onChange={(val) => setField("payment_date", val)}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Amount (Rs.)" htmlFor="amount" required error={errors.amount}>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.amount as string}
                  onChange={handleChange}
                  onBlur={() => validateField("amount")}
                  disabled={saving}
                  min={1}
                  step="0.01"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Type" htmlFor="payment_type">
                <Select
                  value={formData.payment_type as string}
                  onChange={handleChange}
                  name="payment_type"
                  disabled={saving}
                  options={LIBRARY_PAYMENT_TYPE_OPTIONS}
                />
              </FormField>
              <FormField label="Payment Method" htmlFor="payment_method">
                <Select
                  value={formData.payment_method as string}
                  onChange={handleChange}
                  name="payment_method"
                  disabled={saving}
                  options={LIBRARY_PAYMENT_METHOD_OPTIONS}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="status">
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={LIBRARY_PAYMENT_STATUS_OPTIONS}
              />
            </FormField>

            <FormField label="Reference Number" htmlFor="payment_reference" hint="Optional: UPI reference, cheque number, or transaction ID">
              <Input
                id="payment_reference"
                name="payment_reference"
                placeholder="UPI ID, Cheque No., Transaction ID..."
                value={formData.payment_reference as string}
                onChange={handleChange}
                disabled={saving}
              />
            </FormField>

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
          <Link href={`/library-payments/${id}`}>
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
