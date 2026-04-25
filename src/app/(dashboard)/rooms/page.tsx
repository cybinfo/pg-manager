/**
 * Rooms List Page (Refactored)
 *
 * BEFORE: 420 lines of code
 * AFTER: ~130 lines of code (69% reduction)
 */

"use client"

import { Home, Bed, CheckCircle, AlertCircle } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { statusColumn, currencyColumn, dateColumn, badgeColumn, booleanColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { ROOM_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, ROOM_TYPE_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { ROOM_TYPES } from "@/types/rooms.types"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn, nestedColumn } from "@/lib/export-columns"

// Room type labels for badgeColumn
const ROOM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ROOM_TYPES.map(({ value, label }) => [value, label])
)

// ============================================
// Types
// ============================================

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  is_active: boolean
  has_ac: boolean
  has_attached_bathroom: boolean
  has_balcony: boolean
  amenities: string[] | null
  notes: string | null
  created_at: string
  property: { id: string; name: string; address?: string }
  ac_label?: string
  bathroom_label?: string
  beds_label?: string
  floor_label?: string
}

// ============================================
// Status Helper
// ============================================

const getStatusInfo = (status: string): { status: "success" | "warning" | "error" | "muted"; label: string } => {
  switch (status) {
    case "available":
      return { status: "success", label: "Available" }
    case "occupied":
      return { status: "error", label: "Occupied" }
    case "partially_occupied":
    case "partial":
      return { status: "warning", label: "Partial" }
    case "maintenance":
      return { status: "muted", label: "Maintenance" }
    default:
      return { status: "muted", label: status }
  }
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Room>[] = [
  {
    key: "room_number",
    header: "Room",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (room) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Home className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <div className="font-medium">Room {room.room_number}</div>
          {room.property && (
            <PropertyLink id={room.property.id} name={room.property.name} size="sm" />
          )}
        </div>
      </div>
    ),
  },
  badgeColumn("room_type", "Type", ROOM_TYPE_LABELS, {
    hideOnMobile: true,
  }),
  {
    key: "beds",
    header: "Beds",
    width: "count",
    sortable: true,
    sortKey: "total_beds",
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editField: "total_beds",
    editValidation: { required: true, min: 1 },
    render: (room) => (
      <span className="tabular-nums">{room.occupied_beds}/{room.total_beds}</span>
    ),
  },
  currencyColumn("rent_amount", "Rent", {
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
  }),
  statusColumn(getStatusInfo, {
    editable: true,
    editType: "select",
    editOptions: [
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "maintenance", label: "Maintenance" },
      { value: "blocked", label: "Blocked" },
    ],
  }),
  // Hidden by default columns
  {
    key: "floor",
    header: "Floor",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (room) => <span className="tabular-nums">{room.floor}</span>,
  },
  currencyColumn("deposit_amount", "Deposit", { defaultVisible: false, bold: false }),
  booleanColumn("has_ac", "AC", { defaultVisible: false }),
  booleanColumn("has_attached_bathroom", "Attached Bath", { defaultVisible: false }),
  booleanColumn("has_balcony", "Balcony", { defaultVisible: false }),
  booleanColumn("is_active", "Active", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    defaultVisible: false,
  }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (room) => room.notes ? (
      <span className="truncate max-w-[150px]" title={room.notes}>{room.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "partially_occupied", label: "Partially Occupied" },
    { value: "maintenance", label: "Maintenance" },
  ]),
  ROOM_TYPE_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "floor_label", label: "Floor" },
  { value: "room_type", label: "Room Type" },
  { value: "status", label: "Status" },
  { value: "beds_label", label: "Capacity" },
  { value: "ac_label", label: "AC" },
  { value: "bathroom_label", label: "Bathroom" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "room_number",
    header: "Room Number",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "room_type",
    header: "Room Type",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "single", label: "Single" },
      { value: "double", label: "Double" },
      { value: "triple", label: "Triple" },
      { value: "dormitory", label: "Dormitory" },
    ],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "partially_occupied", label: "Partially Occupied" },
      { value: "maintenance", label: "Maintenance" },
    ],
  },
  {
    key: "rent_amount",
    header: "Rent Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "total_beds",
    header: "Total Beds",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
  {
    key: "floor",
    header: "Floor",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Rooms", icon: Home }),
  createStatusMetric("available", "Available Rooms", CheckCircle),
  createSumMetric("total_beds", "total_beds", "Total Beds", Bed, { format: "number" }),
  {
    // Custom: computes occupancy rate from two server sums
    id: "occupied_beds",
    label: "Occupied Beds",
    icon: AlertCircle,
    compute: (items: Record<string, unknown>[], _total: number, serverData?: Record<string, number>) => {
      const totalBeds = serverData?.total_beds ?? items.reduce((sum: number, r) => sum + (Number(r.total_beds) || 0), 0)
      const occupiedBeds = serverData?.occupied_beds ?? items.reduce((sum: number, r) => sum + (Number(r.occupied_beds) || 0), 0)
      const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      return `${occupiedBeds} (${rate}%)`
    },
    serverSum: {
      column: "occupied_beds",
    },
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "room_number", header: "Room Number" },
  nestedColumn("property_name", "Property", "property.name"),
  { key: "floor", header: "Floor Number", format: (v) => String(v ?? "") },
  { key: "room_type", header: "Room Type", format: (v) => ROOM_TYPE_LABELS[String(v)] || String(v ?? "") },
  { key: "total_beds", header: "Total Beds", format: (v) => String(v ?? "") },
  { key: "occupied_beds", header: "Occupied Beds", format: (v) => String(v ?? "") },
  currencyExportColumn("rent_amount", "Rent Amount"),
  currencyExportColumn("deposit_amount", "Deposit Amount"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function RoomsPage() {
  return (
    <ListPageTemplate
      tableKey="rooms"
      title="Rooms"
      description="Manage rooms across all your properties"
      icon={Home}
      permission="rooms.view"
      config={ROOM_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by room number, property..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="rooms"
      createHref="/rooms/new"
      createLabel="Add Room"
      createPermission="rooms.create"
      detailHref={(room) => `/rooms/${room.id}`}
      emptyTitle="No rooms found"
      emptyDescription="Add rooms to your properties to start managing tenants"
    />
  )
}
