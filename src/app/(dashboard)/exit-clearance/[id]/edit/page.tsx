/**
 * Edit Exit Clearance Page
 *
 * Form to edit settlement details of an exit clearance record.
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
import { ArrowLeft, DoorOpen, Loader2 } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredDate } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { labelsToOptions, EXIT_CLEARANCE_STATUS } from "@/lib/status"

const SETTLEMENT_STATUS_OPTIONS = labelsToOptions(
  Object.fromEntries(Object.entries(EXIT_CLEARANCE_STATUS).map(([k, v]) => [k, v.label]))
)

export default function EditExitClearancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="exit_clearance.edit">
      <EditExitClearanceContent params={params} />
    </PermissionGuard>
  )
}

function EditExitClearanceContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/exit-clearance" })

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
    table: "exit_clearance",
    id,
    initialData: {
      settlement_status: "initiated",
      settlement_amount: "",
      clearance_date: "",
      room_condition_notes: "",
    },
    redirectTo: `/exit-clearance/${id}`,
    successMessage: "Exit clearance updated successfully!",
    errorMessage: "Failed to update exit clearance",
    validationSchema: {
      clearance_date: requiredDate("Clearance date"),
    },
    mapToForm: (rec) => ({
      settlement_status: (rec.settlement_status as string) || "initiated",
      settlement_amount: rec.final_amount?.toString() || "",
      clearance_date: (rec.actual_exit_date as string) || "",
      room_condition_notes: (rec.room_condition_notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => ({
      settlement_status: data.settlement_status,
      final_amount: data.settlement_amount ? Number(data.settlement_amount) : null,
      actual_exit_date: data.clearance_date || null,
      room_condition_notes: data.room_condition_notes || null,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading exit clearance..." />
  }

  const tenantName = (record?.tenant as { name?: string })?.name || "Exit Clearance"

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
            Exit Clearance &rsaquo; {tenantName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Exit Clearance</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DoorOpen className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>Settlement Details</CardTitle>
                <CardDescription>
                  Update settlement and clearance information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Settlement Status" htmlFor="settlement_status">
                <Select
                  value={formData.settlement_status as string}
                  onChange={handleChange}
                  name="settlement_status"
                  disabled={saving}
                  options={SETTLEMENT_STATUS_OPTIONS}
                />
              </FormField>
              <FormField label="Settlement Amount (Rs.)" htmlFor="settlement_amount">
                <Input
                  id="settlement_amount"
                  name="settlement_amount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.settlement_amount as string}
                  onChange={handleChange}
                  disabled={saving}
                  step="0.01"
                />
              </FormField>
            </div>

            <FormField label="Clearance Date" htmlFor="clearance_date" required error={errors.clearance_date}>
              <DatePicker
                id="clearance_date"
                value={formData.clearance_date as string}
                onChange={(val) => setField("clearance_date", val)}
                disabled={saving}
              />
            </FormField>

            <FormField label="Room Condition Notes" htmlFor="room_condition_notes">
              <Textarea
                id="room_condition_notes"
                name="room_condition_notes"
                placeholder="Any damages, condition notes..."
                value={formData.room_condition_notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={4}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/exit-clearance/${id}`}>
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
