/**
 * Edit Library Member Page
 *
 * Form to edit member personal details.
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
import { requiredField, requiredPhone } from "@/lib/validation"
import { ArrowLeft, Users, Loader2 } from "lucide-react"
import { ProfilePhotoUpload } from "@/components/ui/file-upload"
import { PageLoading } from "@/components/ui/loading"
import { TIME_SLOTS } from "@/types/library.types"
import { transformJoin } from "@/lib/supabase/transforms"
import { PermissionGuard } from "@/components/auth"
import { logger } from "@/lib/logger"

export default function EditLibraryMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_members.edit">
      <EditLibraryMemberContent params={params} />
    </PermissionGuard>
  )
}

function EditLibraryMemberContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-members" })

  const {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
  } = useFormEditPage({
    table: "library_members",
    id,
    select: "*, library:libraries(id, name), person:people(id, name, photo_url)",
    initialData: {
      name: "",
      phone: "",
      email: "",
      photo_url: "",
      id_proof_type: "aadhar",
      id_proof_number: "",
      preferred_slot: "Morning",
      left_date: "",
      notes: "",
      status: "active",
    },
    redirectTo: `/library-members/${id}`,
    successMessage: "Member updated successfully!",
    errorMessage: "Failed to update member",
    mapToForm: (rec) => {
      const person = transformJoin(rec.person as Record<string, unknown>) as Record<string, unknown> | null
      return {
      name: (rec.name as string) || "",
      phone: (rec.phone as string) || "",
      email: (rec.email as string) || "",
      photo_url: (person?.photo_url as string) || "",
      id_proof_type: (rec.id_proof_type as string) || "aadhar",
      id_proof_number: (rec.id_proof_number as string) || "",
      preferred_slot: (rec.preferred_slot as string) || "Morning",
      left_date: (rec.left_date as string) || "",
      notes: (rec.notes as string) || "",
      status: (rec.status as string) || "active",
    }},
    validationSchema: {
      name: requiredField("Full Name"),
      phone: requiredPhone("Phone Number"),
    },
    customSubmit: async (data, userId, recordId, supabase) => {
      // Update library_members (denormalized copy)
      const memberUpdate: Record<string, unknown> = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        id_proof_type: data.id_proof_type || null,
        id_proof_number: data.id_proof_number || null,
        preferred_slot: data.preferred_slot || null,
        left_date: data.left_date || null,
        notes: data.notes || null,
        status: data.status,
        updated_at: getNowISO(),
      }

      const { error: memberError } = await supabase
        .from("library_members")
        .update(memberUpdate)
        .eq("id", recordId)

      if (memberError) {
        throw new Error(memberError.message)
      }

      // Also update the people record (single source of truth) if person_id exists
      const personId = record?.person_id as string | null
      if (personId) {
        const personUpdate: Record<string, unknown> = {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          photo_url: data.photo_url || null,
          updated_at: getNowISO(),
        }

        const { error: personError } = await supabase
          .from("people")
          .update(personUpdate)
          .eq("id", personId)

        if (personError) {
          // Log but don't fail — the member record was already updated
          logger.error("Failed to update people record:", { detail: personError.message })
        }
      }
    },
  })

  // Get library name from record for display
  const library = record ? transformJoin(record.library as Record<string, unknown>) as Record<string, unknown> | null : null
  const memberCode = record?.member_code as string

  if (loading) {
    return <PageLoading message="Loading member..." />
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
          <h1 className="text-3xl font-bold">Edit Member</h1>
          <p className="text-muted-foreground">
            {memberCode} • {library?.name as string}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Member Details</CardTitle>
                <CardDescription>
                  Update member information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload */}
            <div className="flex justify-center">
              <ProfilePhotoUpload
                bucket="person-photos"
                folder="profiles"
                value={(formData.photo_url as string) || ""}
                onChange={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                size="lg"
                placeholder="Update Photo"
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Rahul Sharma"
                  value={formData.name as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </FormField>
              <FormField label="Phone Number" required error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="e.g., 9876543210"
                  value={formData.phone as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  type="tel"
                  maxLength={10}
                />
              </FormField>
            </div>

            <FormField label="Email">
              <Input
                id="email"
                name="email"
                placeholder="e.g., rahul@example.com"
                value={formData.email as string}
                onChange={handleChange}
                disabled={saving}
                type="email"
              />
            </FormField>

            {/* ID Proof */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="ID Proof Type" htmlFor="id_proof_type">
                <Select
                  value={formData.id_proof_type as string}
                  onChange={handleChange}
                  name="id_proof_type"
                  disabled={saving}
                  options={[
                    { value: "aadhar", label: "Aadhaar Card" },
                    { value: "pan", label: "PAN Card" },
                    { value: "student_id", label: "Student ID" },
                    { value: "voter_id", label: "Voter ID" },
                    { value: "driving_license", label: "Driving License" },
                  ]}
                />
              </FormField>
              <FormField label="ID Number">
                <Input
                  id="id_proof_number"
                  name="id_proof_number"
                  placeholder="e.g., XXXX-XXXX-XXXX"
                  value={formData.id_proof_number as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Preferred Time Slot" htmlFor="preferred_slot">
                <Select
                  value={formData.preferred_slot as string}
                  onChange={handleChange}
                  name="preferred_slot"
                  disabled={saving}
                  options={TIME_SLOTS.map((slot) => ({
                    value: slot.value,
                    label: slot.label,
                  }))}
                />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select
                  value={formData.status as string}
                  onChange={handleChange}
                  name="status"
                  disabled={saving}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "suspended", label: "Suspended" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
              </FormField>
            </div>

            {/* Left Date */}
            <FormField label="Left Date" hint="Set when member explicitly leaves. Clear when they renew.">
              <Input
                id="left_date"
                name="left_date"
                type="date"
                value={formData.left_date as string}
                onChange={handleChange}
                disabled={saving}
              />
            </FormField>

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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-members/${id}`}>
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
