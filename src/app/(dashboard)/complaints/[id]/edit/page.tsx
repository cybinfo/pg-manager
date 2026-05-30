/**
 * Edit Complaint Page
 *
 * Form to edit an existing complaint record.
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
import { AlertTriangle } from "lucide-react"
import { DetailHero, DetailSection } from "@/components/ui"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, COMPLAINT_PRIORITY, labelsToOptions } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

const CATEGORY_OPTIONS = labelsToOptions(COMPLAINT_CATEGORIES)

const STATUS_OPTIONS = Object.entries(COMPLAINT_STATUS).map(([value, config]) => ({
  value,
  label: config.label,
}))

const PRIORITY_OPTIONS = Object.entries(COMPLAINT_PRIORITY).map(([value, config]) => ({
  value,
  label: config.label,
}))

export default function EditComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="complaints.edit">
      <EditComplaintContent params={params} />
    </PermissionGuard>
  )
}

function EditComplaintContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/complaints" })

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
    table: "complaints",
    id,
    initialData: {
      title: "",
      description: "",
      category: "other",
      priority: "medium",
      status: "open",
      resolution_notes: "",
    },
    redirectTo: `/complaints/${id}`,
    successMessage: "Complaint updated successfully!",
    errorMessage: "Failed to update complaint",
    validationSchema: {
      title: requiredField("Title"),
    },
    mapToForm: (rec) => ({
      title: (rec.title as string) || "",
      description: (rec.description as string) || "",
      category: (rec.category as string) || "other",
      priority: (rec.priority as string) || "medium",
      status: (rec.status as string) || "open",
      resolution_notes: (rec.resolution_notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => {
      const result: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        category: data.category,
        priority: data.priority,
        status: data.status,
        resolution_notes: data.resolution_notes || null,
        updated_at: getNowISO(),
      }

      // If marking as resolved, set resolved_at
      if (data.status === "resolved") {
        result.resolved_at = getNowISO()
      }

      return result
    },
  })

  if (loading) {
    return <PageLoading message="Loading complaint..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Complaint"
        subtitle={(record?.title as string) || "Complaint"}
        backHref={backHref}
        backLabel="All Complaints"
        icon={AlertTriangle}
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: "Edit Complaint" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Complaint Details" description="Update complaint information" icon={AlertTriangle}>
            {/* Title */}
            <FormField label="Title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                name="title"
                placeholder="Complaint title"
                value={formData.title as string}
                onChange={handleChange}
                onBlur={() => validateField("title")}
                disabled={saving}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the issue in detail..."
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
                rows={4}
              />
            </FormField>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="category">
                <Select
                  value={formData.category as string}
                  onChange={handleChange}
                  name="category"
                  disabled={saving}
                  options={CATEGORY_OPTIONS}
                />
              </FormField>
              <FormField label="Priority" htmlFor="priority">
                <Select
                  value={formData.priority as string}
                  onChange={handleChange}
                  name="priority"
                  disabled={saving}
                  options={PRIORITY_OPTIONS}
                />
              </FormField>
            </div>

            {/* Status */}
            <FormField label="Status" htmlFor="status">
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={STATUS_OPTIONS}
              />
            </FormField>

            {/* Resolution Notes */}
            <FormField label="Resolution Notes" htmlFor="resolution_notes">
              <Textarea
                id="resolution_notes"
                name="resolution_notes"
                placeholder="Notes about how this was resolved..."
                value={formData.resolution_notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/complaints/${id}`}>
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
