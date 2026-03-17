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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Loader2 } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { VISITOR_TYPE_LABELS } from "@/types/visitors.types"
import { PermissionGuard } from "@/components/auth"

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/visitors/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Visitor</h1>
          <p className="text-muted-foreground">{visitorName}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Visit Details</CardTitle>
                <CardDescription>Update visitor and visit information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visitor Type */}
            <div className="space-y-2">
              <Label htmlFor="visitor_type">Visitor Type</Label>
              <Select
                value={formData.visitor_type as string}
                onChange={handleChange}
                name="visitor_type"
                disabled={saving}
                options={VISITOR_TYPE_OPTIONS}
              />
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                name="purpose"
                placeholder="Purpose of visit"
                value={formData.purpose as string}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            {/* Check-in & Check-out */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check-in Time</Label>
                <Input
                  id="check_in_time"
                  name="check_in_time"
                  type="datetime-local"
                  value={formData.check_in_time as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check-out Time</Label>
                <Input
                  id="check_out_time"
                  name="check_out_time"
                  type="datetime-local"
                  value={formData.check_out_time as string}
                  onChange={handleChange}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if still checked in
                </p>
              </div>
            </div>

            {/* Notes */}
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
          <Link href={`/visitors/${id}`}>
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
