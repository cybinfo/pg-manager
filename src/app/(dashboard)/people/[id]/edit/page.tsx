"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  DetailSection,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import { ProfilePhotoUpload } from "@/components/ui/file-upload"
import {
  User,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Heart,
  Camera,
} from "lucide-react"
import { PermissionGuard } from "@/components/auth"
import { FormField, Select, EmailInput } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"
import { Gender } from "@/types/people.types"
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  INDIAN_STATE_OPTIONS,
  RELATION_OPTIONS,
} from "@/lib/constants/form-options"
import { IdDocumentEntry } from "@/components/forms"
import { usePeopleEditForm } from "@/lib/hooks/forms/usePeopleEditForm"

export default function EditPersonPage() {
  return (
    <PermissionGuard permission="tenants.update">
      <EditPersonContent />
    </PermissionGuard>
  )
}

function EditPersonContent() {
  const {
    params,
    pageLoading,
    loading,
    formData,
    errors,
    idDocuments,
    backHref,
    backLabel,
    updateField,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    updateIdDocument,
    addIdDocument,
    removeIdDocument,
    removeDocumentFile,
    handleSubmit,
  } = usePeopleEditForm()

  if (pageLoading) {
    return <PageLoading message="Loading person details..." />
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Hero Header */}
        <DetailHero
          title="Edit Person"
          subtitle={`Update details for ${formData.name}`}
          backHref={backHref}
          backLabel={backLabel}
          breadcrumbs={[{ label: "People", href: "/people" }, { label: "Edit Person" }]}
          avatar={
            <Avatar
              name={formData.name || "P"}
              src={formData.photo_url}
              size="lg"
              className="h-14 w-14 text-xl"
              clickable
            />
          }
        />

        {/* Profile Photo */}
        <DetailSection
          title="Profile Photo"
          description="Upload or update the photo for this person"
          icon={Camera}
        >
          <div className="flex justify-center">
            <ProfilePhotoUpload
              bucket="person-photos"
              folder="profiles"
              value={formData.photo_url || ""}
              onChange={(url) => updateField("photo_url", url)}
              size="lg"
            />
          </div>
        </DetailSection>

        {/* Basic Information */}
        <DetailSection
          title="Basic Information"
          description="Personal identity details"
          icon={User}
        >
          <div className="space-y-4">
            <FormField label="Full Name" required error={errors.name}>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter full name"
              />
            </FormField>

            <FormField label="Mobile Number" error={errors.phone}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  className="pl-10"
                />
              </div>
            </FormField>

            <FormField label="Email">
              <EmailInput
                id="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="email@example.com"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date of Birth">
                <DatePicker
                  id="dob"
                  value={formData.date_of_birth}
                  onChange={(val) => updateField("date_of_birth", val)}
                />
              </FormField>
              <FormField label="Gender">
                <Select
                  value={formData.gender || ""}
                  onChange={(e) => updateField("gender", e.target.value as Gender)}
                  options={GENDER_OPTIONS}
                />
              </FormField>
            </div>

            <FormField label="Blood Group">
              <Select
                value={formData.blood_group || ""}
                onChange={(e) => updateField("blood_group", e.target.value)}
                options={BLOOD_GROUP_OPTIONS}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* ID Documents */}
        <DetailSection
          title="ID Documents"
          description="Identity verification documents with file uploads"
          icon={CreditCard}
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addIdDocument}>
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          }
        >
          <div className="space-y-4">
            {idDocuments.map((doc, index) => (
              <div key={index}>
                <IdDocumentEntry
                  value={doc}
                  onChange={(field, value) => updateIdDocument(index, field, value)}
                  onRemove={idDocuments.length > 1 ? () => removeIdDocument(index) : undefined}
                  onRemoveFile={(fileIdx) => removeDocumentFile(index, fileIdx)}
                  showRemove={idDocuments.length > 1}
                  disabled={loading}
                />
                {errors[`id_doc_${index}`] && (
                  <p className="text-sm text-destructive mt-1">{errors[`id_doc_${index}`]}</p>
                )}
              </div>
            ))}
          </div>
        </DetailSection>

        {/* Professional Info */}
        <DetailSection
          title="Professional Info"
          description="Work and occupation details"
          icon={Building2}
        >
          <div className="space-y-4">
            <FormField label="Occupation">
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
                placeholder="e.g., Software Engineer, Student"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Company / Institution">
                <Input
                  id="company"
                  value={formData.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="Company or institution"
                />
              </FormField>
              <FormField label="Designation">
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  placeholder="Job title or role"
                />
              </FormField>
            </div>
          </div>
        </DetailSection>

        {/* Permanent Address */}
        <DetailSection
          title="Permanent Address"
          description="Home address details"
          icon={MapPin}
        >
          <div className="space-y-4">
            <FormField label="Address">
              <Textarea
                id="address"
                value={formData.permanent_address}
                onChange={(e) => updateField("permanent_address", e.target.value)}
                placeholder="Street address, landmark"
                rows={2}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="City">
                <Input
                  id="city"
                  value={formData.permanent_city}
                  onChange={(e) => updateField("permanent_city", e.target.value)}
                  placeholder="City"
                />
              </FormField>
              <FormField label="Pincode">
                <Input
                  id="pincode"
                  value={formData.permanent_pincode}
                  onChange={(e) => updateField("permanent_pincode", e.target.value)}
                  placeholder="6-digit pincode"
                />
              </FormField>
            </div>

            <FormField label="State">
              <Select
                value={formData.permanent_state || ""}
                onChange={(e) => updateField("permanent_state", e.target.value)}
                options={INDIAN_STATE_OPTIONS}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Current Address */}
        <DetailSection
          title="Current Address"
          description="Present living address (if different)"
          icon={MapPin}
        >
          <div className="space-y-4">
            <FormField label="Address">
              <Textarea
                id="current_address"
                value={formData.current_address}
                onChange={(e) => updateField("current_address", e.target.value)}
                placeholder="Street address, landmark"
                rows={2}
              />
            </FormField>

            <FormField label="City">
              <Input
                id="current_city"
                value={formData.current_city}
                onChange={(e) => updateField("current_city", e.target.value)}
                placeholder="City"
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Emergency Contacts */}
        <DetailSection
          title="Emergency Contacts"
          description="People to contact in emergencies"
          icon={Heart}
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addEmergencyContact}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          }
        >
          {formData.emergency_contacts && formData.emergency_contacts.length > 0 ? (
            <div className="space-y-4">
              {formData.emergency_contacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField label="Name">
                          <Input
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                            placeholder="Contact name"
                          />
                        </FormField>
                        <FormField label="Phone">
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </FormField>
                        <FormField label="Relation">
                          <Select
                            value={contact.relation}
                            onChange={(e) => updateEmergencyContact(index, "relation", e.target.value)}
                            options={RELATION_OPTIONS}
                          />
                        </FormField>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmergencyContact(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No emergency contacts added. Click &quot;Add Contact&quot; to add one.
            </p>
          )}
        </DetailSection>

        {/* Notes */}
        <DetailSection
          title="Additional Notes"
          description="Any other important information"
          icon={User}
        >
          <FormField label="Notes">
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Any additional information about this person..."
              rows={3}
            />
          </FormField>
        </DetailSection>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <Link href={`/people/${params.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
  )
}
