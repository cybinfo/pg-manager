/**
 * Add New Person Page
 *
 * Form to create a new person in the central registry
 * Uses single-column layout with DetailSection for consistency
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  DetailSection,
} from "@/components/ui/detail-components"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Heart,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/auth"
import { Select } from "@/components/ui/form-components"
import {
  PersonFormData,
  EmergencyContact,
  Gender,
  GENDER_LABELS,
  BLOOD_GROUPS,
  INDIAN_STATES,
  RELATIONS,
} from "@/types/people.types"
import { validateIndianMobile, validateAadhaar, validatePAN } from "@/lib/validators"

export default function NewPersonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonFormData>({
    name: "",
    phone: "",
    email: "",
    tags: [],
    emergency_contacts: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (field: keyof PersonFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: [
        ...(prev.emergency_contacts || []),
        { name: "", phone: "", relation: "" },
      ],
    }))
  }

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setFormData((prev) => {
      const contacts = [...(prev.emergency_contacts || [])]
      contacts[index] = { ...contacts[index], [field]: value }
      return { ...prev, emergency_contacts: contacts }
    })
  }

  const removeEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: (prev.emergency_contacts || []).filter((_, i) => i !== index),
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required"
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number"
    }

    if (formData.aadhaar_number && !validateAadhaar(formData.aadhaar_number)) {
      newErrors.aadhaar_number = "Enter a valid 12-digit Aadhaar number"
    }

    if (formData.pan_number && !validatePAN(formData.pan_number)) {
      newErrors.pan_number = "Enter a valid PAN (e.g., ABCDE1234F)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Check for duplicate phone
    if (formData.phone) {
      const { data: existing } = await supabase
        .from("people")
        .select("id, name")
        .eq("phone", formData.phone)
        .single()

      if (existing) {
        toast.error(`A person with this phone already exists: ${existing.name}`)
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase
      .from("people")
      .insert({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        aadhaar_number: formData.aadhaar_number || null,
        pan_number: formData.pan_number || null,
        permanent_address: formData.permanent_address || null,
        permanent_city: formData.permanent_city || null,
        permanent_state: formData.permanent_state || null,
        permanent_pincode: formData.permanent_pincode || null,
        current_address: formData.current_address || null,
        current_city: formData.current_city || null,
        occupation: formData.occupation || null,
        company_name: formData.company_name || null,
        designation: formData.designation || null,
        blood_group: formData.blood_group || null,
        emergency_contacts: formData.emergency_contacts || [],
        tags: formData.tags || [],
        notes: formData.notes || null,
        source: "manual",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating person:", error)
      toast.error("Failed to create person")
      setLoading(false)
      return
    }

    toast.success("Person added successfully")
    router.push(`/people/${data.id}`)
  }

  return (
    <PermissionGuard permission="tenants.create">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Hero Header */}
        <DetailHero
          title="Add New Person"
          subtitle="Add a new person to the central directory"
          backHref="/people"
          backLabel="All People"
          avatar={
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="h-8 w-8 text-primary" />
            </div>
          }
        />

        {/* Basic Information */}
        <DetailSection
          title="Basic Information"
          description="Personal identity details"
          icon={User}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                />
              </div>
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onChange={(e) => updateField("gender", e.target.value as Gender)}
                  options={[
                    { value: "", label: "Select gender" },
                    ...Object.entries(GENDER_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select
                value={formData.blood_group || ""}
                onChange={(e) => updateField("blood_group", e.target.value)}
                options={[
                  { value: "", label: "Select blood group" },
                  ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
                ]}
              />
            </div>
          </div>
        </DetailSection>

        {/* ID Documents */}
        <DetailSection
          title="ID Documents"
          description="Identity verification documents"
          icon={CreditCard}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input
                id="aadhaar"
                value={formData.aadhaar_number}
                onChange={(e) => updateField("aadhaar_number", e.target.value)}
                placeholder="12-digit Aadhaar number"
                className={errors.aadhaar_number ? "border-red-500" : ""}
              />
              {errors.aadhaar_number && (
                <p className="text-sm text-red-500">{errors.aadhaar_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number</Label>
              <Input
                id="pan"
                value={formData.pan_number}
                onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className={errors.pan_number ? "border-red-500" : ""}
              />
              {errors.pan_number && (
                <p className="text-sm text-red-500">{errors.pan_number}</p>
              )}
            </div>
          </div>
        </DetailSection>

        {/* Professional Info */}
        <DetailSection
          title="Professional Info"
          description="Work and occupation details"
          icon={Building2}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
                placeholder="e.g., Software Engineer, Student"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company / Institution</Label>
                <Input
                  id="company"
                  value={formData.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="Company or institution"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  placeholder="Job title or role"
                />
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.permanent_address}
                onChange={(e) => updateField("permanent_address", e.target.value)}
                placeholder="Street address, landmark"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.permanent_city}
                  onChange={(e) => updateField("permanent_city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.permanent_pincode}
                  onChange={(e) => updateField("permanent_pincode", e.target.value)}
                  placeholder="6-digit pincode"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.permanent_state || ""}
                onChange={(e) => updateField("permanent_state", e.target.value)}
                options={[
                  { value: "", label: "Select state" },
                  ...INDIAN_STATES.map((state) => ({ value: state, label: state })),
                ]}
              />
            </div>
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
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                            placeholder="Contact name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Relation</Label>
                          <Select
                            value={contact.relation}
                            onChange={(e) => updateEmergencyContact(index, "relation", e.target.value)}
                            options={[
                              { value: "", label: "Select relation" },
                              ...RELATIONS.map((rel) => ({ value: rel, label: rel })),
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmergencyContact(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No emergency contacts added. Click "Add Contact" to add one.
            </p>
          )}
        </DetailSection>

        {/* Notes */}
        <DetailSection
          title="Additional Notes"
          description="Any other important information"
          icon={User}
        >
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Any additional information about this person..."
              rows={3}
            />
          </div>
        </DetailSection>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/people">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Person
              </>
            )}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  )
}
