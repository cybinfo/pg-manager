/**
 * Edit Library Waitlist Entry Page
 *
 * Form to edit waitlist entry details.
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
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Loader2 } from "lucide-react"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { LIBRARY_WAITLIST_STATUS_CONFIG, labelsToOptions } from "@/lib/status"
import { TIME_SLOTS } from "@/types/library.types"

const WAITLIST_STATUS_OPTIONS = labelsToOptions(
  Object.fromEntries(Object.entries(LIBRARY_WAITLIST_STATUS_CONFIG).map(([k, v]) => [k, v.label]))
)

const SLOT_OPTIONS = [
  { value: "", label: "No preference" },
  ...TIME_SLOTS.map((slot) => ({ value: slot.value, label: slot.label })),
]

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

export default function EditWaitlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_waitlist.edit">
      <EditWaitlistContent params={params} />
    </PermissionGuard>
  )
}

function EditWaitlistContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-waitlist" })

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
    table: "library_waitlist",
    id,
    initialData: {
      name: "",
      phone: "",
      email: "",
      preferred_slot: "",
      notes: "",
      status: "waiting",
      priority: "normal",
    },
    redirectTo: `/library-waitlist/${id}`,
    successMessage: "Waitlist entry updated successfully!",
    errorMessage: "Failed to update waitlist entry",
    validationSchema: {
      name: requiredField("Name"),
      phone: requiredField("Phone"),
    },
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      phone: (rec.phone as string) || "",
      email: (rec.email as string) || "",
      preferred_slot: (rec.preferred_slot as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "waiting",
      priority: (rec.priority as string) || "normal",
    }),
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      preferred_slot: data.preferred_slot || null,
      notes: data.notes || null,
      status: data.status,
      priority: data.priority || "normal",
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading waitlist entry..." />
  }

  const entryName = (record?.name as string) || "Waitlist Entry"

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
            Waitlist &rsaquo; {entryName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Waitlist Entry</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>Entry Details</CardTitle>
                <CardDescription>
                  Update waitlist entry information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField label="Name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder="Full name"
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Phone" htmlFor="phone" required error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="10-digit phone"
                  value={formData.phone as string}
                  onChange={handleChange}
                  onBlur={() => validateField("phone")}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_slot">Preferred Time Slot</Label>
                <Select
                  value={formData.preferred_slot as string}
                  onChange={handleChange}
                  name="preferred_slot"
                  disabled={saving}
                  options={SLOT_OPTIONS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority as string}
                  onChange={handleChange}
                  name="priority"
                  disabled={saving}
                  options={PRIORITY_OPTIONS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={WAITLIST_STATUS_OPTIONS}
              />
            </div>

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
          <Link href={`/library-waitlist/${id}`}>
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
