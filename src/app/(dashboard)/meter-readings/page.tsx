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
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Gauge,
  Plus,
  Zap,
  Droplets,
  Building2,
  Home,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"

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

// Group by options for meter readings
const meterReadingGroupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "charge_type.name", label: "Meter Type" },
]

export default function MeterReadingsPage() {
  const [loading, setLoading] = useState(true)
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

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
              <Link
                href={`/properties/${row.property?.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Building2 className="h-3 w-3" />
                {row.property?.name}
              </Link>
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
        <Link
          href={`/rooms/${row.room?.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
        >
          <Home className="h-3 w-3 text-muted-foreground" />
          Room {row.room?.room_number}
        </Link>
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
    return <PageLoader />
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
          <Link href="/meter-readings/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Record Reading
            </Button>
          </Link>
        }
      />

      <MetricsBar items={metricsItems} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedGroups.length === 0
                ? "Group by..."
                : selectedGroups.length === 1
                  ? meterReadingGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGroupDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Group by (select order)
                  </p>
                </div>
                {meterReadingGroupByOptions.map((opt) => {
                  const isSelected = selectedGroups.includes(opt.value)
                  const orderIndex = selectedGroups.indexOf(opt.value)

                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, opt.value])
                          } else {
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  )
                })}
                {selectedGroups.length > 0 && (
                  <div className="border-t mt-1 pt-1 px-3 py-2">
                    <button
                      onClick={() => {
                        setSelectedGroups([])
                        setGroupDropdownOpen(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear grouping
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredReadings}
        keyField="id"
        href={(row) => `/meter-readings/${row.id}`}
        searchable
        searchPlaceholder="Search by property or room..."
        searchFields={["property", "room"] as (keyof MeterReading)[]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: meterReadingGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
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
              <Link href="/meter-readings/new">
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
