"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Gauge,
  Plus,
  Search,
  Loader2,
  Zap,
  Droplets,
  Building2,
  Home,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { toast } from "sonner"

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
  charge_type: {
    id: string
    name: string
  } | null
}

interface RawMeterReading {
  id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  property: {
    id: string
    name: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
  charge_type: {
    id: string
    name: string
  }[] | null
}

interface Property {
  id: string
  name: string
}

const meterTypeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { label: "Water", icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { label: "Gas", icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
}

export default function MeterReadingsPage() {
  const [loading, setLoading] = useState(true)
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [propertyFilter, setPropertyFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [readingsRes, propertiesRes] = await Promise.all([
      supabase
        .from("meter_readings")
        .select(`
          *,
          property:properties(id, name),
          room:rooms(id, room_number),
          charge_type:charge_types(id, name)
        `)
        .order("reading_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("properties").select("id, name").order("name"),
    ])

    if (readingsRes.error) {
      console.error("Error fetching readings:", readingsRes.error)
      toast.error("Failed to load meter readings")
    } else {
      // Transform the data - handle both array and single object responses from Supabase joins
      const transformedData = ((readingsRes.data as RawMeterReading[]) || []).map((reading) => ({
        ...reading,
        property: Array.isArray(reading.property) ? reading.property[0] : reading.property,
        room: Array.isArray(reading.room) ? reading.room[0] : reading.room,
        charge_type: Array.isArray(reading.charge_type) ? reading.charge_type[0] : reading.charge_type,
      }))
      setReadings(transformedData)
    }

    if (!propertiesRes.error) {
      setProperties(propertiesRes.data || [])
    }

    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const filteredReadings = readings.filter((reading) => {
    const matchesSearch =
      reading.room?.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.property?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProperty = propertyFilter === "all" || reading.property?.id === propertyFilter
    const meterType = reading.charge_type?.name?.toLowerCase() || ""
    const matchesType = typeFilter === "all" || meterType === typeFilter

    return matchesSearch && matchesProperty && matchesType
  })

  // Stats
  const thisMonthReadings = readings.filter((r) => {
    const now = new Date()
    const readingDate = new Date(r.reading_date)
    return readingDate.getMonth() === now.getMonth() && readingDate.getFullYear() === now.getFullYear()
  })

  const electricityReadings = readings.filter((r) => r.charge_type?.name?.toLowerCase() === "electricity")
  const waterReadings = readings.filter((r) => r.charge_type?.name?.toLowerCase() === "water")

  const totalElectricityUnits = electricityReadings
    .filter((r) => r.units_consumed)
    .reduce((sum, r) => sum + (r.units_consumed || 0), 0)

  const totalWaterUnits = waterReadings
    .filter((r) => r.units_consumed)
    .reduce((sum, r) => sum + (r.units_consumed || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meter Readings</h1>
          <p className="text-muted-foreground">Track electricity, water, and gas consumption</p>
        </div>
        <Link href="/dashboard/meter-readings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Reading
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{thisMonthReadings.length}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{electricityReadings.length}</p>
                <p className="text-xs text-muted-foreground">Electricity</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waterReadings.length}</p>
                <p className="text-xs text-muted-foreground">Water</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalElectricityUnits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by room or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[160px]"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="electricity">Electricity</option>
              <option value="water">Water</option>
              <option value="gas">Gas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Readings List */}
      {filteredReadings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gauge className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No meter readings found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {readings.length === 0
                ? "Start recording meter readings to track consumption"
                : "No readings match your search criteria"}
            </p>
            {readings.length === 0 && (
              <Link href="/dashboard/meter-readings/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Record First Reading
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReadings.map((reading) => {
            const meterType = reading.charge_type?.name?.toLowerCase() || "electricity"
            const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
            const Icon = config.icon
            const hasIncrease = reading.units_consumed && reading.units_consumed > 0

            return (
              <Link key={reading.id} href={`/dashboard/meter-readings/${reading.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Type & Room */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-3 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{config.label}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                              {config.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {reading.property?.name}
                            <Home className="h-3 w-3 ml-1" />
                            Room {reading.room?.room_number}
                          </div>
                        </div>
                      </div>

                      {/* Reading Value */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Reading</p>
                          <p className="text-xl font-bold">{reading.reading_value.toLocaleString()}</p>
                        </div>

                        {reading.units_consumed !== null && (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Consumed</p>
                            <p className={`text-xl font-bold flex items-center gap-1 ${hasIncrease ? "text-orange-600" : "text-green-600"}`}>
                              {hasIncrease ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              {reading.units_consumed.toLocaleString()}
                            </p>
                          </div>
                        )}

                        {/* Date */}
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(reading.reading_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {reading.notes && (
                      <p className="text-sm text-muted-foreground mt-2 pl-14">
                        Note: {reading.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
