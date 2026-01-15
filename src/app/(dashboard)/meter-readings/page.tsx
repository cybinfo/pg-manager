/**
 * Meter Readings List Page (Refactored)
 *
 * BEFORE: ~440 lines of code
 * AFTER: ~170 lines of code (61% reduction)
 */

"use client"

import {
  Gauge,
  Zap,
  Droplets,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { METER_READING_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  charge_type: { id: string; name: string } | null
  meter: { id: string; meter_number: string; meter_type: string } | null
  // Computed fields
  reading_month?: string
  reading_year?: string
  meter_type?: string
}

// ============================================
// Meter Type Configuration
// ============================================

const meterTypeConfig: Record<string, { label: string; icon: typeof Zap; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { label: "Water", icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { label: "Gas", icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<MeterReading>[] = [
  {
    key: "meter",
    header: "Meter",
    width: "primary",
    render: (reading) => {
      const meterType = reading.meter?.meter_type || reading.charge_type?.name?.toLowerCase() || "electricity"
      const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
      const Icon = config.icon
      return (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div>
            <div className="font-medium">{reading.meter?.meter_number || config.label}</div>
            <div className="text-xs text-muted-foreground capitalize">{config.label}</div>
          </div>
        </div>
      )
    },
  },
  {
    key: "property",
    header: "Property",
    width: "secondary",
    render: (reading) => reading.property ? (
      <PropertyLink id={reading.property.id} name={reading.property.name} size="sm" />
    ) : null,
  },
  {
    key: "room",
    header: "Room",
    width: "tertiary",
    sortable: true,
    sortKey: "room.room_number",
    render: (reading) => reading.room ? (
      <RoomLink id={reading.room.id} roomNumber={reading.room.room_number} size="sm" />
    ) : null,
  },
  {
    key: "reading_date",
    header: "Date",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (reading) => (
      <div className="flex items-center gap-1 text-sm">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        {formatDate(reading.reading_date)}
      </div>
    ),
  },
  {
    key: "reading_value",
    header: "Reading",
    width: "amount",
    sortable: true,
    render: (reading) => (
      <span className="font-semibold tabular-nums">{reading.reading_value.toLocaleString()}</span>
    ),
  },
  {
    key: "units_consumed",
    header: "Consumed",
    width: "tertiary",
    sortable: true,
    hideOnMobile: true,
    render: (reading) => {
      if (reading.units_consumed === null) return <span className="text-muted-foreground">-</span>
      const hasIncrease = reading.units_consumed > 0
      return (
        <div className={`flex items-center gap-1 font-medium ${hasIncrease ? "text-orange-600" : "text-green-600"}`}>
          {hasIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {reading.units_consumed.toLocaleString()}
        </div>
      )
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "property",
    label: "Property",
    type: "select",
    placeholder: "All Properties",
  },
  {
    id: "meter_type",
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
    id: "reading_date",
    label: "Date",
    type: "date-range",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "room.room_number", label: "Room" },
  { value: "charge_type.name", label: "Meter Type" },
  { value: "reading_month", label: "Month" },
  { value: "reading_year", label: "Year" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<MeterReading>[] = [
  {
    id: "thisMonth",
    label: "This Month",
    icon: Gauge,
    compute: (items) => {
      const now = new Date()
      return items.filter((r) => {
        const readingDate = new Date(r.reading_date)
        return readingDate.getMonth() === now.getMonth() && readingDate.getFullYear() === now.getFullYear()
      }).length
    },
  },
  {
    id: "electricity",
    label: "Electricity",
    icon: Zap,
    compute: (items) => items.filter((r) => r.charge_type?.name?.toLowerCase() === "electricity").length,
  },
  {
    id: "water",
    label: "Water",
    icon: Droplets,
    compute: (items) => items.filter((r) => r.charge_type?.name?.toLowerCase() === "water").length,
  },
  {
    id: "totalKwh",
    label: "Total kWh",
    compute: (items) => {
      const electricityReadings = items.filter((r) => r.charge_type?.name?.toLowerCase() === "electricity")
      return electricityReadings
        .filter((r) => r.units_consumed)
        .reduce((sum, r) => sum + (r.units_consumed || 0), 0)
        .toLocaleString()
    },
    highlight: () => true,
  },
]

// ============================================
// Page Component
// ============================================

export default function MeterReadingsPage() {
  return (
    <ListPageTemplate
      title="Meter Readings"
      description="Track electricity, water, and gas consumption"
      icon={Gauge}
      permission="meter_readings.view"
      feature="meterReadings"
      config={METER_READING_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by property or room..."
      createHref="/meter-readings/new"
      createLabel="Record Reading"
      createPermission="meter_readings.create"
      detailHref={(reading) => `/meter-readings/${reading.id}`}
      emptyTitle="No meter readings found"
      emptyDescription="Start recording meter readings to track consumption"
    />
  )
}
