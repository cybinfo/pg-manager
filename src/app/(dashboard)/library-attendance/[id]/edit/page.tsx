/**
 * Edit Library Attendance Page
 *
 * Form to edit attendance record times and notes.
 * Automatically recalculates hours_spent when check-out time changes.
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Clock, Loader2 } from "lucide-react"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"

/**
 * Convert an ISO datetime to a datetime-local input value (YYYY-MM-DDTHH:MM)
 */
function toDatetimeLocal(isoStr: string | null): string {
  if (!isoStr) return ""
  try {
    const date = new Date(isoStr)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return ""
  }
}

/**
 * Calculate hours between two datetime-local strings
 */
function calcHours(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null
  const inTime = new Date(checkIn).getTime()
  const outTime = new Date(checkOut).getTime()
  if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) return null
  return Math.round(((outTime - inTime) / (1000 * 60 * 60)) * 100) / 100
}

export default function EditAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_attendance.edit">
      <EditAttendanceContent params={params} />
    </PermissionGuard>
  )
}

function EditAttendanceContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-attendance" })

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
    table: "library_attendance",
    id,
    initialData: {
      check_in_time: "",
      check_out_time: "",
      notes: "",
    },
    redirectTo: `/library-attendance/${id}`,
    successMessage: "Attendance record updated successfully!",
    errorMessage: "Failed to update attendance record",
    validationSchema: {
      check_in_time: requiredField("Check-in time"),
    },
    mapToForm: (rec) => ({
      check_in_time: toDatetimeLocal(rec.check_in_time as string),
      check_out_time: toDatetimeLocal(rec.check_out_time as string | null),
      notes: (rec.notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => {
      const checkIn = data.check_in_time ? new Date(data.check_in_time as string).toISOString() : null
      const checkOut = data.check_out_time ? new Date(data.check_out_time as string).toISOString() : null
      const hoursSpent = calcHours(data.check_in_time as string, data.check_out_time as string)

      return {
        check_in_time: checkIn,
        check_out_time: checkOut,
        hours_spent: hoursSpent,
        notes: data.notes || null,
        updated_at: getNowISO(),
      }
    },
  })

  if (loading) {
    return <PageLoading message="Loading attendance record..." />
  }

  const memberName = (record?.member as { name?: string })?.name || "Attendance"
  const computedHours = calcHours(formData.check_in_time as string, formData.check_out_time as string)

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
            Attendance &rsaquo; {memberName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Attendance</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Attendance Details</CardTitle>
                <CardDescription>
                  Update check-in/check-out times. Hours are recalculated automatically.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Check-in Time" htmlFor="check_in_time" required error={errors.check_in_time}>
                <Input
                  id="check_in_time"
                  name="check_in_time"
                  type="datetime-local"
                  value={formData.check_in_time as string}
                  onChange={handleChange}
                  onBlur={() => validateField("check_in_time")}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Check-out Time" htmlFor="check_out_time">
                <Input
                  id="check_out_time"
                  name="check_out_time"
                  type="datetime-local"
                  value={formData.check_out_time as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Computed hours display */}
            {computedHours !== null && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Calculated Duration:</span>
                  <span className="font-semibold">{computedHours.toFixed(2)} hours</span>
                </div>
              </div>
            )}

            {formData.check_out_time && computedHours === null && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">
                  Check-out time must be after check-in time.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this attendance..."
                value={formData.notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-attendance/${id}`}>
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
