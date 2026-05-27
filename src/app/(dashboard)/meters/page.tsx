/**
 * Meters List Page
 *
 * Lists all meters with status, type, property, and current room assignment.
 * Supports filtering by property, type, and status.
 */

"use client"

import {
  Gauge,
  Zap,
  Droplets,
  CheckCircle2,
} from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { dateColumn, statusColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { METER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, METER_TYPE_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { METER_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { METER_TYPE_CONFIG, METER_STATUS_CONFIG, MeterType, MeterStatus } from "@/types/meters.types"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, labelMapColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Meter {
  id: string
  meter_number: string
  meter_type: MeterType
  status: MeterStatus
  initial_reading: number
  make: string | null
  model: string | null
  installation_date: string | null
  notes: string | null
  created_at: string
  property: { id: string; name: string } | null
  // Computed fields
  status_label?: string
  type_label?: string
}

// ============================================
// Icon mapping for meter types
// ============================================

const meterTypeIcons: Record<MeterType, typeof Zap> = {
  electricity: Zap,
  water: Droplets,
  gas: Gauge,
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Meter>[] = [
  {
    key: "meter_number",
    header: "Meter",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true },
    render: (meter) => {
      const typeConfig = METER_TYPE_CONFIG[meter.meter_type] || METER_TYPE_CONFIG.electricity
      const Icon = meterTypeIcons[meter.meter_type] || Zap
      return (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
            <Icon className={`h-4 w-4 ${typeConfig.color}`} />
          </div>
          <div>
            <div className="font-medium">{meter.meter_number}</div>
            <div className="text-sm text-muted-foreground">{typeConfig.label}</div>
          </div>
        </div>
      )
    },
  },
  {
    key: "property",
    header: "Property",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    render: (meter) =>
      meter.property ? (
        <PropertyLink id={meter.property.id} name={meter.property.name} size="sm" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "make",
    header: "Make/Model",
    width: "tertiary",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (meter) => {
      if (!meter.make && !meter.model) return <span className="text-muted-foreground">—</span>
      return (
        <div className="text-sm">
          {meter.make && <div>{meter.make}</div>}
          {meter.model && <div className="text-muted-foreground">{meter.model}</div>}
        </div>
      )
    },
  },
  {
    key: "initial_reading",
    header: "Initial",
    width: "count",
    sortable: true,
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (meter) => (
      <span className="font-mono text-sm">{meter.initial_reading.toLocaleString()}</span>
    ),
  },
  statusColumn(METER_STATUS_CONFIG, {
    style: "badge",
    editable: true,
    editType: "select",
    editOptions: METER_STATUS_OPTIONS,
  }),
  // Hidden by default columns
  {
    key: "meter_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (meter) => {
      const typeConfig = METER_TYPE_CONFIG[meter.meter_type] || METER_TYPE_CONFIG.electricity
      return <span className={`text-sm font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
    },
  },
  {
    key: "model",
    header: "Model",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    render: (meter) => meter.model || <span className="text-muted-foreground">—</span>,
  },
  dateColumn("installation_date", "Installed On", { defaultVisible: false }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (meter) => meter.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{meter.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  METER_TYPE_FILTER,
  createStatusFilter([
    { value: "active", label: "Active" },
    { value: "faulty", label: "Faulty" },
    { value: "replaced", label: "Replaced" },
    { value: "retired", label: "Retired" },
  ], { placeholder: "All Statuses" }),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "type_label", label: "Meter Type" },
  { value: "status_label", label: "Status" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "meter_number",
    header: "Meter Number",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "meter_type",
    header: "Type",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "electricity", label: "Electricity" },
      { value: "water", label: "Water" },
      { value: "gas", label: "Gas" },
    ],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "active", label: "Active" },
      { value: "faulty", label: "Faulty" },
      { value: "replaced", label: "Replaced" },
      { value: "retired", label: "Retired" },
    ],
  },
  {
    key: "initial_reading",
    header: "Initial Reading",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Meters", icon: Gauge }),
  createStatusMetric("active", "Active", CheckCircle2),
  createStatusMetric("electricity", "Electricity", Zap, { column: "meter_type" }),
  createStatusMetric("water", "Water", Droplets, { column: "meter_type" }),
]

// ============================================
// Export Columns
// ============================================

const METER_TYPE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
}

const METER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  faulty: "Faulty",
  replaced: "Replaced",
  retired: "Retired",
}

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "meter_number", header: "Meter Number" },
  labelMapColumn("meter_type", "Type", METER_TYPE_LABELS),
  nestedColumn("property_name", "Property", "property.name"),
  { key: "initial_reading", header: "Initial Reading", format: (v) => String(v ?? "") },
  labelMapColumn("status", "Status", METER_STATUS_LABELS),
  { key: "make", header: "Make", format: (v) => String(v ?? "") },
  { key: "model", header: "Model", format: (v) => String(v ?? "") },
  dateExportColumn("installation_date", "Installed On"),
  { key: "notes", header: "Notes", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function MetersPage() {
  return (
    <ListPageTemplate
      tableKey="meters"
      title="Meters"
      description="Manage electricity, water, and gas meters"
      icon={Gauge}
      permission="meters.view"
      config={METER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by meter number, property, make..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="meters"
      createHref="/meters/new"
      createLabel="Add Meter"
      createPermission="meters.create"
      detailHref={(meter) => `/meters/${meter.id}`}
      emptyTitle="No meters found"
      emptyDescription="Add meters to track electricity, water, and gas consumption"
    />
  )
}
