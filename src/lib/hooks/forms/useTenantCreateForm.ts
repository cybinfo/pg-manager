"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { showDetailedError, debugLog } from "@/lib/error-handler"
import { onboardTenantUser } from "@/lib/services/tenant-onboarding"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useFeatures } from "@/lib/features/use-features"
import { createTenant as createTenantWorkflow, TenantCreateInput } from "@/lib/workflows/tenant.workflow"
import type { PersonSearchResult } from "@/types/people.types"
import { getTodayISO } from "@/lib/date-helpers"
import { POLICE_VERIFICATION_STATUS_OPTIONS } from "@/lib/status"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

export interface Room {
  id: string
  room_number: string
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  entity_id: string
  is_under_maintenance?: boolean
}

export function useTenantCreateForm() {
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

  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)

  const [formData, setFormData] = useState({
    entity_id: "",
    room_id: "",
    name: "",
    check_in_date: getTodayISO(),
    monthly_rent: "",
    security_deposit: "",
    police_verification_status: "pending",
    agreement_signed: false as boolean,
    notes: "",
  })

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
      if (user) {
        setOwnerId(user.id)
      }

      const supabase = createClient()

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("entities").select("id, name").eq("type", "pg").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])

      if (propertiesRes.error) {
        logger.error("Error fetching properties:", { detail: propertiesRes.error })
        showError("Failed to load properties")
      } else {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, entity_id: propertiesRes.data[0].id }))
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
    if (formData.entity_id && rooms.length > 0) {
      const filtered = rooms.filter(
        (room) =>
          room.entity_id === formData.entity_id &&
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
  }, [formData.entity_id, rooms])

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

  const handlePersonSelect = (person: PersonSearchResult | null) => {
    setSelectedPerson(person)
    if (person) {
      setFormData((prev) => ({
        ...prev,
        name: person.name,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!selectedPerson) {
      showError("Please select a person", "Select an existing person or create a new one first")
      return
    }

    if (isFeatureEnabled("properties", "maintenanceMode") && formData.room_id) {
      const selectedRoom = availableRooms.find(r => r.id === formData.room_id)
      if (selectedRoom?.is_under_maintenance) {
        showError("Room Under Maintenance", "This room is currently under maintenance and cannot accept new tenants.")
        return
      }
    }

    if (!formData.entity_id || !formData.room_id || !formData.monthly_rent) {
      showError("Validation Error: Please fill in all required fields", `Missing: ${[
        !formData.entity_id && "Property",
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

      const { data: propertyCheck, error: propertyError } = await supabase
        .from("entities")
        .select("id, name")
        .eq("id", formData.entity_id)
        .eq("owner_id", user.id)
        .single()

      if (propertyError || !propertyCheck) {
        showDetailedError(propertyError || { message: "Property not found or doesn't belong to you" }, {
          operation: "verifying property ownership",
          table: "properties",
          data: { entity_id: formData.entity_id, owner_id: user.id }
        })
        return
      }

      debugLog("Property verified", propertyCheck)

      const { data: roomCheck, error: roomError } = await supabase
        .from("rooms")
        .select("id, room_number, entity_id, occupied_beds, total_beds")
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

      if (roomCheck.entity_id !== formData.entity_id) {
        showError("Room Mismatch Error", `Room ${roomCheck.room_number} doesn't belong to the selected property.`)
        return
      }

      if (roomCheck.occupied_beds >= roomCheck.total_beds) {
        showError("Room Full Error", `Room ${roomCheck.room_number} is already full (${roomCheck.occupied_beds}/${roomCheck.total_beds} beds).`)
        return
      }

      debugLog("Room verified", roomCheck)

      const workflowInput: TenantCreateInput = {
        person_id: selectedPerson.id,
        name: selectedPerson.name,
        email: selectedPerson.email || undefined,
        phone: selectedPerson.phone || "",
        photo_url: selectedPerson.photo_url || undefined,
        profile_photo: selectedPerson.photo_url || undefined,
        entity_id: formData.entity_id,
        room_id: formData.room_id,
        check_in_date: formData.check_in_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit) || 0,
        generate_initial_bill: false,
        send_welcome_notification: !!selectedPerson.email,
        send_invitation: false,
      }

      debugLog("Calling tenant workflow", workflowInput)

      const workflowResult = await createTenantWorkflow(
        workflowInput,
        user.id,
        "owner",
        user.id
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

      await supabase
        .from("tenants")
        .update({
          police_verification_status: formData.police_verification_status,
          agreement_signed: formData.agreement_signed,
          notes: formData.notes || null,
        })
        .eq("id", newTenantId)

      await onboardTenantUser({
        tenantId: newTenantId,
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

  // Step completion flags
  const step1Complete = selectedPerson !== null
  const step2Complete = !!(formData.entity_id && formData.room_id && formData.monthly_rent)
  const step3Complete = step2Complete

  const selectedProperty = properties.find(p => p.id === formData.entity_id)
  const selectedRoom = availableRooms.find(r => r.id === formData.room_id)
  const verificationLabel = POLICE_VERIFICATION_STATUS_OPTIONS.find(
    o => o.value === formData.police_verification_status
  )?.label ?? formData.police_verification_status

  return {
    // State
    loading,
    loadingData,
    currentStep,
    setCurrentStep,
    ownerId,
    selectedPerson,
    formData,
    setFormData,
    properties,
    availableRooms,
    // Computed
    step1Complete,
    step2Complete,
    step3Complete,
    selectedProperty,
    selectedRoom,
    verificationLabel,
    // Handlers
    handleChange,
    handlePersonSelect,
    handleSubmit,
    refreshRooms,
    // Navigation
    backHref,
    router,
    // Features
    isFeatureEnabled,
  }
}
