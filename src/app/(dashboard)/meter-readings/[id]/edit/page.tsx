"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gauge, Loader2, Home, Calculator } from "lucide-react"
import { toast } from "sonner"

interface Property {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  property_id: string
}

interface ChargeType {
  id: string
  name: string
  calculation_config: { rate_per_unit?: number } | null
}

interface MeterReadingRaw {
  id: string
  property_id: string
  room_id: string
  charge_type_id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  notes: string | null
}

export default function EditMeterReadingPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [originalReading, setOriginalReading] = useState<MeterReadingRaw | null>(null)

  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    charge_type_id: "",
    reading_date: "",
    reading_value: "",
    previous_reading: "",
    notes: "",
  })

  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch the existing reading
      const { data: readingData, error: readingError } = await supabase
        .from("meter_readings")
        .select("*")
        .eq("id", params.id)
        .single()

      if (readingError || !readingData) {
        console.error("Error fetching reading:", readingError)
        toast.error("Meter reading not found")
        router.push("/meter-readings")
        return
      }

      setOriginalReading(readingData as MeterReadingRaw)

      const [propertiesRes, roomsRes, chargeTypesRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
        supabase.from("charge_types").select("id, name, calculation_config").in("name", ["Electricity", "Water", "Gas", "electricity", "water", "gas"]).order("name"),
      ])

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
      }

      if (!roomsRes.error) {
        setRooms(roomsRes.data || [])
      }

      if (!chargeTypesRes.error && chargeTypesRes.data) {
        setChargeTypes(chargeTypesRes.data)
      }

      // Set form data from existing reading
      setFormData({
        property_id: readingData.property_id,
        room_id: readingData.room_id,
        charge_type_id: readingData.charge_type_id,
        reading_date: readingData.reading_date,
        reading_value: readingData.reading_value?.toString() || "",
        previous_reading: readingData.previous_reading?.toString() || "",
        notes: readingData.notes || "",
      })

      setLoadingData(false)
    }

    fetchData()
  }, [params.id, router])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      const filtered = rooms.filter((r) => r.property_id === formData.property_id)
      setFilteredRooms(filtered)
    }
  }, [formData.property_id, rooms])

  // Calculate units consumed
  useEffect(() => {
    if (formData.previous_reading && formData.reading_value) {
      const currentValue = parseFloat(formData.reading_value)
      const prevValue = parseFloat(formData.previous_reading)
      if (!isNaN(currentValue) && !isNaN(prevValue) && currentValue >= prevValue) {
        setCalculatedUnits(currentValue - prevValue)
      } else {
        setCalculatedUnits(null)
      }
    } else if (formData.reading_value && !formData.previous_reading) {
      setCalculatedUnits(null)
    } else {
      setCalculatedUnits(null)
    }
  }, [formData.reading_value, formData.previous_reading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id || !formData.room_id || !formData.reading_value || !formData.charge_type_id) {
      toast.error("Please fill in all required fields")
      return
    }

    const readingValue = parseFloat(formData.reading_value)
    if (isNaN(readingValue) || readingValue < 0) {
      toast.error("Please enter a valid reading value")
      return
    }

    const previousReading = formData.previous_reading ? parseFloat(formData.previous_reading) : null
    if (previousReading !== null && readingValue < previousReading) {
      toast.error("Current reading cannot be less than the previous reading")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("meter_readings")
        .update({
          property_id: formData.property_id,
          room_id: formData.room_id,
          charge_type_id: formData.charge_type_id,
          reading_date: formData.reading_date,
          reading_value: readingValue,
          previous_reading: previousReading,
          units_consumed: calculatedUnits,
          notes: formData.notes || null,
        })
        .eq("id", params.id)

      if (error) {
        console.error("Error updating meter reading:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      toast.success("Meter reading updated successfully!")
      router.push(`/meter-readings/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update meter reading. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const selectedChargeType = chargeTypes.find((ct) => ct.id === formData.charge_type_id)

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
        <Link href={`/meter-readings/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Meter Reading</h1>
          <p className="text-muted-foreground">Update meter reading details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Location</CardTitle>
                <CardDescription>Property and room</CardDescription>
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
                  <option value="">Select property</option>
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
                  disabled={loading || filteredRooms.length === 0}
                >
                  {filteredRooms.length === 0 ? (
                    <option value="">No rooms in this property</option>
                  ) : (
                    <>
                      <option value="">Select room</option>
                      {filteredRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          Room {room.room_number}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meter Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Gauge className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle>Meter Reading</CardTitle>
                <CardDescription>Update the meter values</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charge_type_id">Meter Type *</Label>
                <select
                  id="charge_type_id"
                  name="charge_type_id"
                  value={formData.charge_type_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading}
                >
                  <option value="">Select type</option>
                  {chargeTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading_date">Reading Date *</Label>
                <Input
                  id="reading_date"
                  name="reading_date"
                  type="date"
                  value={formData.reading_date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="previous_reading">Previous Reading</Label>
                <Input
                  id="previous_reading"
                  name="previous_reading"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 12000"
                  value={formData.previous_reading}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading_value">Current Reading *</Label>
                <Input
                  id="reading_value"
                  name="reading_value"
                  type="number"
                  min={formData.previous_reading ? parseFloat(formData.previous_reading) : 0}
                  step="0.01"
                  placeholder="e.g., 12345"
                  value={formData.reading_value}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Calculated Units */}
            {calculatedUnits !== null && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calculator className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-800">Units Consumed</p>
                    <p className="text-2xl font-bold text-green-700">
                      {calculatedUnits.toLocaleString()} {selectedChargeType?.name?.toLowerCase() === "electricity" ? "kWh" : selectedChargeType?.name?.toLowerCase() === "water" ? "L" : selectedChargeType?.name?.toLowerCase() === "gas" ? "m³" : "units"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href={`/meter-readings/${params.id}`}>
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
                <Gauge className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
