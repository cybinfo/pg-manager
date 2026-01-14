"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import { Select } from "@/components/ui/form-components"
import {
  ArrowLeft,
  Loader2,
  Building2,
  Home,
  Shield,
  FileText,
  Phone,
  Mail,
  Save,
  User,
  ExternalLink,
  MapPin,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"

interface Person {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  permanent_address: string | null
  permanent_city: string | null
  permanent_state: string | null
}

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
  person_id: string
  property_id: string
  room_id: string
  check_in_date: string
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  person?: Person | null
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
  const [tenant, setTenant] = useState<Tenant | null>(null)

  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    check_in_date: "",
    monthly_rent: "",
    security_deposit: "",
    status: "active",
    police_verification_status: "pending",
    agreement_signed: false,
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch tenant with person data, properties, and rooms in parallel
      const [tenantRes, propertiesRes, roomsRes] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            id, person_id, property_id, room_id, check_in_date,
            monthly_rent, security_deposit, status, police_verification_status,
            agreement_signed, notes,
            person:people(id, name, phone, email, photo_url, permanent_address, permanent_city, permanent_state)
          `)
          .eq("id", params.id)
          .single(),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])

      if (tenantRes.error || !tenantRes.data) {
        console.error("Error fetching tenant:", tenantRes.error)
        toast.error("Tenant not found")
        router.push("/tenants")
        return
      }

      const tenantData = {
        ...tenantRes.data,
        person: Array.isArray(tenantRes.data.person) ? tenantRes.data.person[0] : tenantRes.data.person,
      } as Tenant

      setTenant(tenantData)
      setOriginalRoomId(tenantData.room_id)

      setFormData({
        property_id: tenantData.property_id,
        room_id: tenantData.room_id,
        check_in_date: tenantData.check_in_date,
        monthly_rent: tenantData.monthly_rent.toString(),
        security_deposit: (tenantData.security_deposit || 0).toString(),
        status: tenantData.status,
        police_verification_status: tenantData.police_verification_status || "pending",
        agreement_signed: tenantData.agreement_signed || false,
        notes: tenantData.notes || "",
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

    if (!formData.property_id || !formData.room_id || !formData.monthly_rent) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("tenants")
        .update({
          property_id: formData.property_id,
          room_id: formData.room_id,
          check_in_date: formData.check_in_date,
          monthly_rent: parseFloat(formData.monthly_rent),
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: formData.status,
          police_verification_status: formData.police_verification_status,
          agreement_signed: formData.agreement_signed,
          notes: formData.notes || null,
        })
        .eq("id", params.id)

      if (error) {
        console.error("Error updating tenant:", error)
        throw error
      }

      toast.success("Tenant updated successfully!")
      router.push(`/tenants/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update tenant. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading tenant details..." />
  }

  if (!tenant) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <DetailHero
        title="Edit Tenancy"
        subtitle={`Update tenancy details for ${tenant.person?.name || "Tenant"}`}
        backHref={`/tenants/${params.id}`}
        backLabel="Back to Tenant"
        avatar={
          <Avatar
            name={tenant.person?.name || "T"}
            src={tenant.person?.photo_url}
            size="lg"
            className="h-14 w-14 text-xl"
          />
        }
      />

      {/* Personal Info Summary (Read Only) */}
      <DetailSection
        title="Personal Information"
        description="Edit personal details in the People module"
        icon={User}
        actions={
          tenant.person_id && (
            <Link href={`/people/${tenant.person_id}/edit`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Edit in People
              </Button>
            </Link>
          )
        }
      >
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <InfoRow
            label="Name"
            value={tenant.person?.name || "—"}
            icon={User}
          />
          <InfoRow
            label="Phone"
            value={tenant.person?.phone || "—"}
            icon={Phone}
          />
          <InfoRow
            label="Email"
            value={tenant.person?.email || "—"}
            icon={Mail}
          />
          {tenant.person?.permanent_address && (
            <InfoRow
              label="Address"
              value={[tenant.person.permanent_address, tenant.person.permanent_city, tenant.person.permanent_state].filter(Boolean).join(", ")}
              icon={MapPin}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Personal details are managed in the People module and shared across all roles (tenant, staff, visitor).
        </p>
      </DetailSection>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Assignment */}
        <DetailSection
          title="Room Assignment"
          description="Current accommodation details"
          icon={Home}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">Property *</Label>
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  options={properties.map((p) => ({ value: p.id, label: p.name }))}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_id">Room *</Label>
                <Select
                  id="room_id"
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleChange}
                  options={
                    availableRooms.length === 0
                      ? [{ value: "", label: "No available rooms" }]
                      : availableRooms.map((room) => ({
                          value: room.id,
                          label: `Room ${room.room_number} (${room.occupied_beds}/${room.total_beds} beds)`,
                        }))
                  }
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
          </div>
        </DetailSection>

        {/* Status & Verification */}
        <DetailSection
          title="Status & Verification"
          description="Tenancy status and document verification"
          icon={Shield}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "notice_period", label: "Notice Period" },
                    { value: "checked_out", label: "Checked Out" },
                  ]}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="police_verification_status">Police Verification</Label>
                <Select
                  id="police_verification_status"
                  name="police_verification_status"
                  value={formData.police_verification_status}
                  onChange={handleChange}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "submitted", label: "Submitted" },
                    { value: "verified", label: "Verified" },
                    { value: "na", label: "N/A" },
                  ]}
                  disabled={loading}
                />
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
          </div>
        </DetailSection>

        {/* Notes */}
        <DetailSection
          title="Tenancy Notes"
          description="Additional information about this tenancy"
          icon={FileText}
        >
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about this tenancy..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>
        </DetailSection>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/tenants/${params.id}`}>
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
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
