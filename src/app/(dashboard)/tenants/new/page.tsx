"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users, Loader2, Building2, Home, RefreshCw,
  Shield, ChevronRight, FileText, Wrench, CheckCircle2
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency } from "@/lib/format"
import { showDetailedError, debugLog } from "@/lib/error-handler"
import { PageSkeleton } from "@/components/ui/loading"
import { onboardTenantUser } from "@/lib/services/tenant-onboarding"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useFeatures } from "@/lib/features/use-features"
import { createTenant as createTenantWorkflow, TenantCreateInput } from "@/lib/workflows/tenant.workflow"
import { PersonSelector } from "@/components/people"
import { PersonSearchResult } from "@/types/people.types"
import { getTodayISO } from "@/lib/date-helpers"
import { POLICE_VERIFICATION_STATUS_OPTIONS } from "@/lib/status"
import { logger } from "@/lib/logger"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import type { PropertyOption } from "@/types/properties.types"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"

interface Room {
  id: string
  room_number: string
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  property_id: string
  is_under_maintenance?: boolean
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Person", icon: Users },
  { id: 2, label: "Room", icon: Home },
  { id: 3, label: "Verification", icon: Shield },
  { id: 4, label: "Confirm", icon: CheckCircle2 },
]

export default function NewTenantPage() {
  return (
    <PermissionGuard permission="tenants.create">
      <NewTenantContent />
    </PermissionGuard>
  )
}

function NewTenantContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/tenants" })
  const { isFeatureEnabled } = useFeatures()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const personIdFromUrl = searchParams.get("person_id")
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  // Person-centric: Select person first, then add tenant-specific data
  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)

  // Basic form data - tenancy-specific only
  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    name: "",
    check_in_date: getTodayISO(),
    monthly_rent: "",
    security_deposit: "",
    // Status & Verification
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
  })


  // Refresh rooms data from database
  const refreshRooms = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("rooms").select("*").order("room_number")
    if (error) {
      logger.error("Error refreshing rooms:", { detail: error })
      showError("Failed to refresh rooms")
    } else {
      setRooms(data || [])
      showSuccess("Rooms refreshed")
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      // Set owner ID for PersonSelector
      if (user) {
        setOwnerId(user.id)
      }

      const supabase = createClient()

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])

      if (propertiesRes.error) {
        logger.error("Error fetching properties:", { detail: propertiesRes.error })
        showError("Failed to load properties")
      } else {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (roomsRes.error) {
        logger.error("Error fetching rooms:", { detail: roomsRes.error })
      } else {
        setRooms(roomsRes.data || [])
      }

      setLoadingData(false)
    }

    fetchData()
  }, [user])

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
        // eslint-disable-next-line react-hooks/immutability
        handlePersonSelect(data)
      } else if (data?.is_blocked) {
        showError("This person is blocked and cannot be added as a tenant")
      }
    }

    loadPersonFromUrl()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personIdFromUrl])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id && rooms.length > 0) {
      const filtered = rooms.filter(
        (room) =>
          room.property_id === formData.property_id &&
          room.occupied_beds < room.total_beds
      )
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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


  const handleSubmit = async () => {
    // Person selection is required - get data from selected person
    if (!selectedPerson) {
      showError("Please select a person", "Select an existing person or create a new one first")
      return
    }

    // Block assignment to rooms under maintenance
    if (isFeatureEnabled("properties", "maintenanceMode") && formData.room_id) {
      const selectedRoom = availableRooms.find(r => r.id === formData.room_id)
      if (selectedRoom?.is_under_maintenance) {
        showError("Room Under Maintenance", "This room is currently under maintenance and cannot accept new tenants.")
        return
      }
    }

    // Validate required fields
    if (!formData.property_id || !formData.room_id || !formData.monthly_rent) {
      showError("Validation Error: Please fill in all required fields", `Missing: ${[
        !formData.property_id && "Property",
        !formData.room_id && "Room",
        !formData.monthly_rent && "Rent"
      ].filter(Boolean).join(", ")}`)
      return
    }

    setLoading(true)
    debugLog("Starting tenant creation", { name: selectedPerson.name, phone: selectedPerson.phone })

    try {
      if (!user) {
        showError("Authentication Error", "No user session found. Please login again.")
        router.push("/login")
        return
      }

      const supabase = createClient()
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
        showError("Room Mismatch Error", `Room ${roomCheck.room_number} doesn't belong to the selected property.`)
        return
      }

      if (roomCheck.occupied_beds >= roomCheck.total_beds) {
        showError("Room Full Error", `Room ${roomCheck.room_number} is already full (${roomCheck.occupied_beds}/${roomCheck.total_beds} beds).`)
        return
      }

      debugLog("Room verified", roomCheck)

      // Build workflow input - person-centric (personal data comes from person record)
      // ID documents, addresses, emergency contacts are stored in People module only
      const workflowInput: TenantCreateInput = {
        // Person-centric: Link to person record
        person_id: selectedPerson.id,
        // Use person data from the selected person (workflow will fetch from person record if person_id provided)
        name: selectedPerson.name,
        email: selectedPerson.email || undefined,
        phone: selectedPerson.phone || "",
        photo_url: selectedPerson.photo_url || undefined,
        profile_photo: selectedPerson.photo_url || undefined,
        // Tenancy-specific data ONLY - no personal data duplication
        property_id: formData.property_id,
        room_id: formData.room_id,
        check_in_date: formData.check_in_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        // ID documents are now stored in People module, not duplicated here
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
        showError("Tenant creation failed", "No tenant ID returned from workflow")
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

      // Link tenant to existing user / create invitation / send welcome email
      await onboardTenantUser({
        tenantId: newTenant.id,
        tenantName: selectedPerson.name,
        tenantEmail: selectedPerson.email || null,
        tenantPhone: selectedPerson.phone || null,
        workspaceOwnerId: user.id,
        welcomeEmailEnabled: isFeatureEnabled("tenants", "welcomeEmail"),
        propertyName: propertyCheck.name,
        roomNumber: roomCheck.room_number,
        moveInDate: new Date(formData.check_in_date),
        monthlyRent: parseFloat(formData.monthly_rent),
        origin: window.location.origin,
      })

      showSuccess("Tenant added successfully!", `${selectedPerson.name} has been added to Room ${roomCheck.room_number}`)
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

  // ── Step completion ──────────────────────────────────────────────────────────
  const step1Complete = selectedPerson !== null
  const step2Complete = !!(formData.property_id && formData.room_id && formData.monthly_rent)
  // step3 is always optional — accessible once step2 done
  const step3Complete = step2Complete

  const selectedProperty = properties.find(p => p.id === formData.property_id)
  const selectedRoom = availableRooms.find(r => r.id === formData.room_id)
  const verificationLabel = POLICE_VERIFICATION_STATUS_OPTIONS.find(
    o => o.value === formData.police_verification_status
  )?.label ?? formData.police_verification_status

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
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
        <WorkflowHeader
          title="Add Tenant"
          subtitle="Register a new tenant in 4 guided steps"
          icon={Users}
          onBack={() => router.push(backHref)}
          backLabel="Tenants"
        />

        {/* Stepper */}
        <WorkflowStepper steps={STEPS} currentStep={currentStep} />

        {/* Step 1 — Select Person */}
        <WorkflowStepCard
          stepNum={1}
          title="Select Person"
          description="Search for an existing person or add a new one"
          icon={Users}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(1)}
          completedSummary={selectedPerson ? selectedPerson.name : undefined}
        >
          <div className="space-y-4">
            {ownerId ? (
              <PersonSelector
                ownerId={ownerId}
                selectedPersonId={selectedPerson?.id}
                onSelect={handlePersonSelect}
                excludeTags={["blocked"]}
                placeholder="Search by name, phone, or email..."
                disabled={loading}
                required
                showEditLink={true}
                showDetailedInfo={true}
              />
            ) : (
              <div className="h-10 flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}

            {selectedPerson && !selectedPerson.id_documents?.length && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  <strong>Note:</strong> This person has no ID documents on file.
                  For police verification, please add ID documents in the People module.
                </p>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!step1Complete}
              onClick={() => setCurrentStep(2)}
            >
              Save & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 2 — Room Assignment */}
        <WorkflowStepCard
          stepNum={2}
          title="Room Assignment"
          description="Assign tenant to a property and room"
          icon={Home}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(2)}
          completedSummary={
            step2Complete && selectedProperty && selectedRoom
              ? `${selectedProperty.name} · Room ${selectedRoom.room_number} · ${formatCurrency(parseFloat(formData.monthly_rent))}/mo`
              : undefined
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Property" required>
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
              </FormField>
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
                {isFeatureEnabled("properties", "maintenanceMode") && formData.room_id && (() => {
                  const room = availableRooms.find(r => r.id === formData.room_id)
                  return room?.is_under_maintenance ? (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <Wrench className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <p className="text-sm text-warning">
                        This room is under maintenance and cannot accept new tenants.
                      </p>
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            <FormField label="Check-in Date" required>
              <DatePicker
                id="check_in_date"
                value={formData.check_in_date}
                onChange={(val) => setFormData((prev) => ({ ...prev, check_in_date: val }))}
                disabled={loading}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Monthly Rent" required>
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
              </FormField>
              <FormField label="Security Deposit">
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
              </FormField>
            </div>

            <Button
              className="w-full"
              disabled={!step2Complete}
              onClick={() => setCurrentStep(3)}
            >
              Save & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 3 — Verification */}
        <WorkflowStepCard
          stepNum={3}
          title="Verification & Notes"
          description="Police verification status, agreement, and notes"
          icon={Shield}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(3)}
          completedSummary={
            step3Complete
              ? `${verificationLabel}${formData.agreement_signed ? " · Agreement signed" : ""}`
              : undefined
          }
        >
          <div className="space-y-4">
            <FormField label="Police Verification">
              <Select
                id="police_verification_status"
                name="police_verification_status"
                value={formData.police_verification_status}
                onChange={handleChange}
                disabled={loading}
                options={POLICE_VERIFICATION_STATUS_OPTIONS}
              />
            </FormField>

            <div className="flex items-center gap-2">
              <input
                id="agreement_signed"
                name="agreement_signed"
                type="checkbox"
                checked={formData.agreement_signed}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="agreement_signed" className="font-normal cursor-pointer">
                Agreement signed
              </Label>
            </div>

            <FormField label="Notes">
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about the tenant..."
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                className="min-h-[80px]"
              />
            </FormField>

            <Button
              className="w-full"
              onClick={() => setCurrentStep(4)}
            >
              Save & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 4 — Confirm & Submit */}
        <WorkflowStepCard
          stepNum={4}
          title="Confirm & Add Tenant"
          description="Review details and submit"
          icon={CheckCircle2}
          currentStep={currentStep}
        >
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-base">Enrollment Summary</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">Person</span>
                <span className="font-medium">{selectedPerson?.name ?? "—"}</span>

                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{selectedProperty?.name ?? "—"}</span>

                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">
                  {selectedRoom ? `Room ${selectedRoom.room_number}` : "—"}
                </span>

                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{formData.check_in_date || "—"}</span>

                <span className="text-muted-foreground">Monthly Rent</span>
                <span className="font-medium">
                  {formData.monthly_rent ? formatCurrency(parseFloat(formData.monthly_rent)) : "—"}
                </span>

                <span className="text-muted-foreground">Deposit</span>
                <span className="font-medium">
                  {formData.security_deposit ? formatCurrency(parseFloat(formData.security_deposit)) : "—"}
                </span>

                <span className="text-muted-foreground">Police Verification</span>
                <span className="font-medium">{verificationLabel}</span>

                <span className="text-muted-foreground">Agreement</span>
                <span className="font-medium">{formData.agreement_signed ? "Signed" : "Not signed"}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/tenants")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={loading || !step1Complete || !step2Complete}
                onClick={handleSubmit}
              >
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
          </div>
        </WorkflowStepCard>
      </div>
  )
}
