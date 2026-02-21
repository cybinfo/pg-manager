"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Home, Loader2, Building2, Info } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"

// Shared form components
import { PhotoGallery } from "@/components/forms"

interface Property {
  id: string
  name: string
  website_config?: { property_type?: string } | null
}

// Configurable room type from Settings
interface ConfigurableRoomType {
  code: string
  name: string
  default_rent: number
  default_deposit: number
  is_enabled: boolean
  display_order: number
}

const defaultConfigurableRoomTypes: ConfigurableRoomType[] = [
  { code: "single", name: "Single", default_rent: 8000, default_deposit: 8000, is_enabled: true, display_order: 1 },
  { code: "double", name: "Double Sharing", default_rent: 6000, default_deposit: 6000, is_enabled: true, display_order: 2 },
  { code: "triple", name: "Triple Sharing", default_rent: 5000, default_deposit: 5000, is_enabled: true, display_order: 3 },
  { code: "dormitory", name: "Dormitory", default_rent: 4000, default_deposit: 4000, is_enabled: false, display_order: 4 },
]

const roomTypeBedCounts: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  dormitory: 6,
}

// Extended amenities list
const availableAmenities = [
  { key: "has_ac", label: "Air Conditioned (AC)" },
  { key: "has_attached_bathroom", label: "Attached Bathroom" },
  { key: "has_wifi", label: "WiFi" },
  { key: "has_tv", label: "TV" },
  { key: "has_geyser", label: "Geyser/Hot Water" },
  { key: "has_balcony", label: "Balcony" },
  { key: "has_wardrobe", label: "Wardrobe" },
  { key: "has_study_table", label: "Study Table" },
  { key: "has_refrigerator", label: "Refrigerator" },
]

export default function NewRoomPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [roomTypes, setRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
  } = useFormPage({
    table: "rooms",
    initialData: {
      property_id: "",
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
    validate: (data) => {
      if (!data.property_id || !data.room_number || !data.rent_amount) {
        return "Please fill in all required fields"
      }
      return null
    },
    transform: (data, userId) => {
      // Build amenities array from checkboxes
      const amenities = availableAmenities
        .filter((amenity) => data[amenity.key as keyof typeof data])
        .map((amenity) => amenity.label.split(" (")[0])

      return {
        owner_id: userId,
        created_by: userId,
        property_id: data.property_id,
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
      }
    },
    addOwnerId: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch properties and owner config (for room_types) in parallel
      const [propertiesRes, configRes] = await Promise.all([
        supabase.from("properties").select("id, name, website_config").order("name"),
        user ? supabase.from("owner_config").select("room_types").eq("owner_id", user.id).single() : null,
      ])

      if (propertiesRes.error) {
        console.error("Error fetching properties:", propertiesRes.error)
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
            property_id: firstProperty.id,
            room_type: firstRoomType?.code || "single",
            rent_amount: (firstRoomType?.default_rent || 8000).toString(),
            deposit_amount: (firstRoomType?.default_deposit || 8000).toString(),
          }))
        }
      }

      setLoadingProperties(false)
    }

    fetchData()
  }, [setFormData])

  // Handle property selection change
  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value
    setFormData((prev) => ({
      ...prev,
      property_id: propertyId,
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
        <div className="flex items-center gap-4">
          <Link href="/rooms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Add Room</h1>
            <p className="text-muted-foreground">Create a new room in your property</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property before adding rooms
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
        <Link href="/rooms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Room</h1>
          <p className="text-muted-foreground">Create a new room in your property</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Room Details</CardTitle>
                <CardDescription>Enter the room information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Selection */}
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <select
                id="property_id"
                name="property_id"
                value={formData.property_id as string}
                onChange={handlePropertyChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                required
                disabled={saving}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  name="room_number"
                  placeholder="e.g., 101, A1, G-01"
                  value={formData.room_number as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type</Label>
                <select
                  id="room_type"
                  name="room_type"
                  value={formData.room_type as string}
                  onChange={handleRoomTypeChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={saving}
                >
                  {roomTypes.filter(rt => rt.is_enabled).sort((a, b) => a.display_order - b.display_order).map((rt) => (
                    <option key={rt.code} value={rt.code}>
                      {rt.name} ({roomTypeBedCounts[rt.code] || 1} bed{(roomTypeBedCounts[rt.code] || 1) > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_beds">Total Beds</Label>
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
                <p className="text-xs text-muted-foreground">
                  Auto-set based on room type (adjustable)
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Pricing</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>Auto-filled from Settings</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Monthly Rent *</Label>
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
                      required
                      disabled={saving}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default: {formatCurrency(currentRoomType?.default_rent || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Security Deposit</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Default: {formatCurrency(currentRoomType?.default_deposit || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableAmenities.map((amenity) => (
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
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/rooms">
            <Button type="button" variant="outline" disabled={saving}>
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
              "Create Room"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
