"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gauge, Loader2, Calculator, Zap, Droplets, Building2, Home } from "lucide-react"
import { toast } from "sonner"
import { PageLoader } from "@/components/ui/page-loader"
import { formatDate } from "@/lib/format"

interface MeterReading {
  id: string
  meter_id: string
  property_id: string
  room_id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  notes: string | null
  meter: {
    id: string
    meter_number: string
    meter_type: string
  } | null
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

export default function EditMeterReadingPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [reading, setReading] = useState<MeterReading | null>(null)

  const [formData, setFormData] = useState({
    reading_date: "",
    reading_value: "",
    notes: "",
  })

  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("meter_readings")
        .select(`
          *,
          meter:meters(id, meter_number, meter_type),
          property:properties(id, name),
          room:rooms(id, room_number)
        `)
        .eq("id", params.id)
        .single()

      if (error || !data) {
        console.error("Error fetching reading:", error)
        toast.error("Meter reading not found")
        router.push("/meter-readings")
        return
      }

      // Transform joins
      const transformedData: MeterReading = {
        ...data,
        meter: Array.isArray(data.meter) ? data.meter[0] : data.meter,
        property: Array.isArray(data.property) ? data.property[0] : data.property,
        room: Array.isArray(data.room) ? data.room[0] : data.room,
      }

      setReading(transformedData)
      setFormData({
        reading_date: data.reading_date,
        reading_value: data.reading_value?.toString() || "",
        notes: data.notes || "",
      })

      setLoadingData(false)
    }

    fetchData()
  }, [params.id, router])

  // Calculate units consumed
  useEffect(() => {
    if (reading && reading.previous_reading !== null && formData.reading_value) {
      const currentValue = parseFloat(formData.reading_value)
      const prevValue = reading.previous_reading
      if (!isNaN(currentValue) && currentValue >= prevValue) {
        setCalculatedUnits(currentValue - prevValue)
      } else {
        setCalculatedUnits(null)
      }
    } else {
      setCalculatedUnits(null)
    }
  }, [formData.reading_value, reading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reading_value) {
      toast.error("Please enter a reading value")
      return
    }

    const readingValue = parseFloat(formData.reading_value)
    if (isNaN(readingValue) || readingValue < 0) {
      toast.error("Please enter a valid reading value")
      return
    }

    if (reading && reading.previous_reading !== null && readingValue < reading.previous_reading) {
      toast.error("Current reading cannot be less than the previous reading")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("meter_readings")
        .update({
          reading_date: formData.reading_date,
          reading_value: readingValue,
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

  if (loadingData) {
    return <PageLoader />
  }

  if (!reading) {
    return null
  }

  const meterType = reading.meter?.meter_type || "electricity"

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
          <p className="text-muted-foreground">Update reading details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meter Info (Read-only) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${meterType === "electricity" ? "bg-yellow-100" : meterType === "water" ? "bg-blue-100" : "bg-orange-100"}`}>
                {meterType === "electricity" && <Zap className="h-5 w-5 text-yellow-600" />}
                {meterType === "water" && <Droplets className="h-5 w-5 text-blue-600" />}
                {meterType === "gas" && <Gauge className="h-5 w-5 text-orange-600" />}
              </div>
              <div>
                <CardTitle>Meter Information</CardTitle>
                <CardDescription>This reading is linked to the following meter</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{reading.meter?.meter_number || "Unknown Meter"}</span>
                <span className="text-sm text-muted-foreground capitalize">({meterType})</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {reading.property?.name || "Unknown Property"}
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Room {reading.room?.room_number || "Unknown"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reading Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Reading Details</CardTitle>
                <CardDescription>Update the reading value</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Previous Reading (Read-only) */}
            {reading.previous_reading !== null && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Previous Reading:</strong> {reading.previous_reading.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reading_value">Current Reading *</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reading_value"
                  name="reading_value"
                  type="number"
                  min={reading.previous_reading || 0}
                  step="0.01"
                  placeholder="e.g., 12345"
                  value={formData.reading_value}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="pl-9"
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
                      {calculatedUnits.toLocaleString()} {meterType === "electricity" ? "kWh" : meterType === "water" ? "L" : meterType === "gas" ? "m³" : "units"}
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
