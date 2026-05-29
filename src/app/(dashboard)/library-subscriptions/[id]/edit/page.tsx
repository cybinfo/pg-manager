/**
 * Edit Library Subscription Page
 *
 * Form to edit subscription details like dates, amount, time slot, and status.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getNowISO } from "@/lib/date-helpers"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, FormField } from "@/components/ui/form-components"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { requiredDate, requiredAmount } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { LIBRARY_MEMBERSHIP_STATUS_CONFIG, labelsToOptions } from "@/lib/status"
import { TIME_SLOT_OPTIONS } from "@/types/library.types"

const MEMBERSHIP_STATUS_OPTIONS = labelsToOptions(
  Object.fromEntries(Object.entries(LIBRARY_MEMBERSHIP_STATUS_CONFIG).map(([k, v]) => [k, v.label]))
)

const SLOT_OPTIONS = [
  { value: "", label: "No specific slot" },
  ...TIME_SLOT_OPTIONS,
]

export default function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_members.edit">
      <EditSubscriptionContent params={params} />
    </PermissionGuard>
  )
}

function EditSubscriptionContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-subscriptions" })

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
    validateField,
    setField,
  } = useFormEditPage({
    table: "library_memberships",
    id,
    initialData: {
      start_date: "",
      end_date: "",
      amount: "",
      discount_amount: "",
      time_slot: "",
      status: "active",
      notes: "",
    },
    redirectTo: `/library-subscriptions/${id}`,
    successMessage: "Subscription updated successfully!",
    errorMessage: "Failed to update subscription",
    validationSchema: {
      start_date: requiredDate("Start date"),
      end_date: requiredDate("End date"),
      amount: requiredAmount("Amount"),
    },
    mapToForm: (rec) => ({
      start_date: (rec.start_date as string) || "",
      end_date: (rec.end_date as string) || "",
      amount: rec.amount?.toString() || "",
      discount_amount: rec.discount_amount?.toString() || "0",
      time_slot: (rec.time_slot as string) || "",
      status: (rec.status as string) || "active",
      notes: (rec.notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => {
      const amount = Number(data.amount)
      const discount = Number(data.discount_amount) || 0
      return {
        start_date: data.start_date,
        end_date: data.end_date,
        amount,
        discount_amount: discount,
        final_amount: amount - discount,
        time_slot: data.time_slot || null,
        status: data.status,
        notes: data.notes || null,
        updated_at: getNowISO(),
      }
    },
  })

  if (loading) {
    return <PageLoading message="Loading subscription..." />
  }

  const planName = (record?.plan_name as string) || "Subscription"

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
          <p className="text-sm text-muted-foreground">
            Subscriptions &rsaquo; {planName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Subscription</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>
                  Update subscription period and payment information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="start_date" required error={errors.start_date}>
                <DatePicker
                  id="start_date"
                  value={formData.start_date as string}
                  onChange={(val) => { setField("start_date", val); validateField("start_date") }}
                  disabled={saving}
                />
              </FormField>
              <FormField label="End Date" htmlFor="end_date" required error={errors.end_date}>
                <DatePicker
                  id="end_date"
                  value={formData.end_date as string}
                  onChange={(val) => { setField("end_date", val); validateField("end_date") }}
                  disabled={saving}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <FormField label="Discount (Rs.)" htmlFor="discount_amount">
                <Input
                  id="discount_amount"
                  name="discount_amount"
                  type="number"
                  placeholder="0"
                  value={formData.discount_amount as string}
                  onChange={handleChange}
                  disabled={saving}
                  min={0}
                  step="0.01"
                />
              </FormField>
            </div>

            {/* Final amount display */}
            {formData.amount && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Final Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency((Number(formData.amount) - (Number(formData.discount_amount) || 0)))}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Time Slot" htmlFor="time_slot">
                <Select
                  value={formData.time_slot as string}
                  onChange={handleChange}
                  name="time_slot"
                  disabled={saving}
                  options={SLOT_OPTIONS}
                />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select
                  value={formData.status as string}
                  onChange={handleChange}
                  name="status"
                  disabled={saving}
                  options={MEMBERSHIP_STATUS_OPTIONS}
                />
              </FormField>
            </div>

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
          <Link href={`/library-subscriptions/${id}`}>
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
