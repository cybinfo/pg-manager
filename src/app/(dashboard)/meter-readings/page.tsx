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
import { dateColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { METER_READING_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createThisMonthCountMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, METER_TYPE_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { formatDate, formatNumber} from "@/lib/format"
import { METER_TYPE_ICON_CONFIG } from "@/types/meters.types"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn } from "@/lib/export-columns"

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

const meterTypeConfig: Record<string, typeof METER_TYPE_ICON_CONFIG[keyof typeof METER_TYPE_ICON_CONFIG]> = METER_TYPE_ICON_CONFIG

// ============================================
// Column Definitions
// ============================================

const columns: Column<MeterReading>[] = [
  {
    key: "meter",
    header: "Meter",
    width: "primary",
    canHide: false,
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (reading) => (
      <span className="font-semibold tabular-nums">{formatNumber(reading.reading_value)}</span>
    ),
  },
  {
    key: "units_consumed",
    header: "Consumed",
    width: "tertiary",
    sortable: true,
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (reading) => {
      if (reading.units_consumed === null) return <span className="text-muted-foreground">-</span>
      const hasIncrease = reading.units_consumed > 0
      return (
        <div className={`flex items-center gap-1 font-medium ${hasIncrease ? "text-warning" : "text-success"}`}>
          {hasIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {formatNumber(reading.units_consumed)}
        </div>
      )
    },
  },
  // Hidden by default columns
  {
    key: "previous_reading",
    header: "Previous",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (reading) => reading.previous_reading !== null ? (
      <span className="font-mono text-sm">{formatNumber(reading.previous_reading)}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "charge_type",
    header: "Charge Type",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (reading) => reading.charge_type?.name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "image_url",
    header: "Image",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (reading) => reading.image_url ? (
      <span className="text-sm text-info">Has Image</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (reading) => reading.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{reading.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  { ...METER_TYPE_FILTER, label: "Meter Type" },
  createDateRangeFilter("reading_date", "Date"),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "reading_value",
    header: "Reading Value",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "units_consumed",
    header: "Units Consumed",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "reading_date",
    header: "Reading Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createThisMonthCountMetric("reading_date", "This Month", Gauge, { id: "thisMonth" }),
  createCountMetric("electricity", "Electricity", Zap,
    (item) => {
      const ct = item.charge_type as { name?: string } | null
      return ct?.name?.toLowerCase() === "electricity"
    }
  ),
  createCountMetric("water", "Water", Droplets,
    (item) => {
      const ct = item.charge_type as { name?: string } | null
      return ct?.name?.toLowerCase() === "water"
    }
  ),
  {
    id: "totalKwh",
    label: "Total kWh",
    compute: (items) => {
      const electricityReadings = items.filter((r) => {
        const ct = r.charge_type as { name?: string } | null
        return ct?.name?.toLowerCase() === "electricity"
      })
      return electricityReadings
        .filter((r) => r.units_consumed)
        .reduce((sum: number, r) => sum + (Number(r.units_consumed) || 0), 0)
        .toLocaleString()
    },
    highlight: () => true,
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  nestedColumn("meter_number", "Meter Number", "meter.meter_number"),
  nestedColumn("meter_type", "Meter Type", "meter.meter_type"),
  nestedColumn("property_name", "Property", "property.name"),
  nestedColumn("room_number", "Room", "room.room_number"),
  dateExportColumn("reading_date", "Reading Date"),
  { key: "reading_value", header: "Reading", format: (v) => String(v ?? "") },
  { key: "previous_reading", header: "Previous", format: (v) => String(v ?? "") },
  { key: "units_consumed", header: "Consumed", format: (v) => String(v ?? "") },
  { key: "notes", header: "Notes", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Recorded On"),
]

// ============================================
// Page Component
// ============================================

export default function MeterReadingsPage() {
  return (
    <ListPageTemplate
      tableKey="meter-readings"
      title="Meter Readings"
      description="Track electricity, water, and gas consumption"
      icon={Gauge}
      permission="meter_readings.view"
      module="meters"
      feature="meterReadings"
      config={METER_READING_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by property or room..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="meter-readings"
      createHref="/meter-readings/new"
      createLabel="Record Reading"
      createPermission="meter_readings.create"
      detailHref={(reading) => `/meter-readings/${reading.id}`}
      emptyTitle="No meter readings found"
      emptyDescription="Start recording meter readings to track consumption"
    />
  )
}
