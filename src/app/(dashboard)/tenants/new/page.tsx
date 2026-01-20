"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft, Users, Loader2, Building2, Home, UserCheck, RefreshCw,
  Plus, Trash2, FileText, Shield, ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"
import { showDetailedError, debugLog } from "@/lib/error-utils"
import { PageLoader } from "@/components/ui/page-loader"
import { sendInvitationEmail } from "@/lib/email"
import { createTenant as createTenantWorkflow, TenantCreateInput } from "@/lib/workflows/tenant.workflow"
import { PersonSelector } from "@/components/people"
import { PersonSearchResult } from "@/types/people.types"

// Shared form components
import {
  IdDocumentEntry, IdDocumentData, DEFAULT_ID_DOCUMENT,
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

export default function NewTenantPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personIdFromUrl = searchParams.get("person_id")
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Person-centric: Select person first, then add tenant-specific data
  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)

  // Basic form data - tenancy-specific only
  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    name: "",
    check_in_date: new Date().toISOString().split("T")[0],
    monthly_rent: "",
    security_deposit: "",
    // Status & Verification
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
  })

  // ID Documents (tenant-specific for police verification)
  const [idDocuments, setIdDocuments] = useState<IdDocumentData[]>([{ ...DEFAULT_ID_DOCUMENT }])

  // Refresh rooms data from database
  const refreshRooms = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("rooms").select("*").order("room_number")
    if (error) {
      console.error("Error refreshing rooms:", error)
      toast.error("Failed to refresh rooms")
    } else {
      setRooms(data || [])
      toast.success("Rooms refreshed")
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Get current user ID for PersonSelector
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setOwnerId(user.id)
      }

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

  // Load person from URL query param
  useEffect(() => {
    const loadPersonFromUrl = async () => {
      if (!personIdFromUrl || selectedPerson) return

      const supabase = createClient()
      const { data } = await supabase
        .from("people")
        .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
        .eq("id", personIdFromUrl)
        .single()

      if (data && !data.is_blocked) {
        handlePersonSelect(data)
      } else if (data?.is_blocked) {
        toast.error("This person is blocked and cannot be added as a tenant")
      }
    }

    loadPersonFromUrl()
  }, [personIdFromUrl])

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

  // Handle person selection from PersonSelector
  const handlePersonSelect = (person: PersonSearchResult | null) => {
    setSelectedPerson(person)
    if (person) {
      // Pre-fill form with person name only - contact info comes from person record
      setFormData((prev) => ({
        ...prev,
        name: person.name,
      }))
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

    // Person selection is required - get data from selected person
    if (!selectedPerson) {
      toast.error("Please select a person", {
        description: "Select an existing person or create a new one first",
      })
      return
    }

    // Validate required fields
    if (!formData.property_id || !formData.room_id || !formData.monthly_rent) {
      toast.error("Validation Error: Please fill in all required fields", {
        description: `Missing: ${[
          !formData.property_id && "Property",
          !formData.room_id && "Room",
          !formData.monthly_rent && "Rent"
        ].filter(Boolean).join(", ")}`,
        duration: 8000,
      })
      return
    }

    setLoading(true)
    debugLog("Starting tenant creation", { name: selectedPerson.name, phone: selectedPerson.phone })

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

      // Build workflow input - person-centric (personal data comes from person record)
      const workflowInput: TenantCreateInput = {
        // Person-centric: Link to person record
        person_id: selectedPerson.id,
        // Use person data from the selected person (workflow will fetch from person record if person_id provided)
        name: selectedPerson.name,
        email: selectedPerson.email || undefined,
        phone: selectedPerson.phone || "",
        photo_url: selectedPerson.photo_url || undefined,
        profile_photo: selectedPerson.photo_url || undefined,
        // Tenancy-specific data
        property_id: formData.property_id,
        room_id: formData.room_id,
        check_in_date: formData.check_in_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        // ID documents for police verification (tenancy-specific)
        id_documents: idDocuments
          .filter(d => d.number.trim() || d.file_urls.length > 0)
          .map(d => ({
            type: d.type,
            number: d.number,
            file_urls: d.file_urls,
          })),
        generate_initial_bill: false, // Let owner manually create first bill
        send_welcome_notification: !!selectedPerson.email,
        send_invitation: false, // We handle invitation separately below
      }

      debugLog("Calling tenant workflow", workflowInput)

      // Execute the workflow
      const workflowResult = await createTenantWorkflow(
        workflowInput,
        user.id,
        "owner",
        user.id // workspace_id is same as owner_id
      )

      if (!workflowResult.success) {
        const errorMsg = workflowResult.errors?.[0]?.message || "Workflow failed"
        showDetailedError(
          { message: errorMsg },
          {
            operation: "creating tenant via workflow",
            table: "tenants",
            data: workflowInput as unknown as Record<string, unknown>
          }
        )
        return
      }

      const newTenantId = workflowResult.data?.tenant_id
      if (!newTenantId) {
        toast.error("Tenant creation failed", {
          description: "No tenant ID returned from workflow",
        })
        return
      }

      debugLog("Tenant created via workflow", { tenant_id: newTenantId })

      // Update tenant with status & verification fields
      await supabase
        .from("tenants")
        .update({
          police_verification_status: formData.police_verification_status,
          agreement_signed: formData.agreement_signed,
          notes: formData.notes || null,
        })
        .eq("id", newTenantId)

      // Create a reference object for the rest of the code
      const newTenant = { id: newTenantId }

      // Step: Auto-link to existing user or create invitation for tenant portal access
      if (newTenant.id) {
        // Check if email exists as a user
        let existingUserId: string | null = null
        const primaryEmail = selectedPerson.email

        if (primaryEmail) {
          const { data: existingProfile } = await supabase
            .from("user_profiles")
            .select("user_id, name")
            .eq("email", primaryEmail.toLowerCase())
            .single()

          if (existingProfile?.user_id) {
            existingUserId = existingProfile.user_id
          }
        }

        // Get owner's workspace
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id, name")
          .eq("owner_user_id", user.id)
          .single()

        if (existingUserId && workspace) {
          // User exists - link tenant and create context
          await supabase
            .from("tenants")
            .update({ user_id: existingUserId })
            .eq("id", newTenant.id)

          const { error: contextError } = await supabase
            .from("user_contexts")
            .insert({
              user_id: existingUserId,
              workspace_id: workspace.id,
              context_type: "tenant",
              entity_id: newTenant.id,
              is_active: true,
              is_default: false,
              invited_by: user.id,
              invited_at: new Date().toISOString(),
              accepted_at: new Date().toISOString(),
            })

          if (!contextError) {
            debugLog("Tenant linked to existing user", { existingUserId })
          }
        } else if (workspace && primaryEmail) {
          // User doesn't exist - create invitation for tenant portal
          const { data: invitation, error: inviteError } = await supabase
            .from("invitations")
            .insert({
              workspace_id: workspace.id,
              invited_by: user.id,
              email: primaryEmail,
              phone: selectedPerson.phone || null,
              name: selectedPerson.name,
              context_type: "tenant",
              entity_id: newTenant.id,
              status: "pending",
              message: `You've been added as a tenant at ${workspace.name}. Sign up to access your tenant portal.`,
            })
            .select("id, token")
            .single()

          if (!inviteError && invitation) {
            debugLog("Invitation created for tenant", { email: primaryEmail, invitationId: invitation.id })

            // Get inviter's name for the email
            const { data: inviterProfile } = await supabase
              .from("user_profiles")
              .select("name")
              .eq("user_id", user.id)
              .single()

            const inviterName = inviterProfile?.name || "Property Owner"

            // Send invitation email
            const signupUrl = `${window.location.origin}/register?invite=${invitation.token}&email=${encodeURIComponent(primaryEmail)}`
            const emailResult = await sendInvitationEmail({
              to: primaryEmail,
              inviteeName: selectedPerson.name,
              inviterName: inviterName,
              workspaceName: workspace.name,
              contextType: "tenant",
              signupUrl: signupUrl,
              message: `You've been added as a tenant at ${workspace.name}. Sign up to access your tenant portal where you can view bills, payments, submit complaints, and more.`,
            })

            if (emailResult.success) {
              debugLog("Invitation email sent", { email: primaryEmail })
            } else {
              console.warn("Failed to send invitation email:", emailResult.error)
            }
          }
        }
      }

      toast.success("Tenant added successfully!", {
        description: `${selectedPerson.name} has been added to Room ${roomCheck.room_number}`,
      })
      router.push("/tenants")
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
    return <PageLoader />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
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
            <Link href="/properties/new">
              <Button>Add Property First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PermissionGuard permission="tenants.create">
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Dashboard</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <Link href="/tenants" className="hover:text-foreground transition-colors">
          Tenants
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-foreground font-medium">Add New</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenants">
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
        {/* Step 1: Select or Create Person */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Step 1: Select Person</CardTitle>
                <CardDescription>
                  Search for an existing person or add a new one. Identity data is stored centrally in the People directory.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownerId ? (
              <PersonSelector
                ownerId={ownerId}
                selectedPersonId={selectedPerson?.id}
                onSelect={handlePersonSelect}
                excludeTags={["blocked"]}
                placeholder="Search by name, phone, or email..."
                disabled={loading}
                required
              />
            ) : (
              <div className="h-10 flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}

            {/* Show selected person info */}
            {selectedPerson && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                  <span>
                    <strong>{selectedPerson.name}</strong> selected
                    {selectedPerson.phone && ` • ${selectedPerson.phone}`}
                    {selectedPerson.email && ` • ${selectedPerson.email}`}
                    {selectedPerson.tags?.includes("tenant") && " (existing tenant)"}
                    {selectedPerson.is_verified && " • Verified"}
                  </span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Contact info and personal details are managed in the People directory
                </p>
              </div>
            )}
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
                <Label>Property *</Label>
                <Combobox
                  options={properties.map((p): ComboboxOption => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={formData.property_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}
                  placeholder="Select property..."
                  searchPlaceholder="Search properties..."
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Room *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={refreshRooms}
                    disabled={loading}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <Combobox
                  options={availableRooms.map((r): ComboboxOption => ({
                    value: r.id,
                    label: `Room ${r.room_number}`,
                    description: `${r.occupied_beds}/${r.total_beds} beds - ${formatCurrency(r.rent_amount)}/mo`,
                  }))}
                  value={formData.room_id}
                  onValueChange={(value) => {
                    const room = availableRooms.find(r => r.id === value)
                    setFormData(prev => ({
                      ...prev,
                      room_id: value,
                      monthly_rent: room?.rent_amount?.toString() || prev.monthly_rent,
                      security_deposit: room?.deposit_amount?.toString() || prev.security_deposit,
                    }))
                  }}
                  placeholder={availableRooms.length === 0 ? "No available rooms" : "Select room..."}
                  searchPlaceholder="Search rooms..."
                  disabled={loading || availableRooms.length === 0}
                />
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
                <CardDescription>Identity proofs for police verification</CardDescription>
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
          <Link href="/tenants">
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
    </PermissionGuard>
  )
}
