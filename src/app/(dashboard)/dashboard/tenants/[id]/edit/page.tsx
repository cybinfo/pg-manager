"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, Loader2, Building2, Home, Shield, FileText } from "lucide-react"
import { toast } from "sonner"

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
    email: "",
    phone: "",
    check_in_date: "",
    monthly_rent: "",
    security_deposit: "",
    status: "active",
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
    // Custom fields
    parent_name: "",
    parent_phone: "",
    permanent_address: "",
    id_proof_type: "",
    id_proof_number: "",
  })

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
        email: tenant.email || "",
        phone: tenant.phone,
        check_in_date: tenant.check_in_date,
        monthly_rent: tenant.monthly_rent.toString(),
        security_deposit: (tenant.security_deposit || 0).toString(),
        status: tenant.status,
        police_verification_status: tenant.police_verification_status || "pending",
        agreement_signed: tenant.agreement_signed || false,
        notes: tenant.notes || "",
        parent_name: tenant.custom_fields?.parent_name || "",
        parent_phone: tenant.custom_fields?.parent_phone || "",
        permanent_address: tenant.custom_fields?.permanent_address || "",
        id_proof_type: tenant.custom_fields?.id_proof_type || "",
        id_proof_number: tenant.custom_fields?.id_proof_number || "",
      })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id || !formData.room_id || !formData.name || !formData.phone || !formData.monthly_rent) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Build custom fields object
      const customFields: Record<string, string> = {}
      if (formData.parent_name) customFields.parent_name = formData.parent_name
      if (formData.parent_phone) customFields.parent_phone = formData.parent_phone
      if (formData.permanent_address) customFields.permanent_address = formData.permanent_address
      if (formData.id_proof_type) customFields.id_proof_type = formData.id_proof_type
      if (formData.id_proof_number) customFields.id_proof_number = formData.id_proof_number

      const { error } = await supabase
        .from("tenants")
        .update({
          property_id: formData.property_id,
          room_id: formData.room_id,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          check_in_date: formData.check_in_date,
          monthly_rent: parseFloat(formData.monthly_rent),
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: formData.status,
          police_verification_status: formData.police_verification_status,
          agreement_signed: formData.agreement_signed,
          notes: formData.notes || null,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
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
        {/* Basic Info */}
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
            <div className="space-y-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g., rahul@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
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

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Optional details about the tenant</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                <Input
                  id="parent_name"
                  name="parent_name"
                  placeholder="e.g., Mr. Sharma"
                  value={formData.parent_name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent Phone</Label>
                <Input
                  id="parent_phone"
                  name="parent_phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.parent_phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent_address">Permanent Address</Label>
              <textarea
                id="permanent_address"
                name="permanent_address"
                placeholder="Enter full permanent address"
                value={formData.permanent_address}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_proof_type">ID Proof Type</Label>
                <select
                  id="id_proof_type"
                  name="id_proof_type"
                  value={formData.id_proof_type}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading}
                >
                  <option value="">Select ID type</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_proof_number">ID Proof Number</Label>
                <Input
                  id="id_proof_number"
                  name="id_proof_number"
                  placeholder="e.g., XXXX-XXXX-XXXX"
                  value={formData.id_proof_number}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

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
