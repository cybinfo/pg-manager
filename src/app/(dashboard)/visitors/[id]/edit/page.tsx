/**
 * Edit Visitor Page
 *
 * Form to edit an existing visitor record.
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
import { Users } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { PageLoading } from "@/components/ui/loading"
import { VISITOR_TYPE_LABELS } from "@/types/visitors.types"
import { PermissionGuard } from "@/components/auth"
import { DetailHero, DetailSection } from "@/components/ui"

const VISITOR_TYPE_OPTIONS = Object.entries(VISITOR_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function EditVisitorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="visitors.edit">
      <EditVisitorContent params={params} />
    </PermissionGuard>
  )
}

function EditVisitorContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/visitors" })

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
  } = useFormEditPage({
    table: "visitors",
    id,
    initialData: {
      purpose: "",
      visitor_type: "general",
      check_in_time: "",
      check_out_time: "",
      notes: "",
    },
    redirectTo: `/visitors/${id}`,
    successMessage: "Visitor updated successfully!",
    errorMessage: "Failed to update visitor",
    mapToForm: (rec) => ({
      purpose: (rec.purpose as string) || "",
      visitor_type: (rec.visitor_type as string) || "general",
      check_in_time: rec.check_in_time
        ? (rec.check_in_time as string).slice(0, 16)
        : "",
      check_out_time: rec.check_out_time
        ? (rec.check_out_time as string).slice(0, 16)
        : "",
      notes: (rec.notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => ({
      purpose: data.purpose || null,
      visitor_type: data.visitor_type,
      check_in_time: data.check_in_time || null,
      check_out_time: data.check_out_time || null,
      notes: data.notes || null,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading visitor..." />
  }

  const visitorName = (record?.visitor_name as string) || "Visitor"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Visitor"
        subtitle={visitorName}
        backHref={backHref}
        backLabel="All Visitors"
        icon={Users}
        breadcrumbs={[
          { label: "Visitors", href: "/visitors" },
          { label: "Edit Visitor" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Visit Details" description="Update visitor and visit information" icon={Users}>
          {/* Visitor Type */}
          <FormField label="Visitor Type">
            <Select
              value={formData.visitor_type as string}
              onChange={handleChange}
              name="visitor_type"
              disabled={saving}
              options={VISITOR_TYPE_OPTIONS}
            />
          </FormField>

          {/* Purpose */}
          <FormField label="Purpose">
            <Input
              id="purpose"
              name="purpose"
              placeholder="Purpose of visit"
              value={formData.purpose as string}
              onChange={handleChange}
              disabled={saving}
            />
          </FormField>

          {/* Check-in & Check-out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Check-in Time">
              <Input
                id="check_in_time"
                name="check_in_time"
                type="datetime-local"
                value={formData.check_in_time as string}
                onChange={handleChange}
                disabled={saving}
              />
            </FormField>
            <FormField label="Check-out Time" hint="Leave empty if still checked in">
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

          {/* Notes */}
          <FormField label="Notes">
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
          <Link href={`/visitors/${id}`}>
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
