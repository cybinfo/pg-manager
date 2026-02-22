"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Home, Loader2 } from "lucide-react"
import { PhotoGallery } from "@/components/forms"

interface Property {
  id: string
  name: string
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

// Extended amenities list - same as new room page
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

export default function EditRoomPage() {
  const params = useParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [roomTypes, setRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
  } = useFormEditPage({
    table: "rooms",
    id: params.id as string,
    initialData: {
      property_id: "",
      room_number: "",
      room_type: "single",
      floor: "0",
      rent_amount: "",
      deposit_amount: "",
      total_beds: "1",
      has_ac: false,
      has_attached_bathroom: false,
      has_wifi: false,
      has_tv: false,
      has_geyser: false,
      has_balcony: false,
      has_wardrobe: false,
      has_study_table: false,
      has_refrigerator: false,
      photos: [] as string[],
    },
    redirectTo: `/rooms/${params.id}`,
    successMessage: "Room updated successfully!",
    errorMessage: "Failed to update room",
    notFoundRedirect: "/rooms",
    mapToForm: (record) => ({
      property_id: (record.property_id as string) || "",
      room_number: (record.room_number as string) || "",
      room_type: (record.room_type as string) || "single",
      floor: ((record.floor as number) || 0).toString(),
      rent_amount: (record.rent_amount as number).toString(),
      deposit_amount: ((record.deposit_amount as number) || 0).toString(),
      total_beds: ((record.total_beds as number) || 1).toString(),
      has_ac: (record.has_ac as boolean) || false,
      has_attached_bathroom: (record.has_attached_bathroom as boolean) || false,
      has_wifi: (record.has_wifi as boolean) || false,
      has_tv: (record.has_tv as boolean) || false,
      has_geyser: (record.has_geyser as boolean) || false,
      has_balcony: (record.has_balcony as boolean) || false,
      has_wardrobe: (record.has_wardrobe as boolean) || false,
      has_study_table: (record.has_study_table as boolean) || false,
      has_refrigerator: (record.has_refrigerator as boolean) || false,
      photos: (record.photos as string[]) || [],
    }),
    validate: (data) => {
      if (!data.property_id || !data.room_number || !data.rent_amount) {
        return "Please fill in all required fields"
      }
      return null
    },
    transform: (data) => {
      // Build amenities array from checkboxes
      const amenities = availableAmenities
        .filter((amenity) => data[amenity.key as keyof typeof data])
        .map((amenity) => amenity.label.split(" (")[0])

      return {
        property_id: data.property_id,
        room_number: data.room_number,
        room_type: data.room_type,
        floor: parseInt(data.floor as string) || 0,
        rent_amount: parseFloat(data.rent_amount as string),
        deposit_amount: parseFloat(data.deposit_amount as string) || 0,
        total_beds: parseInt(data.total_beds as string) || 1,
        has_ac: data.has_ac,
        has_attached_bathroom: data.has_attached_bathroom,
        has_wifi: data.has_wifi,
        has_tv: data.has_tv,
        has_geyser: data.has_geyser,
        has_balcony: data.has_balcony,
        has_wardrobe: data.has_wardrobe,
        has_study_table: data.has_study_table,
        has_refrigerator: data.has_refrigerator,
        amenities: amenities,
        photos: (data.photos as string[]).length > 0 ? data.photos : null,
      }
    },
  })

  // Fetch properties and owner config
  useEffect(() => {
    const fetchReferenceData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [propertiesRes, configRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        user ? supabase.from("owner_config").select("room_types").eq("owner_id", user.id).single() : null,
      ])

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
      }

      // Load configurable room types from owner config
      if (configRes?.data?.room_types && Array.isArray(configRes.data.room_types)) {
        setRoomTypes(configRes.data.room_types)
      }
    }

    fetchReferenceData()
  }, [])

  if (loading) {
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
        <Link href={`/rooms/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Room</h1>
          <p className="text-muted-foreground">Update room details</p>
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
                <CardDescription>Update the room information</CardDescription>
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
                onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={saving}
                >
                  {roomTypes.filter(rt => rt.is_enabled).sort((a, b) => a.display_order - b.display_order).map((rt) => (
                    <option key={rt.code} value={rt.code}>
                      {rt.name}
                    </option>
                  ))}
                  {/* Also include current room type even if disabled (for existing rooms) */}
                  {!roomTypes.find(rt => rt.code === formData.room_type && rt.is_enabled) && formData.room_type && (
                    <option value={formData.room_type as string}>
                      {roomTypes.find(rt => rt.code === formData.room_type)?.name || formData.room_type}
                    </option>
                  )}
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
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Monthly Rent (₹) *</Label>
                  <Input
                    id="rent_amount"
                    name="rent_amount"
                    type="number"
                    min="0"
                    placeholder="e.g., 8000"
                    value={formData.rent_amount as string}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Security Deposit (₹)</Label>
                  <Input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    min="0"
                    placeholder="e.g., 16000"
                    value={formData.deposit_amount as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
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
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{amenity.label}</span>
                  </label>
                ))}
              </div>
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
          <Link href={`/rooms/${params.id}`}>
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
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
