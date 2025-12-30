"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfilePhotoUpload } from "@/components/ui/file-upload"
import {
  ArrowLeft, Users, Loader2, Building2, Home, UserCheck, RefreshCw,
  Phone, Mail, MapPin, Plus, Trash2, Contact, FileText, Shield
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"
import { showDetailedError, debugLog } from "@/lib/error-utils"

// Shared form components
import {
  MultiEntryList,
  PhoneEntry, PhoneData, DEFAULT_PHONE,
  EmailEntry, EmailData, DEFAULT_EMAIL,
  AddressInput, AddressData, ADDRESS_TYPES,
  GuardianEntry, GuardianData, RELATION_TYPES, DEFAULT_GUARDIAN,
  IdDocumentEntry, IdDocumentData, ID_DOCUMENT_TYPES, DEFAULT_ID_DOCUMENT,
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

interface ReturningTenant {
  id: string
  name: string
  phone: string
  email: string | null
  last_property: string | null
  last_room: string | null
  exit_date: string | null
  total_stays: number
  custom_fields: Record<string, string>
}

// Extended address type with zip alias for pincode
interface TenantAddress extends Omit<AddressData, 'pincode'> {
  zip: string
  is_primary: boolean
}

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [returningTenant, setReturningTenant] = useState<ReturningTenant | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [isRejoining, setIsRejoining] = useState(false)

  // Basic form data
  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    name: "",
    check_in_date: new Date().toISOString().split("T")[0],
    monthly_rent: "",
    security_deposit: "",
    profile_photo: "",
    // Status & Verification
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
  })

  // Multiple entries using shared component types
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

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])

      if (propertiesRes.error) {
        console.error("Error fetching properties:", propertiesRes.error)
        toast.error("Failed to load properties")
      } else {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (roomsRes.error) {
        console.error("Error fetching rooms:", roomsRes.error)
      } else {
        setRooms(roomsRes.data || [])
      }

      setLoadingData(false)
    }

    fetchData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id && rooms.length > 0) {
      const filtered = rooms.filter(
        (room) =>
          room.property_id === formData.property_id &&
          room.occupied_beds < room.total_beds
      )
      setAvailableRooms(filtered)

      if (filtered.length > 0) {
        setFormData((prev) => ({
          ...prev,
          room_id: filtered[0].id,
          monthly_rent: filtered[0].rent_amount.toString(),
          security_deposit: filtered[0].deposit_amount.toString(),
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          room_id: "",
          monthly_rent: "",
          security_deposit: "",
        }))
      }
    }
  }, [formData.property_id, rooms])

  // Update rent when room changes
  useEffect(() => {
    if (formData.room_id) {
      const selectedRoom = rooms.find((r) => r.id === formData.room_id)
      if (selectedRoom) {
        setFormData((prev) => ({
          ...prev,
          monthly_rent: selectedRoom.rent_amount.toString(),
          security_deposit: selectedRoom.deposit_amount.toString(),
        }))
      }
    }
  }, [formData.room_id, rooms])

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
    // If setting as primary, unset others
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
      // Ensure at least one is primary
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

  // Check for returning tenant
  const checkReturningTenant = async (phone: string) => {
    if (phone.length < 10) {
      setReturningTenant(null)
      return
    }

    setCheckingPhone(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, name, phone, email, custom_fields, exit_date, total_stays,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("owner_id", user.id)
        .eq("phone", phone)
        .in("status", ["moved_out", "inactive"])
        .order("exit_date", { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        const tenant = data[0] as {
          id: string
          name: string
          phone: string
          email: string | null
          exit_date: string | null
          total_stays: number
          custom_fields: Record<string, string>
          property: { name: string }[] | { name: string } | null
          room: { room_number: string }[] | { room_number: string } | null
        }
        const propertyName = Array.isArray(tenant.property)
          ? tenant.property[0]?.name
          : (tenant.property as { name: string } | null)?.name
        const roomNumber = Array.isArray(tenant.room)
          ? tenant.room[0]?.room_number
          : (tenant.room as { room_number: string } | null)?.room_number
        setReturningTenant({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          email: tenant.email,
          last_property: propertyName || null,
          last_room: roomNumber || null,
          exit_date: tenant.exit_date,
          total_stays: tenant.total_stays || 1,
          custom_fields: tenant.custom_fields || {},
        })
      } else {
        setReturningTenant(null)
      }
    } catch (error) {
      console.error("Error checking returning tenant:", error)
    } finally {
      setCheckingPhone(false)
    }
  }

  // Handle phone input with debounce
  const handlePhoneChange = (index: number, value: string) => {
    updatePhone(index, "number", value)
    if (index === 0) {
      const timeoutId = setTimeout(() => {
        checkReturningTenant(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }

  // Pre-fill form with returning tenant data
  const handleRejoin = () => {
    if (!returningTenant) return

    setIsRejoining(true)
    setFormData((prev) => ({
      ...prev,
      name: returningTenant.name,
      id_proof_type: returningTenant.custom_fields?.id_proof_type || "",
      id_proof_number: returningTenant.custom_fields?.id_proof_number || "",
    }))

    // Set phone
    setPhones([{
      number: returningTenant.phone,
      type: "primary",
      is_primary: true,
      is_whatsapp: true
    }])

    // Set email if exists
    if (returningTenant.email) {
      setEmails([{ email: returningTenant.email, type: "primary", is_primary: true }])
    }

    // Set parent info if exists
    if (returningTenant.custom_fields?.parent_name || returningTenant.custom_fields?.parent_phone) {
      setGuardians([{
        name: returningTenant.custom_fields?.parent_name || "",
        relation: "Parent",
        phone: returningTenant.custom_fields?.parent_phone || "",
        email: "",
        is_primary: true
      }])
    }

    // Set address if exists
    if (returningTenant.custom_fields?.permanent_address) {
      setAddresses([{
        type: "Permanent",
        line1: returningTenant.custom_fields.permanent_address,
        line2: "", city: "", state: "", zip: "",
        is_primary: true
      }])
    }

    toast.success("Previous tenant data loaded!")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const primaryPhone = phones.find(p => p.is_primary)?.number || phones[0]?.number
    if (!formData.property_id || !formData.room_id || !formData.name || !primaryPhone || !formData.monthly_rent) {
      toast.error("Validation Error: Please fill in all required fields", {
        description: `Missing: ${[
          !formData.name && "Name",
          !primaryPhone && "Phone",
          !formData.property_id && "Property",
          !formData.room_id && "Room",
          !formData.monthly_rent && "Rent"
        ].filter(Boolean).join(", ")}`,
        duration: 8000,
      })
      return
    }

    setLoading(true)
    debugLog("Starting tenant creation", { name: formData.name, phone: primaryPhone })

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        showDetailedError(authError, {
          operation: "checking authentication",
          table: "auth.users"
        })
        return
      }

      if (!user) {
        toast.error("Authentication Error", {
          description: "No user session found. Please login again.\n\nThis usually happens when:\n- Session has expired\n- Cookies were cleared\n- You were logged out",
          duration: 10000,
        })
        router.push("/login")
        return
      }

      debugLog("User authenticated", { userId: user.id, email: user.email })

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

      const tenantData = {
        owner_id: user.id,
        property_id: formData.property_id,
        room_id: formData.room_id,
        name: formData.name,
        email: primaryEmail,
        phone: primaryPhone,
        check_in_date: formData.check_in_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
        profile_photo: formData.profile_photo || null,
        police_verification_status: formData.police_verification_status,
        agreement_signed: formData.agreement_signed,
        notes: formData.notes || null,
        // New JSONB fields
        phone_numbers: validPhones.length > 0 ? validPhones : null,
        emails: validEmails.length > 0 ? validEmails : null,
        addresses: validAddresses.length > 0 ? validAddresses : null,
        guardian_contacts: validGuardians.length > 0 ? validGuardians : null,
        // Re-joining fields
        is_returning: isRejoining,
        previous_tenant_id: isRejoining && returningTenant ? returningTenant.id : null,
        total_stays: isRejoining && returningTenant ? (returningTenant.total_stays + 1) : 1,
      }

      debugLog("Tenant data prepared", tenantData)

      // First, verify the property and room exist and belong to this owner
      const { data: propertyCheck, error: propertyError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("id", formData.property_id)
        .eq("owner_id", user.id)
        .single()

      if (propertyError || !propertyCheck) {
        showDetailedError(propertyError || { message: "Property not found or doesn't belong to you" }, {
          operation: "verifying property ownership",
          table: "properties",
          data: { property_id: formData.property_id, owner_id: user.id }
        })
        return
      }

      debugLog("Property verified", propertyCheck)

      const { data: roomCheck, error: roomError } = await supabase
        .from("rooms")
        .select("id, room_number, property_id, occupied_beds, total_beds")
        .eq("id", formData.room_id)
        .single()

      if (roomError || !roomCheck) {
        showDetailedError(roomError || { message: "Room not found" }, {
          operation: "verifying room",
          table: "rooms",
          data: { room_id: formData.room_id }
        })
        return
      }

      if (roomCheck.property_id !== formData.property_id) {
        toast.error("Room Mismatch Error", {
          description: `Room ${roomCheck.room_number} doesn't belong to the selected property.\n\nRoom's property_id: ${roomCheck.property_id}\nSelected property_id: ${formData.property_id}`,
          duration: 10000,
        })
        return
      }

      if (roomCheck.occupied_beds >= roomCheck.total_beds) {
        toast.error("Room Full Error", {
          description: `Room ${roomCheck.room_number} is already full.\n\nOccupied beds: ${roomCheck.occupied_beds}\nTotal beds: ${roomCheck.total_beds}`,
          duration: 10000,
        })
        return
      }

      debugLog("Room verified", roomCheck)

      // Now insert the tenant
      const { data: newTenant, error } = await supabase
        .from("tenants")
        .insert(tenantData)
        .select()
        .single()

      if (error) {
        showDetailedError(error, {
          operation: "creating tenant",
          table: "tenants",
          data: tenantData
        })
        return
      }

      debugLog("Tenant created successfully", newTenant)

      // Save ID documents with uploaded files
      if (newTenant) {
        const validIdDocs = idDocuments.filter(d => d.number.trim() || d.file_urls.length > 0)
        if (validIdDocs.length > 0) {
          debugLog("Saving ID documents", validIdDocs)

          const docInserts = validIdDocs.map(doc => ({
            tenant_id: newTenant.id,
            document_type: doc.type.toLowerCase().replace(/\s+/g, "_"),
            document_number: doc.number || null,
            document_name: doc.type,
            file_urls: doc.file_urls.length > 0 ? doc.file_urls : null,
            verified: false,
          }))

          const { error: docError } = await supabase.from("tenant_documents").insert(docInserts)
          if (docError) {
            console.warn("Warning: Failed to save ID documents:", docError)
            // Don't fail the whole operation, just warn
          } else {
            debugLog("ID documents saved successfully", docInserts.length)
          }
        }
      }

      // Create tenant stay record
      if (newTenant) {
        const stayData = {
          owner_id: user.id,
          tenant_id: newTenant.id,
          property_id: formData.property_id,
          room_id: formData.room_id,
          join_date: formData.check_in_date,
          monthly_rent: parseFloat(formData.monthly_rent),
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: "active",
          stay_number: isRejoining && returningTenant ? (returningTenant.total_stays + 1) : 1,
        }

        debugLog("Creating tenant stay record", stayData)

        const { error: stayError } = await supabase.from("tenant_stays").insert(stayData)

        if (stayError) {
          // Show warning but don't fail
          toast.warning("Tenant created but stay record failed", {
            description: `Tenant was added successfully, but stay record failed.\n\nError: ${stayError.message}\nCode: ${stayError.code || "N/A"}\n\nThis is not critical - tenant is still created.`,
            duration: 10000,
          })
          console.error("Error creating tenant stay:", stayError)
        } else {
          debugLog("Tenant stay created successfully", null)
        }
      }

      toast.success("Tenant added successfully!", {
        description: `${formData.name} has been added to Room ${roomCheck.room_number}`,
      })
      router.push("/dashboard/tenants")
    } catch (error) {
      showDetailedError(error, {
        operation: "creating tenant (unexpected error)",
        table: "tenants"
      })
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

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tenants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Add Tenant</h1>
            <p className="text-muted-foreground">Register a new tenant</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property and rooms before adding tenants
            </p>
            <Link href="/dashboard/properties/new">
              <Button>Add Property First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Tenant</h1>
          <p className="text-muted-foreground">Register a new tenant</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info with Photo */}
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

            {/* Returning Tenant Banner */}
            {returningTenant && !isRejoining && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">Returning Tenant Found!</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      <strong>{returningTenant.name}</strong> was previously at{" "}
                      <strong>{returningTenant.last_property}</strong> (Room {returningTenant.last_room})
                      {returningTenant.exit_date && (
                        <> until {new Date(returningTenant.exit_date).toLocaleDateString("en-IN")}</>
                      )}.
                      This would be stay #{returningTenant.total_stays + 1}.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={handleRejoin}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Use Previous Details
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isRejoining && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  Re-joining tenant - Stay #{returningTenant?.total_stays ? returningTenant.total_stays + 1 : 2}
                </span>
              </div>
            )}
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
                  <div className="flex-1 relative">
                    <Input
                      type="tel"
                      placeholder="e.g., 9876543210"
                      value={phone.number}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      disabled={loading}
                    />
                    {index === 0 && checkingPhone && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
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
                <CardDescription>Assign tenant to a room</CardDescription>
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
                <Label htmlFor="monthly_rent">Monthly Rent *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="monthly_rent"
                    name="monthly_rent"
                    type="number"
                    min="0"
                    placeholder="e.g., 8000"
                    className="pl-8"
                    value={formData.monthly_rent}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_deposit">Security Deposit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="security_deposit"
                    name="security_deposit"
                    type="number"
                    min="0"
                    placeholder="e.g., 16000"
                    className="pl-8"
                    value={formData.security_deposit}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
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
              <IdDocumentEntry
                key={index}
                value={doc}
                onChange={(field, value) => updateIdDocument(index, field, value)}
                onRemove={idDocuments.length > 1 ? () => removeIdDocument(index) : undefined}
                onRemoveFile={(fileIdx) => removeDocumentFile(index, fileIdx)}
                showRemove={idDocuments.length > 1}
                disabled={loading}
              />
            ))}
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
          <Link href="/dashboard/tenants">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || availableRooms.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Tenant"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
