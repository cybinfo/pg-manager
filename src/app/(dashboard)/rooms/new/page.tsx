"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Home, Building2, Info } from "lucide-react"
import { DetailHero, DetailSection } from "@/components/ui"
import { Select, FormField } from "@/components/ui/form-components"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField, requiredSelect, requiredAmount } from "@/lib/validation"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"

// Shared form components
import { PhotoGallery } from "@/components/forms"
import { PermissionGuard } from "@/components/auth"
import { withCreatedBy } from "@/lib/audit"
import { ConfigurableRoomType, defaultConfigurableRoomTypes } from "@/types/rooms.types"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"
import { AVAILABLE_AMENITIES } from "@/lib/constants/form-options"

type Property = PropertyOption & { website_config?: { property_type?: string } | null }

const roomTypeBedCounts: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  dormitory: 6,
}


export default function NewRoomPage() {
  return (
    <PermissionGuard permission="rooms.create">
      <NewRoomContent />
    </PermissionGuard>
  )
}

function NewRoomContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/rooms" })
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [roomTypes, setRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    validateField,
  } = useFormPage({
    table: "rooms",
    initialData: {
      entity_id: "",
      room_number: "",
      room_type: "single",
      floor: "0",
      rent_amount: "",
      deposit_amount: "",
      total_beds: "1",
      // Amenities
      has_ac: false as boolean,
      has_attached_bathroom: false as boolean,
      has_wifi: false as boolean,
      has_tv: false as boolean,
      has_geyser: false as boolean,
      has_balcony: false as boolean,
      has_wardrobe: false as boolean,
      has_study_table: false as boolean,
      has_refrigerator: false as boolean,
      // Photos
      photos: [] as string[],
    },
    redirectTo: "/rooms",
    successMessage: "Room created successfully!",
    errorMessage: "Failed to create room",
    useCreatedBy: false,
    validationSchema: {
      entity_id: requiredSelect("Property"),
      room_number: requiredField("Room number"),
      rent_amount: requiredAmount("Monthly rent"),
    },
    transform: (data, userId) => {
      // Build amenities array from checkboxes
      const amenities = AVAILABLE_AMENITIES
        .filter((amenity) => data[amenity.key as keyof typeof data])
        .map((amenity) => amenity.label.split(" (")[0])

      return withCreatedBy({
        owner_id: userId,
        entity_id: data.entity_id,
        room_number: data.room_number,
        room_type: data.room_type,
        floor: parseInt(data.floor as string) || 0,
        rent_amount: parseFloat(data.rent_amount as string),
        deposit_amount: parseFloat(data.deposit_amount as string) || 0,
        total_beds: parseInt(data.total_beds as string) || 1,
        has_ac: data.has_ac,
        has_attached_bathroom: data.has_attached_bathroom,
        amenities: amenities,
        photos: (data.photos as string[]).length > 0 ? data.photos : null,
      }, userId) as unknown as Record<string, unknown>
    },
    addOwnerId: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch properties and owner config (for room_types) in parallel
      const [propertiesRes, configRes] = await Promise.all([
        supabase.from("entities").select("id, name, website_config").eq("type", "pg").order("name"),
        user ? supabase.from("owner_config").select("room_types").eq("owner_id", user.id).single() : null,
      ])

      if (propertiesRes.error) {
        logger.error("Error fetching properties:", { detail: propertiesRes.error })
      } else {
        setProperties(propertiesRes.data || [])

        // Load configurable room types from owner config
        let loadedRoomTypes = defaultConfigurableRoomTypes
        if (configRes?.data?.room_types && Array.isArray(configRes.data.room_types)) {
          loadedRoomTypes = configRes.data.room_types
          setRoomTypes(loadedRoomTypes)
        }

        // Set initial property and pricing from first enabled room type
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          const firstProperty = propertiesRes.data[0]
          const enabledRoomTypes = loadedRoomTypes.filter(rt => rt.is_enabled)
          const firstRoomType = enabledRoomTypes[0] || loadedRoomTypes[0]

          setFormData((prev) => ({
            ...prev,
            entity_id: firstProperty.id,
            room_type: firstRoomType?.code || "single",
            rent_amount: (firstRoomType?.default_rent || 8000).toString(),
            deposit_amount: (firstRoomType?.default_deposit || 8000).toString(),
          }))
        }
      }

      setLoadingProperties(false)
    }

    fetchData()
  }, [setFormData, user])

  // Handle property selection change
  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value
    setFormData((prev) => ({
      ...prev,
      entity_id: propertyId,
    }))
  }

  // Handle room type selection change - update pricing from configurable room types
  const handleRoomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roomTypeCode = e.target.value
    const selectedRoomType = roomTypes.find(rt => rt.code === roomTypeCode)
    const beds = roomTypeBedCounts[roomTypeCode] || 1

    setFormData((prev) => ({
      ...prev,
      room_type: roomTypeCode,
      rent_amount: (selectedRoomType?.default_rent || 8000).toString(),
      deposit_amount: (selectedRoomType?.default_deposit || 8000).toString(),
      total_beds: beds.toString(),
    }))
  }

  // Get current room type for display
  const currentRoomType = roomTypes.find(rt => rt.code === formData.room_type)

  if (loadingProperties) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <DetailHero
          title="Add Room"
          subtitle="Create a new room in your property"
          backHref={backHref}
          backLabel="All Rooms"
          icon={Home}
          breadcrumbs={[
            { label: "Rooms", href: "/rooms" },
            { label: "Add Room" },
          ]}
        />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property before adding rooms
            </p>
            <Link href="/entities/new">
              <Button>Add Property First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Room"
        subtitle="Create a new room in your property"
        backHref={backHref}
        backLabel="All Rooms"
        icon={Home}
        breadcrumbs={[
          { label: "Rooms", href: "/rooms" },
          { label: "Add Room" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Room Details" description="Enter the room information" icon={Home}>
            {/* Property Selection */}
            <FormField label="Property" htmlFor="entity_id" required error={errors.entity_id}>
              <Select
                id="entity_id"
                name="entity_id"
                value={formData.entity_id as string}
                onChange={handlePropertyChange}
                disabled={saving}
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.name,
                }))}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Room Number" htmlFor="room_number" required error={errors.room_number}>
                <Input
                  id="room_number"
                  name="room_number"
                  placeholder="e.g., 101, A1, G-01"
                  value={formData.room_number as string}
                  onChange={handleChange}
                  onBlur={() => validateField("room_number")}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Room Type" htmlFor="room_type">
                <Select
                  id="room_type"
                  name="room_type"
                  value={formData.room_type as string}
                  onChange={handleRoomTypeChange}
                  disabled={saving}
                  options={roomTypes.filter(rt => rt.is_enabled).sort((a, b) => a.display_order - b.display_order).map((rt) => ({
                    value: rt.code,
                    label: `${rt.name} (${roomTypeBedCounts[rt.code] || 1} bed${(roomTypeBedCounts[rt.code] || 1) > 1 ? 's' : ''})`,
                  }))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Floor" htmlFor="floor">
                <Input
                  id="floor"
                  name="floor"
                  type="number"
                  min="0"
                  placeholder="e.g., 0, 1, 2"
                  value={formData.floor as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Total Beds" htmlFor="total_beds" hint="Auto-set based on room type (adjustable)">
                <Input
                  id="total_beds"
                  name="total_beds"
                  type="number"
                  min="1"
                  placeholder="e.g., 1, 2, 3"
                  value={formData.total_beds as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Pricing</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>Auto-filled from Settings</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Monthly Rent" htmlFor="rent_amount" required error={errors.rent_amount} hint={`Default: ${formatCurrency(currentRoomType?.default_rent || 0)}`}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rs.</span>
                    <Input
                      id="rent_amount"
                      name="rent_amount"
                      type="number"
                      min="0"
                      placeholder="e.g., 8000"
                      className="pl-8"
                      value={formData.rent_amount as string}
                      onChange={handleChange}
                      onBlur={() => validateField("rent_amount")}
                      disabled={saving}
                    />
                  </div>
                </FormField>
                <FormField label="Security Deposit" htmlFor="deposit_amount" hint={`Default: ${formatCurrency(currentRoomType?.default_deposit || 0)}`}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rs.</span>
                    <Input
                      id="deposit_amount"
                      name="deposit_amount"
                      type="number"
                      min="0"
                      placeholder="e.g., 16000"
                      className="pl-8"
                      value={formData.deposit_amount as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </FormField>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_AMENITIES.map((amenity) => (
                  <label
                    key={amenity.key}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name={amenity.key}
                      checked={formData[amenity.key as keyof typeof formData] as boolean}
                      onChange={handleChange}
                      disabled={saving}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{amenity.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configure available amenities in Settings → Default Settings
              </p>
            </div>

            {/* Room Photos Section */}
            <div className="border-t pt-4 mt-4">
              <PhotoGallery
                photos={formData.photos as string[]}
                onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                label="Room Photos"
                description="Add photos of the room (up to 8 photos)"
                maxPhotos={8}
                bucket="room-photos"
                folder="rooms"
                disabled={saving}
              />
            </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/rooms">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </form>
    </div>
  )
}
