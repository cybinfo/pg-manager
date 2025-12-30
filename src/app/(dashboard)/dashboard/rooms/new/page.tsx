"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Home, Loader2, Building2, Info, Image } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"

interface Property {
  id: string
  name: string
}

interface RoomTypePricing {
  single: { rent: number; deposit: number }
  double: { rent: number; deposit: number }
  triple: { rent: number; deposit: number }
  dormitory: { rent: number; deposit: number }
}

const defaultRoomTypePricing: RoomTypePricing = {
  single: { rent: 8000, deposit: 16000 },
  double: { rent: 6000, deposit: 12000 },
  triple: { rent: 5000, deposit: 10000 },
  dormitory: { rent: 4000, deposit: 8000 },
}

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [roomTypePricing, setRoomTypePricing] = useState<RoomTypePricing>(defaultRoomTypePricing)

  const [formData, setFormData] = useState({
    property_id: "",
    room_number: "",
    room_type: "single",
    floor: "0",
    rent_amount: "",
    deposit_amount: "",
    total_beds: "1",
    // Amenities
    has_ac: false,
    has_attached_bathroom: false,
    has_wifi: false,
    has_tv: false,
    has_geyser: false,
    has_balcony: false,
    has_wardrobe: false,
    has_study_table: false,
    has_refrigerator: false,
    // Photos
    photos: [] as string[],
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch properties and owner config in parallel
      const [propertiesRes, configRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        user ? supabase.from("owner_config").select("room_type_pricing").eq("owner_id", user.id).single() : null,
      ])

      if (propertiesRes.error) {
        console.error("Error fetching properties:", propertiesRes.error)
        toast.error("Failed to load properties")
      } else {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      // Load room type pricing from owner config
      if (configRes?.data?.room_type_pricing) {
        const pricing = {
          ...defaultRoomTypePricing,
          ...configRes.data.room_type_pricing,
        }
        setRoomTypePricing(pricing)
        // Set initial rent/deposit based on default room type (single)
        setFormData((prev) => ({
          ...prev,
          rent_amount: pricing.single.rent.toString(),
          deposit_amount: pricing.single.deposit.toString(),
        }))
      } else {
        // Use defaults
        setFormData((prev) => ({
          ...prev,
          rent_amount: defaultRoomTypePricing.single.rent.toString(),
          deposit_amount: defaultRoomTypePricing.single.deposit.toString(),
        }))
      }

      setLoadingProperties(false)
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const handleRoomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roomType = e.target.value as keyof RoomTypePricing
    const pricing = roomTypePricing[roomType]
    const beds = roomTypeBedCounts[roomType] || 1

    setFormData((prev) => ({
      ...prev,
      room_type: roomType,
      rent_amount: pricing.rent.toString(),
      deposit_amount: pricing.deposit.toString(),
      total_beds: beds.toString(),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id || !formData.room_number || !formData.rent_amount) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Build amenities array from checkboxes
      const amenities = availableAmenities
        .filter((amenity) => formData[amenity.key as keyof typeof formData])
        .map((amenity) => amenity.label.split(" (")[0]) // "Air Conditioned" from "Air Conditioned (AC)"

      const { error } = await supabase.from("rooms").insert({
        owner_id: user.id,
        property_id: formData.property_id,
        room_number: formData.room_number,
        room_type: formData.room_type,
        floor: parseInt(formData.floor) || 0,
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        total_beds: parseInt(formData.total_beds) || 1,
        has_ac: formData.has_ac,
        has_attached_bathroom: formData.has_attached_bathroom,
        amenities: amenities,
        photos: formData.photos.length > 0 ? formData.photos : null,
      })

      if (error) {
        console.error("Error creating room:", error)
        if (error.code === "23505") {
          toast.error("A room with this number already exists in this property")
        } else {
          throw error
        }
        return
      }

      toast.success("Room created successfully!")
      router.push("/dashboard/rooms")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingProperties) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/rooms">
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
            <Link href="/dashboard/properties/new">
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
        <Link href="/dashboard/rooms">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  name="room_number"
                  placeholder="e.g., 101, A1, G-01"
                  value={formData.room_number}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type</Label>
                <select
                  id="room_type"
                  name="room_type"
                  value={formData.room_type}
                  onChange={handleRoomTypeChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading}
                >
                  <option value="single">Single (1 bed)</option>
                  <option value="double">Double (2 beds)</option>
                  <option value="triple">Triple (3 beds)</option>
                  <option value="dormitory">Dormitory (4+ beds)</option>
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
                  value={formData.floor}
                  onChange={handleChange}
                  disabled={loading}
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
                  value={formData.total_beds}
                  onChange={handleChange}
                  disabled={loading}
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="rent_amount"
                      name="rent_amount"
                      type="number"
                      min="0"
                      placeholder="e.g., 8000"
                      className="pl-8"
                      value={formData.rent_amount}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default: {formatCurrency(roomTypePricing[formData.room_type as keyof RoomTypePricing]?.rent || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Security Deposit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="deposit_amount"
                      name="deposit_amount"
                      type="number"
                      min="0"
                      placeholder="e.g., 16000"
                      className="pl-8"
                      value={formData.deposit_amount}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default: {formatCurrency(roomTypePricing[formData.room_type as keyof RoomTypePricing]?.deposit || 0)}
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
                      disabled={loading}
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
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Room Photos</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Add photos of the room (up to 8 photos)
              </p>
              <FileUpload
                bucket="room-photos"
                folder="rooms"
                value={formData.photos}
                onChange={(urls) => {
                  const urlArr = Array.isArray(urls) ? urls : urls ? [urls] : []
                  setFormData(prev => ({
                    ...prev,
                    photos: urlArr.slice(0, 8)
                  }))
                }}
                multiple
                accept="image/*"
              />
              {formData.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={photo}
                        alt={`Room photo ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== idx)
                          }))
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/dashboard/rooms">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
