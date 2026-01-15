"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gauge, Loader2, Building2, Home, Calculator, IndianRupee, Users, Zap, Droplets, Plus } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { PageLoader } from "@/components/ui/page-loader"

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

interface Meter {
  id: string
  meter_number: string
  meter_type: string
  property_id: string
  status: string
  property: { id: string; name: string } | null
  current_assignment: {
    room_id: string
    room_number: string
    start_reading: number
  }
}

export default function NewMeterReadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomIdFromUrl = searchParams.get("room")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingLastReading, setLoadingLastReading] = useState(false)

  // Data
  const [meters, setMeters] = useState<Meter[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [roomTenants, setRoomTenants] = useState<Tenant[]>([])

  // Selected meter and reading info
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null)
  const [lastReading, setLastReading] = useState<LastReading | null>(null)
  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)
  const [generateCharge, setGenerateCharge] = useState(true)

  // Form data
  const [formData, setFormData] = useState({
    meter_id: "",
    reading_date: new Date().toISOString().split("T")[0],
    reading_value: "",
    notes: "",
  })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [chargeTypesRes, tenantsRes, metersRes] = await Promise.all([
        supabase.from("charge_types").select("id, name, calculation_config").eq("owner_id", user?.id).in("name", ["Electricity", "Water", "Gas", "electricity", "water", "gas"]).order("name"),
        supabase.from("tenants").select("id, name, room_id").eq("status", "active"),
        supabase.from("meters").select(`
          id, meter_number, meter_type, property_id, status,
          property:properties(id, name)
        `).eq("status", "active").order("meter_number"),
      ])

      if (!chargeTypesRes.error && chargeTypesRes.data) {
        setChargeTypes(chargeTypesRes.data)
      }

      if (!tenantsRes.error) {
        setTenants(tenantsRes.data || [])
      }

      // Fetch meters with their current assignments
      if (!metersRes.error && metersRes.data) {
        const metersWithAssignments = await Promise.all(
          metersRes.data.map(async (meter: Record<string, unknown>) => {
            const { data: assignment } = await supabase
              .from("meter_assignments")
              .select("room_id, start_reading, room:rooms(room_number)")
              .eq("meter_id", meter.id)
              .is("end_date", null)
              .single()

            if (!assignment) return null

            return {
              ...meter,
              property: Array.isArray(meter.property) ? meter.property[0] : meter.property,
              current_assignment: {
                room_id: assignment.room_id,
                room_number: Array.isArray(assignment.room) ? assignment.room[0]?.room_number : (assignment.room as { room_number: string } | null)?.room_number,
                start_reading: assignment.start_reading,
              },
            } as Meter
          })
        )

        // Filter to only meters with active assignments
        const assignedMeters = metersWithAssignments.filter((m): m is Meter => m !== null)
        setMeters(assignedMeters)

        // Auto-select meter if room parameter is provided
        if (roomIdFromUrl) {
          const meterForRoom = assignedMeters.find(m => m.current_assignment.room_id === roomIdFromUrl)
          if (meterForRoom) {
            setSelectedMeter(meterForRoom)
            setFormData(prev => ({ ...prev, meter_id: meterForRoom.id }))
          }
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [roomIdFromUrl])

  // Filter tenants when meter changes (based on room)
  useEffect(() => {
    if (selectedMeter?.current_assignment?.room_id) {
      const filtered = tenants.filter((t) => t.room_id === selectedMeter.current_assignment.room_id)
      setRoomTenants(filtered)
    } else {
      setRoomTenants([])
    }
  }, [selectedMeter, tenants])

  // Fetch last reading when meter changes
  useEffect(() => {
    const fetchLastReading = async () => {
      if (!selectedMeter) {
        setLastReading(null)
        return
      }

      setLoadingLastReading(true)
      const supabase = createClient()

      // Get the last reading for this specific meter
      const { data: meterReading } = await supabase
        .from("meter_readings")
        .select("reading_value, reading_date")
        .eq("meter_id", selectedMeter.id)
        .order("reading_date", { ascending: false })
        .limit(1)
        .single()

      if (meterReading) {
        setLastReading(meterReading)
      } else {
        // No readings yet - use the assignment's start_reading
        setLastReading({
          reading_value: selectedMeter.current_assignment.start_reading,
          reading_date: "Assignment Start",
        })
      }
      setLoadingLastReading(false)
    }

    fetchLastReading()
  }, [selectedMeter])

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

  // Handle meter selection
  const handleMeterSelect = (meterId: string) => {
    const meter = meters.find(m => m.id === meterId)
    if (meter) {
      setSelectedMeter(meter)
      setFormData(prev => ({ ...prev, meter_id: meter.id }))
    } else {
      setSelectedMeter(null)
      setFormData(prev => ({ ...prev, meter_id: "" }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.meter_id || !selectedMeter) {
      toast.error("Please select a meter")
      return
    }

    if (!formData.reading_value) {
      toast.error("Please enter a reading value")
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

      // Check for duplicate reading on the same date for this meter
      const { data: existingReading } = await supabase
        .from("meter_readings")
        .select("id")
        .eq("meter_id", selectedMeter.id)
        .eq("reading_date", formData.reading_date)
        .maybeSingle()

      if (existingReading) {
        toast.error("A reading already exists for this meter on the selected date. Please choose a different date.")
        setLoading(false)
        return
      }

      // Find matching charge type for meter type
      const meterTypeToCharge: Record<string, string[]> = {
        electricity: ["Electricity", "electricity"],
        water: ["Water", "water"],
        gas: ["Gas", "gas"],
      }
      const matchingChargeType = chargeTypes.find(ct =>
        meterTypeToCharge[selectedMeter.meter_type]?.includes(ct.name)
      )

      // Insert meter reading
      const { data: meterReadingData, error } = await supabase.from("meter_readings").insert({
        owner_id: user.id,
        property_id: selectedMeter.property_id,
        room_id: selectedMeter.current_assignment.room_id,
        charge_type_id: matchingChargeType?.id || null,
        meter_id: selectedMeter.id,
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
      if (generateCharge && calculatedUnits && calculatedUnits > 0 && roomTenants.length > 0 && matchingChargeType) {
        const ratePerUnit = matchingChargeType.calculation_config?.rate_per_unit || 0
        const splitByOccupants = matchingChargeType.calculation_config?.split_by === "occupants"

        if (ratePerUnit > 0) {
          const totalAmount = calculatedUnits * ratePerUnit
          const amountPerTenant = splitByOccupants ? totalAmount / roomTenants.length : totalAmount

          const readingDate = new Date(formData.reading_date)
          const dueDate = new Date(readingDate.getFullYear(), readingDate.getMonth() + 1, 0)
          const forPeriod = readingDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

          const chargeInserts = roomTenants.map((tenant) => ({
            owner_id: user.id,
            tenant_id: tenant.id,
            property_id: selectedMeter.property_id,
            charge_type_id: matchingChargeType.id,
            amount: splitByOccupants ? amountPerTenant : totalAmount,
            due_date: dueDate.toISOString().split("T")[0],
            for_period: forPeriod,
            period_start: new Date(readingDate.getFullYear(), readingDate.getMonth(), 1).toISOString().split("T")[0],
            period_end: dueDate.toISOString().split("T")[0],
            calculation_details: {
              meter_reading_id: meterReadingData.id,
              meter_id: selectedMeter.id,
              meter_number: selectedMeter.meter_number,
              units: calculatedUnits,
              rate: ratePerUnit,
              total_amount: totalAmount,
              occupants: roomTenants.length,
              split_by: splitByOccupants ? "occupants" : "room",
              per_person: splitByOccupants ? amountPerTenant : totalAmount,
              method: "meter_reading",
            },
            status: "pending",
            notes: `Auto-generated from meter ${selectedMeter.meter_number} reading on ${formData.reading_date}`,
          }))

          const { error: chargeError } = await supabase.from("charges").insert(chargeInserts)

          if (chargeError) {
            console.error("Error creating charges:", chargeError)
            toast.warning("Meter reading saved, but failed to generate charges")
          } else {
            const chargeCount = splitByOccupants ? roomTenants.length : 1
            toast.success(`Meter reading recorded and ${chargeCount} charge(s) generated!`)
            // Redirect back to room's meter readings if we came from there
            if (roomIdFromUrl) {
              router.push(`/rooms/${roomIdFromUrl}/meter-readings`)
            } else {
              router.push("/meter-readings")
            }
            return
          }
        }
      }

      toast.success("Meter reading recorded successfully!")
      // Redirect back to room's meter readings if we came from there
      if (roomIdFromUrl) {
        router.push(`/rooms/${roomIdFromUrl}/meter-readings`)
      } else {
        router.push("/meter-readings")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to record meter reading. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Get selected charge type for display
  const selectedChargeType = selectedMeter ? chargeTypes.find(ct => {
    const meterTypeToCharge: Record<string, string[]> = {
      electricity: ["Electricity", "electricity"],
      water: ["Water", "water"],
      gas: ["Gas", "gas"],
    }
    return meterTypeToCharge[selectedMeter.meter_type]?.includes(ct.name)
  }) : null

  if (loadingData) {
    return <PageLoader />
  }

  // No assigned meters - show empty state
  if (meters.length === 0) {
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
            <h3 className="text-lg font-medium mb-2">No meters assigned to rooms</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create meters and assign them to rooms before recording readings.
            </p>
            <Link href="/meters/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Meter
              </Button>
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
        <Link href="/meter-readings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Record Meter Reading</h1>
          <p className="text-muted-foreground">Select a meter and enter the current reading</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meter Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Select Meter</CardTitle>
                <CardDescription>Choose a meter to record reading</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meter_id">Meter *</Label>
              <select
                id="meter_id"
                value={formData.meter_id}
                onChange={(e) => handleMeterSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                required
                disabled={loading}
              >
                <option value="">Select a meter</option>
                {meters.map((meter) => (
                  <option key={meter.id} value={meter.id}>
                    {meter.meter_number} ({meter.meter_type}) - {meter.property?.name} / Room {meter.current_assignment.room_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Show selected meter details */}
            {selectedMeter && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {selectedMeter.meter_type === "electricity" && <Zap className="h-4 w-4 text-yellow-500" />}
                  {selectedMeter.meter_type === "water" && <Droplets className="h-4 w-4 text-blue-500" />}
                  {selectedMeter.meter_type === "gas" && <Gauge className="h-4 w-4 text-orange-500" />}
                  <span className="font-medium">{selectedMeter.meter_number}</span>
                  <span className="text-sm text-muted-foreground capitalize">({selectedMeter.meter_type})</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {selectedMeter.property?.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    Room {selectedMeter.current_assignment.room_number}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reading Entry - only show if meter selected */}
        {selectedMeter && (
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

              {/* Previous Reading Info */}
              {loadingLastReading ? (
                <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading previous reading...</span>
                </div>
              ) : lastReading ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Previous Reading:</strong> {lastReading.reading_value.toLocaleString()}
                    {lastReading.reading_date === "Assignment Start"
                      ? " (Assignment Start)"
                      : ` on ${formatDate(lastReading.reading_date)}`}
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
                        {calculatedUnits.toLocaleString()} {selectedMeter.meter_type === "electricity" ? "kWh" : selectedMeter.meter_type === "water" ? "L" : selectedMeter.meter_type === "gas" ? "m³" : "units"}
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
                              <p className="text-sm">No rate configured for {selectedMeter.meter_type}. Please update charge type settings.</p>
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
        )}

        <div className="flex justify-end gap-4">
          <Link href="/meter-readings">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.meter_id}>
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
