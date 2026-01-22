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
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Archive,
} from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { METER_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PropertyLink } from "@/components/ui/entity-link"
import { StatusBadge } from "@/components/ui/status-badge"
import { METER_TYPE_CONFIG, METER_STATUS_CONFIG, MeterType, MeterStatus } from "@/types/meters.types"

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

const statusIcons: Record<MeterStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  faulty: AlertTriangle,
  replaced: XCircle,
  retired: Archive,
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
    render: (meter) => (
      <span className="font-mono text-sm">{meter.initial_reading.toLocaleString()}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (meter) => {
      const statusConfig = METER_STATUS_CONFIG[meter.status] || METER_STATUS_CONFIG.active
      return <StatusBadge variant={statusConfig.variant} label={statusConfig.label} />
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
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "electricity", label: "Electricity" },
      { value: "water", label: "Water" },
      { value: "gas", label: "Gas" },
    ],
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Statuses",
    options: [
      { value: "active", label: "Active" },
      { value: "faulty", label: "Faulty" },
      { value: "replaced", label: "Replaced" },
      { value: "retired", label: "Retired" },
    ],
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Meter>[] = [
  {
    id: "total",
    label: "Total Meters",
    icon: Gauge,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "active",
    label: "Active",
    icon: CheckCircle2,
    compute: (items) => items.filter((m) => m.status === "active").length,
    highlight: () => true,
  },
  {
    id: "electricity",
    label: "Electricity",
    icon: Zap,
    compute: (items) => items.filter((m) => m.meter_type === "electricity").length,
  },
  {
    id: "water",
    label: "Water",
    icon: Droplets,
    compute: (items) => items.filter((m) => m.meter_type === "water").length,
  },
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
      createHref="/meters/new"
      createLabel="Add Meter"
      createPermission="meters.create"
      detailHref={(meter) => `/meters/${meter.id}`}
      emptyTitle="No meters found"
      emptyDescription="Add meters to track electricity, water, and gas consumption"
    />
  )
}
