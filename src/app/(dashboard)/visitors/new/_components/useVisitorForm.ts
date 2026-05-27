"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { withCreatedBy } from "@/lib/audit"
import { PersonSearchResult } from "@/types/people.types"
import {
  VisitorType,
  VisitorContactSearchResult,
  EnquirySource,
} from "@/types/visitors.types"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

interface Room {
  id: string
  room_number: string
  property_id: string
}

interface Tenant {
  id: string
  name: string
  phone: string
  property_id: string
  room: {
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  phone: string
  property_id: string
  room: { room_number: string }[] | null
}

export interface VisitorFormData {
  visitor_contact_id: string
  visitor_type: VisitorType
  property_id: string
  tenant_id: string
  visitor_name: string
  visitor_phone: string
  relation: string
  purpose: string
  is_overnight: boolean
  num_nights: string
  charge_per_night: string
  expected_checkout_date: string
  create_bill: boolean
  company_name: string
  service_type: string
  enquiry_source: EnquirySource | ""
  rooms_interested: string[]
  follow_up_date: string
  notes: string
  id_type: string
  id_number: string
  vehicle_number: string
  host_name: string
  department: string
}

const INITIAL_FORM_DATA: VisitorFormData = {
  visitor_contact_id: "",
  visitor_type: "tenant_visitor",
  property_id: "",
  tenant_id: "",
  visitor_name: "",
  visitor_phone: "",
  relation: "",
  purpose: "",
  is_overnight: false,
  num_nights: "1",
  charge_per_night: "",
  expected_checkout_date: "",
  create_bill: false,
  company_name: "",
  service_type: "",
  enquiry_source: "",
  rooms_interested: [],
  follow_up_date: "",
  notes: "",
  id_type: "",
  id_number: "",
  vehicle_number: "",
  host_name: "",
  department: "",
}

export function useVisitorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const personIdFromUrl = searchParams.get("person_id")

  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Person-centric selection
  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)

  // Legacy contact search state
  const [selectedContact, setSelectedContact] = useState<VisitorContactSearchResult | null>(null)

  const [formData, setFormData] = useState<VisitorFormData>(INITIAL_FORM_DATA)

  // Calculate total charge
  const totalCharge = formData.is_overnight && formData.charge_per_night
    ? parseFloat(formData.charge_per_night) * parseInt(formData.num_nights || "1")
    : 0

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setOwnerId(user.id)
      }

      const supabase = createClient()
      const [propertiesRes, tenantsRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase
          .from("tenants")
          .select("id, name, phone, property_id, room:rooms(room_number)")
          .eq("status", "active")
          .order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
      ])

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (!tenantsRes.error) {
        const transformedTenants = ((tenantsRes.data as RawTenant[]) || []).map((tenant) => ({
          ...tenant,
          room: transformJoin(tenant.room),
        }))
        setTenants(transformedTenants)
      }

      if (!roomsRes.error) {
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
        handlePersonSelect(data)
      } else if (data?.is_blocked) {
        showError("This person is blocked and cannot check in as a visitor")
      }
    }

    loadPersonFromUrl()
  }, [personIdFromUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter tenants and rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      const filtered = tenants.filter((t) => t.property_id === formData.property_id)
      setFilteredTenants(filtered)
      if (filtered.length > 0 && formData.visitor_type === "tenant_visitor" && !formData.tenant_id) {
        setFormData((prev) => ({ ...prev, tenant_id: filtered[0].id }))
      } else if (filtered.length === 0) {
        setFormData((prev) => ({ ...prev, tenant_id: "" }))
      }

      const filteredR = rooms.filter((r) => r.property_id === formData.property_id)
      setFilteredRooms(filteredR)
    }
  }, [formData.property_id, tenants, rooms, formData.visitor_type, formData.tenant_id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handlePersonSelect = (person: PersonSearchResult | null) => {
    setSelectedPerson(person)
    setSelectedContact(null)

    if (person) {
      let visitorType: VisitorType = formData.visitor_type
      if (person.tags?.includes("service_provider")) {
        visitorType = "service_provider"
      }

      setFormData((prev) => ({
        ...prev,
        visitor_name: person.name,
        visitor_phone: person.phone || "",
        visitor_type: visitorType,
      }))

      showSuccess(`Selected: ${person.name}`)
    }
  }

  const handleVisitorTypeChange = (type: VisitorType) => {
    setFormData((prev) => ({
      ...prev,
      visitor_type: type,
      tenant_id: type === "tenant_visitor" && filteredTenants.length > 0 ? filteredTenants[0].id : "",
    }))
  }

  const handleRoomsInterestedChange = (roomId: string) => {
    setFormData((prev) => ({
      ...prev,
      rooms_interested: prev.rooms_interested.includes(roomId)
        ? prev.rooms_interested.filter((id) => id !== roomId)
        : [...prev.rooms_interested, roomId],
    }))
  }

  const handleClearContact = () => {
    setSelectedContact(null)
    setFormData((prev) => ({
      ...prev,
      visitor_contact_id: "",
      visitor_name: "",
      visitor_phone: "",
      company_name: "",
      service_type: "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPerson) {
      showError("Please select a visitor from the People directory")
      return
    }

    if (!formData.property_id) {
      showError("Please select a property")
      return
    }

    if (formData.visitor_type === "tenant_visitor" && !formData.tenant_id) {
      showError("Please select a tenant for tenant visitor")
      return
    }

    const serviceType = selectedPerson.occupation || formData.service_type
    if (formData.visitor_type === "service_provider" && !serviceType) {
      showError("Please select a service type or add occupation in People module")
      return
    }

    setLoading(true)

    try {
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const supabase = createClient()
      let visitorContactId = formData.visitor_contact_id

      if (!visitorContactId) {
        const { data: contactData, error: contactError } = await supabase
          .from("visitor_contacts")
          .insert({
            owner_id: user.id,
            person_id: selectedPerson.id,
            name: selectedPerson.name,
            phone: selectedPerson.phone || null,
            visitor_type: formData.visitor_type,
            company_name: selectedPerson.company_name || null,
            service_type: selectedPerson.occupation || null,
            id_type: selectedPerson.id_documents?.[0]?.type || null,
            id_number: selectedPerson.id_documents?.[0]?.number || null,
            notes: formData.notes || null,
          })
          .select("id")
          .single()

        if (contactError) {
          logger.error("Error creating visitor contact:", { detail: contactError })
        } else {
          visitorContactId = contactData.id
        }
      } else {
        await supabase
          .from("visitor_contacts")
          .update({
            person_id: selectedPerson.id,
            name: selectedPerson.name,
            phone: selectedPerson.phone || null,
            company_name: selectedPerson.company_name || null,
            service_type: selectedPerson.occupation || null,
            id_type: selectedPerson.id_documents?.[0]?.type || null,
            id_number: selectedPerson.id_documents?.[0]?.number || null,
            updated_at: getNowISO(),
          })
          .eq("id", visitorContactId)
      }

      const numNights = formData.is_overnight ? parseInt(formData.num_nights || "1") : null
      const chargePerNight = formData.is_overnight && formData.charge_per_night
        ? parseFloat(formData.charge_per_night)
        : null
      const overnightCharge = numNights && chargePerNight ? numNights * chargePerNight : null

      let expectedCheckout: string | null = null
      if (formData.is_overnight && numNights) {
        if (formData.expected_checkout_date) {
          expectedCheckout = formData.expected_checkout_date
        } else {
          const checkoutDate = new Date()
          checkoutDate.setDate(checkoutDate.getDate() + numNights)
          expectedCheckout = checkoutDate.toISOString().split("T")[0]
        }
      }

      let billId: string | null = null
      if (formData.create_bill && overnightCharge && overnightCharge > 0 && numNights && chargePerNight && formData.tenant_id) {
        const billNumber = `VIS-${Date.now().toString(36).toUpperCase()}`
        const today = getTodayISO()

        const { data: billData, error: billError } = await supabase
          .from("bills")
          .insert(withCreatedBy({
            owner_id: user.id,
            tenant_id: formData.tenant_id,
            property_id: formData.property_id,
            bill_number: billNumber,
            bill_date: today,
            due_date: expectedCheckout || today,
            total_amount: overnightCharge,
            balance_due: overnightCharge,
            status: "pending",
            line_items: [{
              description: `Visitor Stay - ${formData.visitor_name} (${numNights} night${numNights > 1 ? "s" : ""})`,
              quantity: numNights,
              rate: chargePerNight,
              amount: overnightCharge,
            }],
            notes: `Visitor: ${formData.visitor_name}${formData.relation ? ` (${formData.relation})` : ""}`,
          }, user.id))
          .select("id")
          .single()

        if (billError) {
          logger.error("Error creating bill:", { detail: billError })
          showError("Failed to create bill, but visitor will be checked in")
        } else {
          billId = billData.id
        }
      }

      const visitorData = withCreatedBy({
        owner_id: user.id,
        property_id: formData.property_id,
        visitor_contact_id: visitorContactId || null,
        visitor_type: formData.visitor_type,
        visitor_name: selectedPerson.name,
        visitor_phone: selectedPerson.phone || null,
        id_type: selectedPerson.id_documents?.[0]?.type || null,
        id_number: selectedPerson.id_documents?.[0]?.number || null,
        purpose: formData.purpose || null,
        check_in_time: getNowISO(),
        is_overnight: formData.is_overnight,
        num_nights: numNights,
        charge_per_night: chargePerNight,
        overnight_charge: overnightCharge,
        expected_checkout_date: expectedCheckout,
        notes: formData.notes || null,
        vehicle_number: formData.vehicle_number || null,
        person_id: selectedPerson.id,
      }, user.id) as unknown as Record<string, unknown>

      if (formData.visitor_type === "tenant_visitor") {
        visitorData.tenant_id = formData.tenant_id
        visitorData.relation = formData.relation || null
        visitorData.bill_id = billId
      } else if (formData.visitor_type === "service_provider") {
        visitorData.company_name = selectedPerson.company_name || formData.company_name || null
        visitorData.service_type = selectedPerson.occupation || formData.service_type || null
      } else if (formData.visitor_type === "enquiry") {
        visitorData.enquiry_status = "pending"
        visitorData.enquiry_source = formData.enquiry_source || null
        visitorData.rooms_interested = formData.rooms_interested.length > 0 ? formData.rooms_interested : null
        visitorData.follow_up_date = formData.follow_up_date || null
      } else if (formData.visitor_type === "general") {
        visitorData.host_name = formData.host_name || null
        visitorData.department = formData.department || null
      }

      const { error } = await supabase.from("visitors").insert(visitorData)

      if (error) {
        logger.error("Error creating visitor:", { detail: error })
        throw error
      }

      const message = billId
        ? "Visitor checked in and bill created!"
        : selectedContact
        ? `${formData.visitor_name} checked in (visit #${(selectedContact.visit_count || 0) + 1})`
        : "Visitor checked in successfully!"
      showSuccess(message)
      router.push("/visitors")
    } catch (error) {
      handleClientError(error, "Checking in visitor")
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    loadingData,
    properties,
    filteredTenants,
    filteredRooms,
    ownerId,
    selectedPerson,
    selectedContact,
    formData,
    totalCharge,
    handleChange,
    handlePersonSelect,
    handleVisitorTypeChange,
    handleRoomsInterestedChange,
    handleClearContact,
    handleSubmit,
  }
}
