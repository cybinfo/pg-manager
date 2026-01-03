"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gauge, Loader2, Building2, Home, Calculator, IndianRupee, Users } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"

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
  calculation_config: { rate_per_unit?: number; split_by?: string } | null
}

interface LastReading {
  reading_value: number
  reading_date: string
}

interface Tenant {
  id: string
  name: string
  room_id: string
}

export default function NewMeterReadingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [lastReading, setLastReading] = useState<LastReading | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingLastReading, setLoadingLastReading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [roomTenants, setRoomTenants] = useState<Tenant[]>([])
  const [generateCharge, setGenerateCharge] = useState(true)

  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    charge_type_id: "",
    reading_date: new Date().toISOString().split("T")[0],
    reading_value: "",
    notes: "",
  })

  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes, chargeTypesRes, tenantsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
        supabase.from("charge_types").select("id, name, calculation_config").in("name", ["Electricity", "Water", "Gas", "electricity", "water", "gas"]).order("name"),
        supabase.from("tenants").select("id, name, room_id").eq("status", "active"),
      ])

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (!roomsRes.error) {
        setRooms(roomsRes.data || [])
      }

      if (!chargeTypesRes.error && chargeTypesRes.data) {
        setChargeTypes(chargeTypesRes.data)
        if (chargeTypesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, charge_type_id: chargeTypesRes.data[0].id }))
        }
      }

      if (!tenantsRes.error) {
        setTenants(tenantsRes.data || [])
      }

      setLoadingData(false)
    }

    fetchData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      const filtered = rooms.filter((r) => r.property_id === formData.property_id)
      setFilteredRooms(filtered)
      if (filtered.length > 0) {
        setFormData((prev) => ({ ...prev, room_id: filtered[0].id }))
      } else {
        setFormData((prev) => ({ ...prev, room_id: "" }))
      }
    }
  }, [formData.property_id, rooms])

  // Filter tenants when room changes
  useEffect(() => {
    if (formData.room_id) {
      const filtered = tenants.filter((t) => t.room_id === formData.room_id)
      setRoomTenants(filtered)
    } else {
      setRoomTenants([])
    }
  }, [formData.room_id, tenants])

  // Fetch last reading when room or charge type changes
  useEffect(() => {
    const fetchLastReading = async () => {
      if (!formData.room_id || !formData.charge_type_id) {
        setLastReading(null)
        return
      }

      setLoadingLastReading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from("meter_readings")
        .select("reading_value, reading_date")
        .eq("room_id", formData.room_id)
        .eq("charge_type_id", formData.charge_type_id)
        .order("reading_date", { ascending: false })
        .limit(1)
        .single()

      setLastReading(data || null)
      setLoadingLastReading(false)
    }

    fetchLastReading()
  }, [formData.room_id, formData.charge_type_id])

  // Calculate units consumed
  useEffect(() => {
    if (lastReading && formData.reading_value) {
      const currentValue = parseFloat(formData.reading_value)
      if (!isNaN(currentValue) && currentValue >= lastReading.reading_value) {
        setCalculatedUnits(currentValue - lastReading.reading_value)
      } else {
        setCalculatedUnits(null)
      }
    } else {
      setCalculatedUnits(null)
    }
  }, [formData.reading_value, lastReading])

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

    if (lastReading && readingValue < lastReading.reading_value) {
      toast.error("Current reading cannot be less than the previous reading")
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

      // Insert meter reading
      const { data: meterReadingData, error } = await supabase.from("meter_readings").insert({
        owner_id: user.id,
        property_id: formData.property_id,
        room_id: formData.room_id,
        charge_type_id: formData.charge_type_id,
        reading_date: formData.reading_date,
        reading_value: readingValue,
        previous_reading: lastReading?.reading_value || null,
        units_consumed: calculatedUnits,
        notes: formData.notes || null,
        created_by: user.id,
      }).select("id").single()

      if (error) {
        console.error("Error creating meter reading:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      // Generate charges if enabled and there are units consumed
      if (generateCharge && calculatedUnits && calculatedUnits > 0 && roomTenants.length > 0) {
        const ratePerUnit = selectedChargeType?.calculation_config?.rate_per_unit || 0
        const splitByOccupants = selectedChargeType?.calculation_config?.split_by === "occupants"

        if (ratePerUnit > 0) {
          const totalAmount = calculatedUnits * ratePerUnit
          const amountPerTenant = splitByOccupants ? totalAmount / roomTenants.length : totalAmount

          // Create due date (end of current month)
          const readingDate = new Date(formData.reading_date)
          const dueDate = new Date(readingDate.getFullYear(), readingDate.getMonth() + 1, 0)
          const forPeriod = readingDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

          // Create charges for each tenant
          const chargeInserts = roomTenants.map((tenant) => ({
            owner_id: user.id,
            tenant_id: tenant.id,
            property_id: formData.property_id,
            charge_type_id: formData.charge_type_id,
            amount: splitByOccupants ? amountPerTenant : totalAmount,
            due_date: dueDate.toISOString().split("T")[0],
            for_period: forPeriod,
            period_start: new Date(readingDate.getFullYear(), readingDate.getMonth(), 1).toISOString().split("T")[0],
            period_end: dueDate.toISOString().split("T")[0],
            calculation_details: {
              meter_reading_id: meterReadingData.id,
              units: calculatedUnits,
              rate: ratePerUnit,
              total_amount: totalAmount,
              occupants: roomTenants.length,
              split_by: splitByOccupants ? "occupants" : "room",
              per_person: splitByOccupants ? amountPerTenant : totalAmount,
              method: "meter_reading",
            },
            status: "pending",
            notes: `Auto-generated from meter reading on ${formData.reading_date}`,
          }))

          const { error: chargeError } = await supabase.from("charges").insert(chargeInserts)

          if (chargeError) {
            console.error("Error creating charges:", chargeError)
            toast.warning("Meter reading saved, but failed to generate charges")
          } else {
            const chargeCount = splitByOccupants ? roomTenants.length : 1
            toast.success(`Meter reading recorded and ${chargeCount} charge(s) generated!`)
            router.push("/meter-readings")
            return
          }
        } else {
          toast.warning("Meter reading saved, but no rate configured for this meter type")
        }
      }

      toast.success("Meter reading recorded successfully!")
      router.push("/meter-readings")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to record meter reading. Please try again.")
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

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/meter-readings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Record Meter Reading</h1>
            <p className="text-muted-foreground">Enter a new meter reading</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property and rooms first
            </p>
            <Link href="/properties/new">
              <Button>Add Property First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (chargeTypes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/meter-readings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Record Meter Reading</h1>
            <p className="text-muted-foreground">Enter a new meter reading</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gauge className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No meter types found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Charge types for meters (Electricity, Water, Gas) are not set up yet.
              Please contact support or check your settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/meter-readings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Record Meter Reading</h1>
          <p className="text-muted-foreground">Enter a new meter reading</p>
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
                <CardDescription>Select property and room</CardDescription>
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
                  disabled={loading || filteredRooms.length === 0}
                >
                  {filteredRooms.length === 0 ? (
                    <option value="">No rooms in this property</option>
                  ) : (
                    filteredRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number}
                      </option>
                    ))
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
                <CardDescription>Record the current meter value</CardDescription>
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

            {/* Previous Reading Info */}
            {loadingLastReading ? (
              <div className="p-3 bg-muted rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : lastReading ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Last Reading:</strong> {lastReading.reading_value.toLocaleString()} on {formatDate(lastReading.reading_date)}
                </p>
              </div>
            ) : formData.room_id ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No previous reading found for this room. This will be the first reading.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="reading_value">Current Reading *</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reading_value"
                  name="reading_value"
                  type="number"
                  min={lastReading?.reading_value || 0}
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
                      {calculatedUnits.toLocaleString()} {selectedChargeType?.name?.toLowerCase() === "electricity" ? "kWh" : selectedChargeType?.name?.toLowerCase() === "water" ? "L" : selectedChargeType?.name?.toLowerCase() === "gas" ? "m³" : "units"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Charge Generation Section */}
            {calculatedUnits !== null && calculatedUnits > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateCharge"
                    checked={generateCharge}
                    onChange={(e) => setGenerateCharge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={loading}
                  />
                  <Label htmlFor="generateCharge" className="font-medium cursor-pointer">
                    Generate charges for tenants automatically
                  </Label>
                </div>

                {generateCharge && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    {roomTenants.length === 0 ? (
                      <div className="flex items-center gap-2 text-amber-700">
                        <Users className="h-4 w-4" />
                        <p className="text-sm">No active tenants in this room. Charges will not be generated.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-blue-800">
                          <Users className="h-4 w-4" />
                          <p className="text-sm font-medium">
                            {roomTenants.length} tenant{roomTenants.length > 1 ? "s" : ""} in this room
                          </p>
                        </div>
                        <div className="text-sm text-blue-700">
                          {roomTenants.map((t, i) => (
                            <span key={t.id}>
                              {t.name}{i < roomTenants.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>

                        {selectedChargeType?.calculation_config?.rate_per_unit ? (
                          <div className="pt-2 border-t border-blue-200">
                            <div className="flex items-center gap-2 text-blue-800">
                              <IndianRupee className="h-4 w-4" />
                              <div className="text-sm">
                                <p>
                                  <span className="font-medium">Rate:</span> {formatCurrency(selectedChargeType.calculation_config.rate_per_unit)}/unit
                                </p>
                                <p>
                                  <span className="font-medium">Total Amount:</span> {formatCurrency(calculatedUnits * selectedChargeType.calculation_config.rate_per_unit)}
                                </p>
                                {roomTenants.length > 1 && selectedChargeType.calculation_config.split_by === "occupants" && (
                                  <p>
                                    <span className="font-medium">Per Person:</span> {formatCurrency((calculatedUnits * selectedChargeType.calculation_config.rate_per_unit) / roomTenants.length)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-700 pt-2 border-t border-blue-200">
                            <IndianRupee className="h-4 w-4" />
                            <p className="text-sm">No rate configured for {selectedChargeType?.name}. Please update charge type settings.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
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
          <Link href="/meter-readings">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || filteredRooms.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Gauge className="mr-2 h-4 w-4" />
                Record Reading
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
