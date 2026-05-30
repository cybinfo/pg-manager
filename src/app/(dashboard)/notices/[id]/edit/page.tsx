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
import { Select, FormField } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"
import { Megaphone } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { NOTICE_TYPE_OPTIONS, NOTICE_AUDIENCE_OPTIONS, BOOLEAN_STRING_OPTIONS } from "@/lib/status"
import { NOTICE_PRIORITY_OPTIONS } from "@/lib/constants/form-options"
import { PermissionGuard } from "@/components/auth"
import { DetailHero, DetailSection } from "@/components/ui"

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
    setField,
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
      <DetailHero
        title="Edit Notice"
        subtitle={(record?.title as string) || "Notice"}
        backHref={backHref}
        backLabel="All Notices"
        icon={Megaphone}
        breadcrumbs={[
          { label: "Notices", href: "/notices" },
          { label: "Edit Notice" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Notice Details" description="Update notice content and settings" icon={Megaphone}>
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
            <FormField label="Notice Type" htmlFor="type">
              <Select
                value={formData.type as string}
                onChange={handleChange}
                name="type"
                disabled={saving}
                options={NOTICE_TYPE_OPTIONS}
              />
            </FormField>
            <FormField label="Audience" htmlFor="target_audience">
              <Select
                value={formData.target_audience as string}
                onChange={handleChange}
                name="target_audience"
                disabled={saving}
                options={NOTICE_AUDIENCE_OPTIONS}
              />
            </FormField>
          </div>

          {/* Priority & Active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority" htmlFor="priority">
              <Select
                value={formData.priority as string}
                onChange={handleChange}
                name="priority"
                disabled={saving}
                options={NOTICE_PRIORITY_OPTIONS}
              />
            </FormField>
            <FormField label="Status" htmlFor="is_active">
              <Select
                value={formData.is_active as string}
                onChange={handleChange}
                name="is_active"
                disabled={saving}
                options={BOOLEAN_STRING_OPTIONS}
              />
            </FormField>
          </div>

          {/* Expiry Date */}
          <FormField label="Expires On" htmlFor="expires_at" hint="Leave empty for no expiry">
            <DatePicker
              id="expires_at"
              value={formData.expires_at as string}
              onChange={(val) => setField("expires_at", val)}
              disabled={saving}
              placeholder="No expiry"
            />
          </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/notices/${id}`}>
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
