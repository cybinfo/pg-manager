"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
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
  Loader2,
  Home,
  Shield,
  FileText,
  Phone,
  Mail,
  Save,
  User,
  ExternalLink,
  MapPin,
} from "lucide-react"
import { transformJoin } from "@/lib/supabase/transforms"
import { PermissionGuard } from "@/components/auth"
import { POLICE_VERIFICATION_STATUS_OPTIONS } from "@/lib/status"

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

export default function EditTenantPage() {
  return (
    <PermissionGuard permission="tenants.edit">
      <EditTenantContent />
    </PermissionGuard>
  )
}

function EditTenantContent() {
  const params = useParams()
  const id = params.id as string
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [originalRoomId, setOriginalRoomId] = useState<string>("")

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    setLoading,
  } = useFormEditPage({
    table: "tenants",
    id,
    select: `
      id, person_id, property_id, room_id, check_in_date,
      monthly_rent, security_deposit, status, police_verification_status,
      agreement_signed, notes,
      person:people(id, name, phone, email, photo_url, permanent_address, permanent_city, permanent_state)
    `,
    initialData: {
      property_id: "",
      room_id: "",
      check_in_date: "",
      monthly_rent: "",
      security_deposit: "",
      status: "active",
      police_verification_status: "pending",
      agreement_signed: false as boolean,
      notes: "",
    },
    redirectTo: `/tenants/${id}`,
    successMessage: "Tenant updated successfully!",
    errorMessage: "Failed to update tenant",
    mapToForm: (rec) => {
      // Save original room ID for filtering
      setOriginalRoomId((rec.room_id as string) || "")
      return {
        property_id: (rec.property_id as string) || "",
        room_id: (rec.room_id as string) || "",
        check_in_date: (rec.check_in_date as string) || "",
        monthly_rent: rec.monthly_rent?.toString() || "",
        security_deposit: (rec.security_deposit || 0).toString(),
        status: (rec.status as string) || "active",
        police_verification_status: (rec.police_verification_status as string) || "pending",
        agreement_signed: (rec.agreement_signed as boolean) || false,
        notes: (rec.notes as string) || "",
      }
    },
    validate: (data) => {
      if (!data.property_id || !data.room_id || !data.monthly_rent) {
        return "Please fill in all required fields"
      }
      return null
    },
    transform: (data): Record<string, unknown> => ({
      property_id: data.property_id,
      room_id: data.room_id,
      check_in_date: data.check_in_date,
      monthly_rent: parseFloat(data.monthly_rent as string),
      security_deposit: parseFloat(data.security_deposit as string) || 0,
      status: data.status,
      police_verification_status: data.police_verification_status,
      agreement_signed: data.agreement_signed,
      notes: data.notes || null,
    }),
  })

  // Fetch properties and rooms
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("*").order("room_number"),
      ])
      if (!propertiesRes.error) setProperties(propertiesRes.data || [])
      if (!roomsRes.error) setRooms(roomsRes.data || [])
    }
    fetchData()
  }, [])

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

  // Get person data from record
  const person = record ? transformJoin(record.person as Record<string, unknown>) as Record<string, unknown> | null : null

  if (loading) {
    return <PageLoading message="Loading tenant details..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <DetailHero
        title="Edit Tenancy"
        subtitle={`Update tenancy details for ${(person?.name as string) || "Tenant"}`}
        backHref={`/tenants/${id}`}
        backLabel="Back to Tenant"
        avatar={
          <Avatar
            name={(person?.name as string) || "T"}
            src={person?.photo_url as string}
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
          record?.person_id ? (
            <Link href={`/people/${record.person_id as string}/edit`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Edit in People
              </Button>
            </Link>
          ) : undefined
        }
      >
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <InfoRow
            label="Name"
            value={(person?.name as string) || "\u2014"}
            icon={User}
          />
          <InfoRow
            label="Phone"
            value={(person?.phone as string) || "\u2014"}
            icon={Phone}
          />
          <InfoRow
            label="Email"
            value={(person?.email as string) || "\u2014"}
            icon={Mail}
          />
          {person?.permanent_address ? (
            <InfoRow
              label="Address"
              value={[person.permanent_address as string, person.permanent_city as string, person.permanent_state as string].filter(Boolean).join(", ")}
              icon={MapPin}
            />
          ) : null}
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
                  value={formData.property_id as string}
                  onChange={handleChange}
                  options={properties.map((p) => ({ value: p.id, label: p.name }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_id">Room *</Label>
                <Select
                  id="room_id"
                  name="room_id"
                  value={formData.room_id as string}
                  onChange={handleChange}
                  options={
                    availableRooms.length === 0
                      ? [{ value: "", label: "No available rooms" }]
                      : availableRooms.map((room) => ({
                          value: room.id,
                          label: `Room ${room.room_number} (${room.occupied_beds}/${room.total_beds} beds)`,
                        }))
                  }
                  disabled={saving || availableRooms.length === 0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_in_date">Check-in Date *</Label>
              <Input
                id="check_in_date"
                name="check_in_date"
                type="date"
                value={formData.check_in_date as string}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">Monthly Rent (Rs.) *</Label>
                <Input
                  id="monthly_rent"
                  name="monthly_rent"
                  type="number"
                  min="0"
                  placeholder="e.g., 8000"
                  value={formData.monthly_rent as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_deposit">Security Deposit (Rs.)</Label>
                <Input
                  id="security_deposit"
                  name="security_deposit"
                  type="number"
                  min="0"
                  placeholder="e.g., 16000"
                  value={formData.security_deposit as string}
                  onChange={handleChange}
                  disabled={saving}
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
                  value={formData.status as string}
                  onChange={handleChange}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "notice_period", label: "Notice Period" },
                    { value: "checked_out", label: "Checked Out" },
                  ]}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="police_verification_status">Police Verification</Label>
                <Select
                  id="police_verification_status"
                  name="police_verification_status"
                  value={formData.police_verification_status as string}
                  onChange={handleChange}
                  options={POLICE_VERIFICATION_STATUS_OPTIONS}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="agreement_signed"
                name="agreement_signed"
                type="checkbox"
                checked={formData.agreement_signed as boolean}
                onChange={handleChange}
                disabled={saving}
                className="h-4 w-4 rounded border-border"
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
              value={formData.notes as string}
              onChange={handleChange}
              disabled={saving}
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>
        </DetailSection>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/tenants/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
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
