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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/complaints/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Complaint</h1>
          <p className="text-muted-foreground">{(record?.title as string) || "Complaint"}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>Complaint Details</CardTitle>
                <CardDescription>Update complaint information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the issue in detail..."
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
                rows={4}
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category as string}
                  onChange={handleChange}
                  name="category"
                  disabled={saving}
                  options={CATEGORY_OPTIONS}
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={STATUS_OPTIONS}
              />
            </div>

            {/* Resolution Notes */}
            <div className="space-y-2">
              <Label htmlFor="resolution_notes">Resolution Notes</Label>
              <Textarea
                id="resolution_notes"
                name="resolution_notes"
                placeholder="Notes about how this was resolved..."
                value={formData.resolution_notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/complaints/${id}`}>
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
