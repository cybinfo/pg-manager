/**
 * Edit Notice Page
 *
 * Form to edit an existing notice record.
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
import { ArrowLeft, Megaphone, Loader2 } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { NOTICE_TYPE_LABELS, NOTICE_AUDIENCES } from "@/lib/status"
import { labelsToOptions } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

const NOTICE_TYPE_OPTIONS = labelsToOptions(NOTICE_TYPE_LABELS)
const NOTICE_AUDIENCE_OPTIONS = labelsToOptions(NOTICE_AUDIENCES)
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

export default function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="notices.edit">
      <EditNoticeContent params={params} />
    </PermissionGuard>
  )
}

function EditNoticeContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/notices" })

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
    table: "notices",
    id,
    initialData: {
      title: "",
      content: "",
      type: "general",
      target_audience: "all",
      priority: "normal",
      is_active: "true",
      expires_at: "",
    },
    redirectTo: `/notices/${id}`,
    successMessage: "Notice updated successfully!",
    errorMessage: "Failed to update notice",
    validationSchema: {
      title: requiredField("Title"),
      content: requiredField("Content"),
    },
    mapToForm: (rec) => ({
      title: (rec.title as string) || "",
      content: (rec.content as string) || "",
      type: (rec.type as string) || "general",
      target_audience: (rec.target_audience as string) || "all",
      priority: (rec.priority as string) || "normal",
      is_active: rec.is_active === false ? "false" : "true",
      expires_at: rec.expires_at ? (rec.expires_at as string).split("T")[0] : "",
    }),
    transform: (data): Record<string, unknown> => ({
      title: data.title,
      content: data.content,
      type: data.type,
      target_audience: data.target_audience,
      priority: data.priority,
      is_active: data.is_active === "true",
      expires_at: data.expires_at || null,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading notice..." />
  }

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
          <h1 className="text-3xl font-bold">Edit Notice</h1>
          <p className="text-muted-foreground">{(record?.title as string) || "Notice"}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Megaphone className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Notice Details</CardTitle>
                <CardDescription>Update notice content and settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <FormField label="Title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                name="title"
                placeholder="Notice title"
                value={formData.title as string}
                onChange={handleChange}
                onBlur={() => validateField("title")}
                disabled={saving}
              />
            </FormField>

            {/* Content */}
            <FormField label="Content" htmlFor="content" required error={errors.content}>
              <Textarea
                id="content"
                name="content"
                placeholder="Write your notice content here..."
                value={formData.content as string}
                onChange={handleChange}
                onBlur={() => validateField("content")}
                disabled={saving}
                rows={6}
              />
            </FormField>

            {/* Type & Audience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Notice Type</Label>
                <Select
                  value={formData.type as string}
                  onChange={handleChange}
                  name="type"
                  disabled={saving}
                  options={NOTICE_TYPE_OPTIONS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_audience">Audience</Label>
                <Select
                  value={formData.target_audience as string}
                  onChange={handleChange}
                  name="target_audience"
                  disabled={saving}
                  options={NOTICE_AUDIENCE_OPTIONS}
                />
              </div>
            </div>

            {/* Priority & Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active as string}
                  onChange={handleChange}
                  name="is_active"
                  disabled={saving}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expires_at">Expires On</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                value={formData.expires_at as string}
                onChange={handleChange}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiry
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/notices/${id}`}>
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
