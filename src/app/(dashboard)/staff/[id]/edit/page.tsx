/**
 * Edit Staff Member Page
 *
 * Form to edit basic information of a staff member.
 * Role assignment is handled separately on the detail page.
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
import { ArrowLeft, User, Loader2 } from "lucide-react"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { BOOLEAN_STRING_OPTIONS } from "@/lib/status"

export default function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="staff.edit">
      <EditStaffContent params={params} />
    </PermissionGuard>
  )
}

function EditStaffContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/staff" })

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
    table: "staff_members",
    id,
    initialData: {
      name: "",
      phone: "",
      email: "",
      designation: "",
      is_active: "true",
      notes: "",
    },
    redirectTo: `/staff/${id}`,
    successMessage: "Staff member updated successfully!",
    errorMessage: "Failed to update staff member",
    validationSchema: {
      name: requiredField("Name"),
      email: requiredField("Email"),
    },
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      phone: (rec.phone as string) || "",
      email: (rec.email as string) || "",
      designation: (rec.designation as string) || "",
      is_active: String(rec.is_active ?? true),
      notes: (rec.notes as string) || "",
    }),
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      phone: data.phone || null,
      email: data.email,
      designation: data.designation || null,
      is_active: data.is_active === "true",
      notes: data.notes || null,
      updated_at: getNowISO(),
    }),
  })

  if (loading) {
    return <PageLoading message="Loading staff member..." />
  }

  const staffName = (record?.name as string) || "Staff Member"

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
            Staff &rsaquo; {staffName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Staff Member</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Update staff member details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField label="Full Name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder="Staff member name"
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email" htmlFor="email" required error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email as string}
                  onChange={handleChange}
                  onBlur={() => validateField("email")}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="10-digit phone"
                  value={formData.phone as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Designation" htmlFor="designation">
                <Input
                  id="designation"
                  name="designation"
                  placeholder="e.g., Manager, Receptionist"
                  value={formData.designation as string}
                  onChange={handleChange}
                  disabled={saving}
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/staff/${id}`}>
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
