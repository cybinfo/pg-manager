"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import {
  Gauge,
  Plus,
  Loader2,
  Zap,
  Droplets,
  Building2,
  Home,
  Calendar,
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

const meterTypeConfig: Record<string, { label: string; icon: typeof Zap; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { label: "Water", icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { label: "Gas", icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
}

export default function MeterReadingsPage() {
  const [loading, setLoading] = useState(true)
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

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

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "type",
      label: "Meter Type",
      type: "select",
      placeholder: "All Types",
      options: [
        { value: "electricity", label: "Electricity" },
        { value: "water", label: "Water" },
        { value: "gas", label: "Gas" },
      ],
    },
    {
      id: "date",
      label: "Date",
      type: "date-range",
    },
  ]

  const filteredReadings = readings.filter((reading) => {
    if (filters.property && filters.property !== "all" && reading.property?.id !== filters.property) {
      return false
    }
    const meterType = reading.charge_type?.name?.toLowerCase() || ""
    if (filters.type && filters.type !== "all" && meterType !== filters.type) {
      return false
    }
    if (filters.date_from) {
      const readingDate = new Date(reading.reading_date)
      if (readingDate < new Date(filters.date_from)) return false
    }
    if (filters.date_to) {
      const readingDate = new Date(reading.reading_date)
      if (readingDate > new Date(filters.date_to)) return false
    }
    return true
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

  const metricsItems: MetricItem[] = [
    { label: "This Month", value: thisMonthReadings.length, icon: Gauge },
    { label: "Electricity", value: electricityReadings.length, icon: Zap },
    { label: "Water", value: waterReadings.length, icon: Droplets },
    { label: "Total kWh", value: totalElectricityUnits.toLocaleString(), highlight: true },
  ]

  const columns: Column<MeterReading>[] = [
    {
      key: "type",
      header: "Type",
      width: "primary",
      render: (row) => {
        const meterType = row.charge_type?.name?.toLowerCase() || "electricity"
        const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
        const Icon = config.icon
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <div className="font-medium">{config.label}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {row.property?.name}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: "room",
      header: "Room",
      width: "tertiary",
      render: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <Home className="h-3 w-3 text-muted-foreground" />
          Room {row.room?.room_number}
        </div>
      ),
    },
    {
      key: "reading_value",
      header: "Reading",
      width: "amount",
      render: (row) => (
        <span className="font-semibold tabular-nums">{row.reading_value.toLocaleString()}</span>
      ),
    },
    {
      key: "units_consumed",
      header: "Consumed",
      width: "tertiary",
      render: (row) => {
        if (row.units_consumed === null) return <span className="text-muted-foreground">-</span>
        const hasIncrease = row.units_consumed > 0
        return (
          <div className={`flex items-center gap-1 font-medium ${hasIncrease ? "text-orange-600" : "text-green-600"}`}>
            {hasIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {row.units_consumed.toLocaleString()}
          </div>
        )
      },
    },
    {
      key: "reading_date",
      header: "Date",
      width: "date",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.reading_date)}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <FeatureGuard feature="meterReadings">
      <PermissionGuard permission="meter_readings.view">
        <div className="space-y-6">
      <PageHeader
        title="Meter Readings"
        description="Track electricity, water, and gas consumption"
        icon={Gauge}
        breadcrumbs={[{ label: "Meter Readings" }]}
        actions={
          <Link href="/dashboard/meter-readings/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Record Reading
            </Button>
          </Link>
        }
      />

      <MetricsBar items={metricsItems} />

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredReadings}
        keyField="id"
        href={(row) => `/dashboard/meter-readings/${row.id}`}
        searchable
        searchPlaceholder="Search by property or room..."
        searchFields={["property", "room"] as (keyof MeterReading)[]}
        emptyState={
          <div className="flex flex-col items-center py-8">
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
          </div>
        }
      />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
