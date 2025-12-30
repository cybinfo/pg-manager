"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfilePhotoUpload, FileUpload } from "@/components/ui/file-upload"
import { ArrowLeft, Users, Loader2, Building2, Home, Shield, FileText, Phone, Mail, MapPin, Contact, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

// Shared form components and types
import {
  PhoneData, DEFAULT_PHONE,
  EmailData, DEFAULT_EMAIL,
  AddressData, ADDRESS_TYPES,
  GuardianData, RELATION_TYPES, DEFAULT_GUARDIAN,
  IdDocumentData, ID_DOCUMENT_TYPES, DEFAULT_ID_DOCUMENT,
} from "@/components/forms"

interface Property {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  property_id: string
}

// Extended address type with zip alias for pincode (tenant uses zip)
interface TenantAddress extends Omit<AddressData, 'pincode'> {
  zip: string
  is_primary: boolean
}

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  property_id: string
  room_id: string
  check_in_date: string
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, string>
  profile_photo: string | null
  phone_numbers: PhoneData[] | null
  emails: EmailData[] | null
  addresses: TenantAddress[] | null
  guardian_contacts: GuardianData[] | null
}

export default function EditTenantPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [originalRoomId, setOriginalRoomId] = useState<string>("")

  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    name: "",
    check_in_date: "",
    monthly_rent: "",
    security_deposit: "",
    status: "active",
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
    profile_photo: "",
  })

  // Multiple entries state using shared types
  const [phones, setPhones] = useState<PhoneData[]>([{ ...DEFAULT_PHONE }])
  const [emails, setEmails] = useState<EmailData[]>([{ ...DEFAULT_EMAIL }])
  const [addresses, setAddresses] = useState<TenantAddress[]>([{
    type: "Permanent", line1: "", line2: "", city: "", state: "", zip: "", is_primary: true
  }])
  const [guardians, setGuardians] = useState<GuardianData[]>([{ ...DEFAULT_GUARDIAN }])
  const [idDocuments, setIdDocuments] = useState<IdDocumentData[]>([{ ...DEFAULT_ID_DOCUMENT }])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch tenant, properties, and rooms in parallel
      const [tenantRes, propertiesRes, roomsRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", params.id).single(),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])

      if (tenantRes.error || !tenantRes.data) {
        console.error("Error fetching tenant:", tenantRes.error)
        toast.error("Tenant not found")
        router.push("/dashboard/tenants")
        return
      }

      const tenant = tenantRes.data as Tenant
      setOriginalRoomId(tenant.room_id)

      setFormData({
        property_id: tenant.property_id,
        room_id: tenant.room_id,
        name: tenant.name,
        check_in_date: tenant.check_in_date,
        monthly_rent: tenant.monthly_rent.toString(),
        security_deposit: (tenant.security_deposit || 0).toString(),
        status: tenant.status,
        police_verification_status: tenant.police_verification_status || "pending",
        agreement_signed: tenant.agreement_signed || false,
        notes: tenant.notes || "",
        profile_photo: tenant.profile_photo || "",
      })

      // Load phone numbers (from new JSONB field or legacy single phone)
      if (tenant.phone_numbers && tenant.phone_numbers.length > 0) {
        setPhones(tenant.phone_numbers)
      } else if (tenant.phone) {
        setPhones([{ number: tenant.phone, type: "primary", is_primary: true, is_whatsapp: true }])
      }

      // Load emails (from new JSONB field or legacy single email)
      if (tenant.emails && tenant.emails.length > 0) {
        setEmails(tenant.emails)
      } else if (tenant.email) {
        setEmails([{ email: tenant.email, type: "primary", is_primary: true }])
      }

      // Load addresses (from new JSONB field or legacy custom_fields)
      if (tenant.addresses && tenant.addresses.length > 0) {
        setAddresses(tenant.addresses)
      } else if (tenant.custom_fields?.permanent_address) {
        setAddresses([{
          type: "Permanent",
          line1: tenant.custom_fields.permanent_address,
          line2: "", city: "", state: "", zip: "",
          is_primary: true
        }])
      }

      // Load guardian contacts (from new JSONB field or legacy custom_fields)
      if (tenant.guardian_contacts && tenant.guardian_contacts.length > 0) {
        setGuardians(tenant.guardian_contacts)
      } else if (tenant.custom_fields?.parent_name || tenant.custom_fields?.parent_phone) {
        setGuardians([{
          name: tenant.custom_fields?.parent_name || "",
          relation: "Parent",
          phone: tenant.custom_fields?.parent_phone || "",
          email: "",
          is_primary: true
        }])
      }

      // Load ID document from custom_fields (legacy support)
      if (tenant.custom_fields?.id_proof_type || tenant.custom_fields?.id_proof_number) {
        setIdDocuments([{
          type: tenant.custom_fields?.id_proof_type || "Aadhaar",
          number: tenant.custom_fields?.id_proof_number || "",
          file_urls: []
        }])
      }

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
      }

      if (!roomsRes.error) {
        setRooms(roomsRes.data || [])
      }

      setLoadingData(false)
    }

    fetchData()
  }, [params.id, router])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id && rooms.length > 0) {
      const filtered = rooms.filter(
        (room) =>
          room.property_id === formData.property_id &&
          (room.occupied_beds < room.total_beds || room.id === originalRoomId)
      )
      setAvailableRooms(filtered)
    }
  }, [formData.property_id, rooms, originalRoomId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  // Phone handlers
  const updatePhone = (index: number, field: keyof PhoneData, value: string | boolean) => {
    const updated = [...phones]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "is_primary" && value === true) {
      updated.forEach((p, i) => { if (i !== index) p.is_primary = false })
    }
    setPhones(updated)
  }

  const addPhone = () => {
    setPhones([...phones, { ...DEFAULT_PHONE, is_primary: false }])
  }

  const removePhone = (index: number) => {
    if (phones.length > 1) {
      const updated = phones.filter((_, i) => i !== index)
      if (!updated.some(p => p.is_primary) && updated.length > 0) {
        updated[0].is_primary = true
      }
      setPhones(updated)
    }
  }

  // Email handlers
  const updateEmail = (index: number, field: keyof EmailData, value: string | boolean) => {
    const updated = [...emails]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "is_primary" && value === true) {
      updated.forEach((e, i) => { if (i !== index) e.is_primary = false })
    }
    setEmails(updated)
  }

  const addEmail = () => {
    setEmails([...emails, { ...DEFAULT_EMAIL, is_primary: false }])
  }

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      const updated = emails.filter((_, i) => i !== index)
      if (!updated.some(e => e.is_primary) && updated.length > 0) {
        updated[0].is_primary = true
      }
      setEmails(updated)
    }
  }

  // Address handlers
  const updateAddress = (index: number, field: keyof TenantAddress, value: string | boolean) => {
    const updated = [...addresses]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "is_primary" && value === true) {
      updated.forEach((a, i) => { if (i !== index) a.is_primary = false })
    }
    setAddresses(updated)
  }

  const addAddress = () => {
    setAddresses([...addresses, {
      type: "Current", line1: "", line2: "", city: "", state: "", zip: "", is_primary: false
    }])
  }

  const removeAddress = (index: number) => {
    if (addresses.length > 1) {
      const updated = addresses.filter((_, i) => i !== index)
      if (!updated.some(a => a.is_primary) && updated.length > 0) {
        updated[0].is_primary = true
      }
      setAddresses(updated)
    }
  }

  // Guardian handlers
  const updateGuardian = (index: number, field: keyof GuardianData, value: string | boolean) => {
    const updated = [...guardians]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "is_primary" && value === true) {
      updated.forEach((g, i) => { if (i !== index) g.is_primary = false })
    }
    setGuardians(updated)
  }

  const addGuardian = () => {
    setGuardians([...guardians, { ...DEFAULT_GUARDIAN, is_primary: false }])
  }

  const removeGuardian = (index: number) => {
    if (guardians.length > 1) {
      const updated = guardians.filter((_, i) => i !== index)
      if (!updated.some(g => g.is_primary) && updated.length > 0) {
        updated[0].is_primary = true
      }
      setGuardians(updated)
    }
  }

  // ID Document handlers
  const updateIdDocument = (index: number, field: keyof IdDocumentData, value: string | string[]) => {
    const updated = [...idDocuments]
    updated[index] = { ...updated[index], [field]: value }
    setIdDocuments(updated)
  }

  const addIdDocument = () => {
    setIdDocuments([...idDocuments, { ...DEFAULT_ID_DOCUMENT, type: "PAN Card" }])
  }

  const removeIdDocument = (index: number) => {
    if (idDocuments.length > 1) {
      setIdDocuments(idDocuments.filter((_, i) => i !== index))
    }
  }

  const removeDocumentFile = (docIndex: number, fileIndex: number) => {
    const updated = [...idDocuments]
    updated[docIndex] = {
      ...updated[docIndex],
      file_urls: updated[docIndex].file_urls.filter((_, i) => i !== fileIndex)
    }
    setIdDocuments(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const primaryPhone = phones.find(p => p.is_primary)?.number || phones[0]?.number
    if (!formData.property_id || !formData.room_id || !formData.name || !primaryPhone || !formData.monthly_rent) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Build custom fields for backwards compatibility
      const customFields: Record<string, string> = {}
      const primaryGuardian = guardians.find(g => g.is_primary) || guardians[0]
      if (primaryGuardian?.name) customFields.parent_name = primaryGuardian.name
      if (primaryGuardian?.phone) customFields.parent_phone = primaryGuardian.phone
      const primaryAddress = addresses.find(a => a.is_primary) || addresses[0]
      if (primaryAddress?.line1) customFields.permanent_address = [primaryAddress.line1, primaryAddress.line2, primaryAddress.city, primaryAddress.state, primaryAddress.zip].filter(Boolean).join(", ")

      // Use first ID document for backwards compatibility
      const primaryIdDoc = idDocuments.find(d => d.number.trim()) || idDocuments[0]
      if (primaryIdDoc?.type) customFields.id_proof_type = primaryIdDoc.type
      if (primaryIdDoc?.number) customFields.id_proof_number = primaryIdDoc.number

      // Filter out empty entries
      const validPhones = phones.filter(p => p.number.trim())
      const validEmails = emails.filter(e => e.email.trim())
      const validAddresses = addresses.filter(a => a.line1.trim())
      const validGuardians = guardians.filter(g => g.name.trim() || g.phone.trim())

      // Get primary values for legacy fields
      const primaryEmail = validEmails.find(e => e.is_primary)?.email || validEmails[0]?.email || null

      const { error } = await supabase
        .from("tenants")
        .update({
          property_id: formData.property_id,
          room_id: formData.room_id,
          name: formData.name,
          email: primaryEmail,
          phone: primaryPhone,
          check_in_date: formData.check_in_date,
          monthly_rent: parseFloat(formData.monthly_rent),
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: formData.status,
          police_verification_status: formData.police_verification_status,
          agreement_signed: formData.agreement_signed,
          notes: formData.notes || null,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
          profile_photo: formData.profile_photo || null,
          // New JSONB fields
          phone_numbers: validPhones.length > 0 ? validPhones : null,
          emails: validEmails.length > 0 ? validEmails : null,
          addresses: validAddresses.length > 0 ? validAddresses : null,
          guardian_contacts: validGuardians.length > 0 ? validGuardians : null,
        })
        .eq("id", params.id)

      if (error) {
        console.error("Error updating tenant:", error)
        throw error
      }

      toast.success("Tenant updated successfully!")
      router.push(`/dashboard/tenants/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update tenant. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/tenants/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Tenant</h1>
          <p className="text-muted-foreground">Update tenant details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info with Profile Photo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Tenant&apos;s personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <ProfilePhotoUpload
                  bucket="tenant-photos"
                  folder="profiles"
                  value={formData.profile_photo}
                  onChange={(url) => setFormData(prev => ({ ...prev, profile_photo: url }))}
                  size="lg"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Phone numbers and email addresses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone Numbers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Numbers *
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={addPhone}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Phone
                </Button>
              </div>
              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <Input
                    type="tel"
                    placeholder="e.g., 9876543210"
                    value={phone.number}
                    onChange={(e) => updatePhone(index, "number", e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={phone.is_whatsapp}
                      onChange={(e) => updatePhone(index, "is_whatsapp", e.target.checked)}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input
                      type="radio"
                      name="primaryPhone"
                      checked={phone.is_primary}
                      onChange={() => updatePhone(index, "is_primary", true)}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    Primary
                  </label>
                  {phones.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Email Addresses */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Addresses
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={addEmail}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Email
                </Button>
              </div>
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <Input
                    type="email"
                    placeholder="e.g., tenant@example.com"
                    value={email.email}
                    onChange={(e) => updateEmail(index, "email", e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input
                      type="radio"
                      name="primaryEmail"
                      checked={email.is_primary}
                      onChange={() => updateEmail(index, "is_primary", true)}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    Primary
                  </label>
                  {emails.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Guardian/Parent Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Contact className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Guardian/Parent Contacts</CardTitle>
                <CardDescription>Emergency contacts and guardians</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Label>Guardians</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addGuardian}>
                <Plus className="h-4 w-4 mr-1" />
                Add Guardian
              </Button>
            </div>
            {guardians.map((guardian, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={guardian.relation}
                    onChange={(e) => updateGuardian(index, "relation", e.target.value)}
                    className="h-10 px-3 rounded-md border bg-background text-sm"
                    disabled={loading}
                  >
                    {RELATION_TYPES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Name"
                    value={guardian.name}
                    onChange={(e) => updateGuardian(index, "name", e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input
                      type="radio"
                      name="primaryGuardian"
                      checked={guardian.is_primary}
                      onChange={() => updateGuardian(index, "is_primary", true)}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    Primary
                  </label>
                  {guardians.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeGuardian(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={guardian.phone}
                    onChange={(e) => updateGuardian(index, "phone", e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={guardian.email}
                    onChange={(e) => updateGuardian(index, "email", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Addresses</CardTitle>
                <CardDescription>Permanent and other addresses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Label>Address List</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addAddress}>
                <Plus className="h-4 w-4 mr-1" />
                Add Address
              </Button>
            </div>
            {addresses.map((address, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={address.type}
                    onChange={(e) => updateAddress(index, "type", e.target.value)}
                    className="h-10 px-3 rounded-md border bg-background text-sm"
                    disabled={loading}
                  >
                    {ADDRESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap ml-auto">
                    <input
                      type="radio"
                      name="primaryAddress"
                      checked={address.is_primary}
                      onChange={() => updateAddress(index, "is_primary", true)}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    Primary
                  </label>
                  {addresses.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Address Line 1"
                  value={address.line1}
                  onChange={(e) => updateAddress(index, "line1", e.target.value)}
                  disabled={loading}
                />
                <Input
                  placeholder="Address Line 2 (optional)"
                  value={address.line2}
                  onChange={(e) => updateAddress(index, "line2", e.target.value)}
                  disabled={loading}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => updateAddress(index, "city", e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    placeholder="State"
                    value={address.state}
                    onChange={(e) => updateAddress(index, "state", e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    placeholder="PIN Code"
                    value={address.zip}
                    onChange={(e) => updateAddress(index, "zip", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Room Assignment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Room Assignment</CardTitle>
                <CardDescription>Current accommodation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">Property *</Label>
                <select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading}
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_id">Room *</Label>
                <select
                  id="room_id"
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading || availableRooms.length === 0}
                >
                  {availableRooms.length === 0 ? (
                    <option value="">No available rooms</option>
                  ) : (
                    availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} ({room.occupied_beds}/{room.total_beds} beds)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_in_date">Check-in Date *</Label>
              <Input
                id="check_in_date"
                name="check_in_date"
                type="date"
                value={formData.check_in_date}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">Monthly Rent (₹) *</Label>
                <Input
                  id="monthly_rent"
                  name="monthly_rent"
                  type="number"
                  min="0"
                  placeholder="e.g., 8000"
                  value={formData.monthly_rent}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
                <Input
                  id="security_deposit"
                  name="security_deposit"
                  type="number"
                  min="0"
                  placeholder="e.g., 16000"
                  value={formData.security_deposit}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Verification */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Status & Verification</CardTitle>
                <CardDescription>Tenant status and documents</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="notice_period">Notice Period</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="police_verification_status">Police Verification</Label>
                <select
                  id="police_verification_status"
                  name="police_verification_status"
                  value={formData.police_verification_status}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading}
                >
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="na">N/A</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="agreement_signed"
                name="agreement_signed"
                type="checkbox"
                checked={formData.agreement_signed}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="agreement_signed" className="font-normal cursor-pointer">
                Agreement signed
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* ID Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>ID Documents</CardTitle>
                <CardDescription>Identity proofs and documents</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Label>Documents</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addIdDocument}>
                <Plus className="h-4 w-4 mr-1" />
                Add Document
              </Button>
            </div>
            {idDocuments.map((doc, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={doc.type}
                    onChange={(e) => updateIdDocument(index, "type", e.target.value)}
                    className="h-10 px-3 rounded-md border bg-background text-sm"
                    disabled={loading}
                  >
                    {ID_DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Document Number (e.g., XXXX-XXXX-XXXX)"
                    value={doc.number}
                    onChange={(e) => updateIdDocument(index, "number", e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  {idDocuments.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeIdDocument(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Upload Document (optional)</Label>
                  <FileUpload
                    bucket="tenant-documents"
                    folder={`id-docs/${doc.type.toLowerCase().replace(/ /g, "-")}`}
                    value={doc.file_urls}
                    onChange={(urls) => {
                      const urlArr = Array.isArray(urls) ? urls : urls ? [urls] : []
                      updateIdDocument(index, "file_urls", urlArr.slice(0, 5))
                    }}
                    multiple
                    accept="image/*,.pdf"
                  />
                  {doc.file_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {doc.file_urls.map((url, fileIdx) => (
                        <div key={fileIdx} className="relative group">
                          {url.toLowerCase().endsWith(".pdf") ? (
                            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`${doc.type} ${fileIdx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeDocumentFile(index, fileIdx)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any other important information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about the tenant..."
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/tenants/${params.id}`}>
            <Button type="button" variant="outline" disabled={loading}>
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
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
