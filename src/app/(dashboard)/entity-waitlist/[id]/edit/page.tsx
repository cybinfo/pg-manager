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
import { DetailHero, DetailSection } from "@/components/ui"
import { Select, FormField } from "@/components/ui/form-components"
import { Users } from "lucide-react"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { LIBRARY_WAITLIST_STATUS_CONFIG, labelsToOptions } from "@/lib/status"
import { TIME_SLOT_OPTIONS } from "@/types/library.types"
import { WAITLIST_PRIORITY_OPTIONS } from "@/lib/constants/form-options"

const WAITLIST_STATUS_OPTIONS = labelsToOptions(
  Object.fromEntries(Object.entries(LIBRARY_WAITLIST_STATUS_CONFIG).map(([k, v]) => [k, v.label]))
)

const SLOT_OPTIONS = [
  { value: "", label: "No preference" },
  ...TIME_SLOT_OPTIONS,
]


export default function EditWaitlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="entity_waitlist.edit">
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
  const { backHref } = useBackNavigation({ defaultHref: "/entity-waitlist" })

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
    table: "entity_waitlist",
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
    redirectTo: `/entity-waitlist/${id}`,
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
      <DetailHero
        title="Edit Waitlist Entry"
        subtitle={entryName}
        backHref={backHref}
        backLabel="All Waitlist"
        icon={Users}
        breadcrumbs={[{ label: "Waitlist", href: "/entity-waitlist" }, { label: "Edit Waitlist Entry" }]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Entry Details" description="Update waitlist entry information" icon={Users}>
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
              <FormField label="Preferred Time Slot" htmlFor="preferred_slot">
                <Select
                  value={formData.preferred_slot as string}
                  onChange={handleChange}
                  name="preferred_slot"
                  disabled={saving}
                  options={SLOT_OPTIONS}
                />
              </FormField>
              <FormField label="Priority" htmlFor="priority">
                <Select
                  value={formData.priority as string}
                  onChange={handleChange}
                  name="priority"
                  disabled={saving}
                  options={WAITLIST_PRIORITY_OPTIONS}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="status">
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={WAITLIST_STATUS_OPTIONS}
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
          <Link href={`/entity-waitlist/${id}`}>
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
