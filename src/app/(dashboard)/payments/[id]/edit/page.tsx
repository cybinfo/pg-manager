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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Receipt, Loader2 } from "lucide-react"
import { requiredAmount, requiredDate } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

const PAYMENT_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/payments/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Payment</h1>
          <p className="text-muted-foreground">{receiptNumber}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Receipt className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Update payment information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
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
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date as string}
                  onChange={handleChange}
                  onBlur={() => validateField("payment_date")}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Method & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method as string}
                  onChange={handleChange}
                  name="payment_method"
                  disabled={saving}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status as string}
                  onChange={handleChange}
                  name="status"
                  disabled={saving}
                  options={PAYMENT_STATUS_OPTIONS}
                />
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="transaction_reference">Reference Number</Label>
              <Input
                id="transaction_reference"
                name="transaction_reference"
                placeholder="UPI ID, Cheque No., Transaction ID..."
                value={formData.transaction_reference as string}
                onChange={handleChange}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Optional: UPI reference, cheque number, or transaction ID
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/payments/${id}`}>
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
