"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  Building2,
  Search,
  Star,
  X,
  Car,
  MessageSquare,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageLoader } from "@/components/ui/page-loader"
import { PersonSelector } from "@/components/people"
import { PersonSearchResult } from "@/types/people.types"
import {
  VisitorType,
  VisitorContactSearchResult,
  EnquirySource,
} from "@/types/visitors.types"

import {
  VisitorTypeSelector,
  VisitorTypeFields,
  OvernightStaySection,
} from "./_components"

interface Property {
  id: string
  name: string
}

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

const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-blue-100 text-blue-700 border-blue-300",
  enquiry: "bg-purple-100 text-purple-700 border-purple-300",
  service_provider: "bg-orange-100 text-orange-700 border-orange-300",
  general: "bg-slate-100 text-slate-700 border-slate-300",
}

const VISITOR_TYPE_ICONS: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <span />,
  enquiry: <span />,
  service_provider: <span />,
  general: <span />,
}

export default function NewVisitorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personIdFromUrl = searchParams.get("person_id")
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Person-centric: Select person from central registry
  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)

  // Legacy contact search state (keeping for backwards compatibility)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<VisitorContactSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedContact, setSelectedContact] = useState<VisitorContactSearchResult | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    visitor_contact_id: "",
    visitor_type: "tenant_visitor" as VisitorType,
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
    // Service provider fields
    company_name: "",
    service_type: "",
    // Enquiry fields
    enquiry_source: "" as EnquirySource | "",
    rooms_interested: [] as string[],
    follow_up_date: "",
    // General visitor fields
    notes: "",
    id_type: "",
    id_number: "",
    vehicle_number: "",
    host_name: "",
    department: "",
  })

  // Calculate total charge
  const totalCharge = formData.is_overnight && formData.charge_per_night
    ? parseFloat(formData.charge_per_night) * parseInt(formData.num_nights || "1")
    : 0

  // Search for existing contacts
  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("visitor_contacts")
      .select("id, name, phone, visitor_type, company_name, service_type, visit_count, last_visit_at, is_frequent, is_blocked")
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,company_name.ilike.%${query}%`)
      .order("is_frequent", { ascending: false })
      .order("visit_count", { ascending: false })
      .limit(10)

    setSearchLoading(false)

    if (error) {
      console.error("Error searching contacts:", error)
      return
    }

    setSearchResults(data || [])
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchContacts(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchContacts])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Select a contact and auto-fill form
  const handleSelectContact = (contact: VisitorContactSearchResult) => {
    if (contact.is_blocked) {
      showError(`This visitor is blocked: ${contact.name}`)
      return
    }

    setSelectedContact(contact)
    setFormData((prev) => ({
      ...prev,
      visitor_contact_id: contact.id,
      visitor_type: contact.visitor_type,
      visitor_name: contact.name,
      visitor_phone: contact.phone || "",
      company_name: contact.company_name || "",
      service_type: contact.service_type || "",
    }))
    setSearchQuery("")
    setShowSearchResults(false)
    showSuccess(`Selected: ${contact.name}${contact.visit_count > 0 ? ` (${contact.visit_count} previous visits)` : ""}`)
  }

  // Clear selected contact
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

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Get current user ID for PersonSelector
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setOwnerId(user.id)
      }

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
        showError("This person is blocked and cannot check in as a visitor")
      }
    }

    loadPersonFromUrl()
  }, [personIdFromUrl])

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

  // Handle person selection from PersonSelector
  const handlePersonSelect = (person: PersonSearchResult | null) => {
    setSelectedPerson(person)
    // Clear legacy contact when using person
    setSelectedContact(null)

    if (person) {
      // Determine visitor type based on person's tags
      let visitorType: VisitorType = formData.visitor_type
      if (person.tags?.includes("service_provider")) {
        visitorType = "service_provider"
      } else if (person.tags?.includes("visitor")) {
        visitorType = formData.visitor_type // Keep current selection
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Person-centric: Require person selection
    if (!selectedPerson) {
      showError("Please select a visitor from the People directory")
      return
    }

    if (!formData.property_id) {
      showError("Please select a property")
      return
    }

    // Validate tenant_visitor requires tenant
    if (formData.visitor_type === "tenant_visitor" && !formData.tenant_id) {
      showError("Please select a tenant for tenant visitor")
      return
    }

    // Validate service_provider requires service_type (now from selectedPerson or formData)
    const serviceType = selectedPerson.occupation || formData.service_type
    if (formData.visitor_type === "service_provider" && !serviceType) {
      showError("Please select a service type or add occupation in People module")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Person-centric: Link visitor_contacts to person record
      // visitor_contacts is being deprecated in favor of People module
      let visitorContactId = formData.visitor_contact_id

      if (!visitorContactId) {
        // Create new contact linked to person
        const { data: contactData, error: contactError } = await supabase
          .from("visitor_contacts")
          .insert({
            owner_id: user.id,
            person_id: selectedPerson.id, // Link to person record
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
          console.error("Error creating visitor contact:", contactError)
          // Continue without contact - don't block the visit
        } else {
          visitorContactId = contactData.id
        }
      } else {
        // Update existing contact - link to person if not already linked
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", visitorContactId)
      }

      const numNights = formData.is_overnight ? parseInt(formData.num_nights || "1") : null
      const chargePerNight = formData.is_overnight && formData.charge_per_night
        ? parseFloat(formData.charge_per_night)
        : null
      const overnightCharge = numNights && chargePerNight ? numNights * chargePerNight : null

      // Calculate expected checkout date if overnight
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

      // Create bill first if requested and there's a charge (only for tenant visitors)
      let billId: string | null = null
      if (formData.create_bill && overnightCharge && overnightCharge > 0 && numNights && chargePerNight && formData.tenant_id) {
        const billNumber = `VIS-${Date.now().toString(36).toUpperCase()}`
        const today = new Date().toISOString().split("T")[0]

        const { data: billData, error: billError } = await supabase
          .from("bills")
          .insert({
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
          })
          .select("id")
          .single()

        if (billError) {
          console.error("Error creating bill:", billError)
          showError("Failed to create bill, but visitor will be checked in")
        } else {
          billId = billData.id
        }
      }

      // Person-centric: Use data from selectedPerson, not form data
      const visitorData: Record<string, unknown> = {
        owner_id: user.id,
        created_by: user.id,
        property_id: formData.property_id,
        visitor_contact_id: visitorContactId || null,
        visitor_type: formData.visitor_type,
        // Person-centric: Get name and phone from selectedPerson
        visitor_name: selectedPerson.name,
        visitor_phone: selectedPerson.phone || null,
        // Get ID info from person's id_documents if available
        id_type: selectedPerson.id_documents?.[0]?.type || null,
        id_number: selectedPerson.id_documents?.[0]?.number || null,
        // Visit-specific data
        purpose: formData.purpose || null,
        check_in_time: new Date().toISOString(),
        is_overnight: formData.is_overnight,
        num_nights: numNights,
        charge_per_night: chargePerNight,
        overnight_charge: overnightCharge,
        expected_checkout_date: expectedCheckout,
        notes: formData.notes || null,
        vehicle_number: formData.vehicle_number || null,
        // Link to person record
        person_id: selectedPerson.id,
      }

      // Add type-specific fields
      if (formData.visitor_type === "tenant_visitor") {
        visitorData.tenant_id = formData.tenant_id
        visitorData.relation = formData.relation || null
        visitorData.bill_id = billId
      } else if (formData.visitor_type === "service_provider") {
        // Person-centric: Get company and service type from selectedPerson or form
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
        console.error("Error creating visitor:", error)
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
      console.error("Error:", error)
      showError("Failed to check in visitor. Please try again.")
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
          <Link href="/visitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Check In Visitor</h1>
            <p className="text-muted-foreground">Register a new visitor</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property first
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/visitors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Check In Visitor</h1>
          <p className="text-muted-foreground">Register a new or returning visitor</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select or Create Person */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Step 1: Select Visitor</CardTitle>
                <CardDescription>
                  Search for an existing person or add a new visitor
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
                showEditLink={true}
                showDetailedInfo={true}
              />
            ) : (
              <div className="h-10 flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}

            {/* Legacy contact display (if selected via old method) */}
            {selectedContact && !selectedPerson && (
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${VISITOR_TYPE_COLORS[selectedContact.visitor_type]}`}>
                    {VISITOR_TYPE_ICONS[selectedContact.visitor_type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedContact.name}</span>
                      {selectedContact.is_frequent && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedContact.phone && <span>{selectedContact.phone}</span>}
                      {selectedContact.company_name && <span> - {selectedContact.company_name}</span>}
                      <span className="ml-2">({selectedContact.visit_count} visits)</span>
                    </div>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearContact}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visitor Type Selection */}
        <VisitorTypeSelector
          selectedType={formData.visitor_type}
          onTypeChange={handleVisitorTypeChange}
          selectedContact={selectedContact}
        />

        {/* Property Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Property</CardTitle>
                <CardDescription>Select the property</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Visit Details - Only visit-specific info, personal data comes from People module */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visit Details</CardTitle>
                <CardDescription>
                  Information about this visit (personal details are managed in People module)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_number">
                <Car className="h-4 w-4 inline mr-1" />
                Vehicle Number
              </Label>
              <Input
                id="vehicle_number"
                name="vehicle_number"
                placeholder="e.g., MH12AB1234"
                value={formData.vehicle_number}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <textarea
                id="purpose"
                name="purpose"
                placeholder="e.g., Meeting, Delivery, etc."
                value={formData.purpose}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>

            {/* Note about ID documents */}
            {selectedPerson && !selectedPerson.id_documents?.length && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <strong>Note:</strong> This visitor has no ID documents on file.
                ID information is managed in the People module.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visitor Type-Specific Fields */}
        <VisitorTypeFields
          visitorType={formData.visitor_type}
          formData={formData}
          onChange={handleChange}
          onRoomsInterestedChange={handleRoomsInterestedChange}
          filteredTenants={filteredTenants}
          filteredRooms={filteredRooms}
          selectedPerson={selectedPerson}
          loading={loading}
        />

        {/* Notes - Available for all types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any other information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about the visitor..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </CardContent>
        </Card>

        {/* Overnight Stay - For tenant_visitor and general */}
        {(formData.visitor_type === "tenant_visitor" || formData.visitor_type === "general") && (
          <OvernightStaySection
            formData={formData}
            totalCharge={totalCharge}
            onChange={handleChange}
            loading={loading}
          />
        )}

        <div className="flex justify-end gap-4">
          <Link href="/visitors">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || (formData.visitor_type === "tenant_visitor" && filteredTenants.length === 0)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Check In Visitor
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
