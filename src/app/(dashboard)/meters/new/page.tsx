/**
 * Add New Meter Page
 *
 * Form to create a new meter with option to immediately assign to a room.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  DetailSection,
} from "@/components/ui/detail-components"
import { Select } from "@/components/ui/form-components"
import {
  Gauge,
  Zap,
  Droplets,
  Building2,
  Home,
  Save,
  Loader2,
} from "lucide-react"
import { showWarning } from "@/lib/toast-helpers"
import { PermissionGuard } from "@/components/auth"
import {
  MeterType,
  METER_TYPES,
  ASSIGNMENT_REASONS,
  AssignmentReason,
  METER_TYPE_CONFIG,
} from "@/types/meters.types"
import { getTodayISO } from "@/lib/date-helpers"

// ============================================
// Types
// ============================================

interface Property {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  property_id: string
}

// ============================================
// Component
// ============================================

export default function NewMeterPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const {
    formData, setFormData,
    handleSubmit,
    saving,
    searchParams,
  } = useFormPage({
    table: "meters",
    initialData: {
      property_id: "",
      meter_number: "",
      meter_type: "electricity" as string,
      initial_reading: "0",
      make: "",
      model: "",
      installation_date: "",
      notes: "",
      // Assignment options
      assign_to_room: false as boolean,
      room_id: "",
      assignment_reason: "initial" as string,
    },
    redirectTo: "/meters",
    successMessage: "Meter created successfully",
    errorMessage: "Failed to create meter",
    validate: (data) => {
      const newErrors: Record<string, string> = {}

      if (!data.property_id) {
        newErrors.property_id = "Property is required"
      }

      if (!(data.meter_number as string).trim()) {
        newErrors.meter_number = "Meter number is required"
      }

      if (data.assign_to_room && !data.room_id) {
        newErrors.room_id = "Please select a room to assign"
      }

      setErrors(newErrors)
      if (Object.keys(newErrors).length > 0) {
        return "Please fix the errors before submitting"
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Check for duplicate meter number
      const { data: existing } = await supabase
        .from("meters")
        .select("id, meter_number")
        .eq("owner_id", userId)
        .eq("meter_number", (data.meter_number as string).trim())
        .single()

      if (existing) {
        throw new Error(`A meter with number "${data.meter_number}" already exists`)
      }

      // Create the meter
      const { data: meterData, error: meterError } = await supabase
        .from("meters")
        .insert({
          owner_id: userId,
          created_by: userId,
          property_id: data.property_id,
          meter_number: (data.meter_number as string).trim(),
          meter_type: data.meter_type,
          initial_reading: parseFloat(data.initial_reading as string) || 0,
          make: (data.make as string).trim() || null,
          model: (data.model as string).trim() || null,
          installation_date: data.installation_date || null,
          notes: (data.notes as string).trim() || null,
          status: "active",
        })
        .select()
        .single()

      if (meterError) {
        throw new Error("Failed to create meter")
      }

      // If assigning to room, create assignment
      if (data.assign_to_room && data.room_id) {
        const { error: assignError } = await supabase
          .from("meter_assignments")
          .insert({
            owner_id: userId,
            meter_id: meterData.id,
            room_id: data.room_id,
            start_date: getTodayISO(),
            start_reading: parseFloat(data.initial_reading as string) || 0,
            reason: data.assignment_reason,
          })

        if (assignError) {
          console.error("Error assigning meter:", assignError)
          showWarning("Meter created but failed to assign to room")
        }
      }

      return `/meters/${meterData.id}`
    },
  })

  const preselectedPropertyId = searchParams.get("property_id")
  const preselectedRoomId = searchParams.get("room_id")

  // Pre-fill from URL params
  useEffect(() => {
    const updates: Record<string, unknown> = {}
    if (preselectedPropertyId && !formData.property_id) updates.property_id = preselectedPropertyId
    if (preselectedRoomId && !formData.room_id) {
      updates.room_id = preselectedRoomId
      updates.assign_to_room = true
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }))
    }
  }, [preselectedPropertyId, preselectedRoomId, formData.property_id, formData.room_id, setFormData])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
      ])

      if (propertiesRes.data) {
        setProperties(propertiesRes.data)
        // Auto-select first property if not preselected
        if (!preselectedPropertyId && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (roomsRes.data) {
        setRooms(roomsRes.data)
      }
    }

    fetchData()
  }, [preselectedPropertyId, setFormData])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      const filtered = rooms.filter((r) => r.property_id === formData.property_id)
      setFilteredRooms(filtered)
      // Clear room selection if it's not in the filtered list
      if (formData.room_id && !filtered.some((r) => r.id === formData.room_id)) {
        setFormData((prev) => ({ ...prev, room_id: "" }))
      }
    } else {
      setFilteredRooms([])
    }
  }, [formData.property_id, rooms, formData.room_id, setFormData])

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const typeConfig = METER_TYPE_CONFIG[formData.meter_type as MeterType] || METER_TYPE_CONFIG.electricity
  const TypeIcon = formData.meter_type === "water" ? Droplets : formData.meter_type === "gas" ? Gauge : Zap

  return (
    <PermissionGuard permission="meters.create">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Hero Header */}
        <DetailHero
          title="Add New Meter"
          subtitle="Register a new meter in the system"
          backHref="/meters"
          backLabel="All Meters"
          avatar={
            <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
              <TypeIcon className={`h-8 w-8 ${typeConfig.color}`} />
            </div>
          }
        />

        {/* Basic Information */}
        <DetailSection
          title="Meter Information"
          description="Basic meter details"
          icon={Gauge}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <Select
                value={formData.property_id as string}
                onChange={(e) => updateField("property_id", e.target.value)}
                options={[
                  { value: "", label: "Select property" },
                  ...properties.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              {errors.property_id && <p className="text-sm text-destructive">{errors.property_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meter_number">Meter Number *</Label>
                <Input
                  id="meter_number"
                  value={formData.meter_number as string}
                  onChange={(e) => updateField("meter_number", e.target.value)}
                  placeholder="e.g., E-001, W-101"
                  className={errors.meter_number ? "border-destructive" : ""}
                />
                {errors.meter_number && <p className="text-sm text-destructive">{errors.meter_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meter_type">Meter Type *</Label>
                <Select
                  value={formData.meter_type as string}
                  onChange={(e) => updateField("meter_type", e.target.value)}
                  options={METER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial_reading">Initial Reading</Label>
              <Input
                id="initial_reading"
                type="number"
                value={formData.initial_reading as string}
                onChange={(e) => updateField("initial_reading", e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                The reading when this meter was first registered or installed
              </p>
            </div>
          </div>
        </DetailSection>

        {/* Additional Details */}
        <DetailSection
          title="Additional Details"
          description="Optional meter information"
          icon={Building2}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make / Manufacturer</Label>
                <Input
                  id="make"
                  value={formData.make as string}
                  onChange={(e) => updateField("make", e.target.value)}
                  placeholder="e.g., Secure, HPL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model as string}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="e.g., Sprint 350"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installation_date">Installation Date</Label>
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date as string}
                onChange={(e) => updateField("installation_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes as string}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Any additional notes about this meter..."
                rows={3}
              />
            </div>
          </div>
        </DetailSection>

        {/* Room Assignment */}
        <DetailSection
          title="Room Assignment"
          description="Optionally assign this meter to a room now"
          icon={Home}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="assign_to_room"
                type="checkbox"
                checked={formData.assign_to_room as boolean}
                onChange={(e) => updateField("assign_to_room", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="assign_to_room" className="font-normal cursor-pointer">
                Assign to a room immediately
              </Label>
            </div>

            {formData.assign_to_room && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="room_id">Room *</Label>
                  <Select
                    value={formData.room_id as string}
                    onChange={(e) => updateField("room_id", e.target.value)}
                    options={[
                      { value: "", label: filteredRooms.length === 0 ? "No rooms available" : "Select room" },
                      ...filteredRooms.map((r) => ({ value: r.id, label: `Room ${r.room_number}` })),
                    ]}
                    disabled={filteredRooms.length === 0}
                  />
                  {errors.room_id && <p className="text-sm text-destructive">{errors.room_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment_reason">Assignment Reason</Label>
                  <Select
                    value={formData.assignment_reason as string}
                    onChange={(e) => updateField("assignment_reason", e.target.value)}
                    options={ASSIGNMENT_REASONS.map((r) => ({ value: r.value, label: r.label }))}
                  />
                </div>
              </>
            )}
          </div>
        </DetailSection>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/meters">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Meter
              </>
            )}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  )
}
