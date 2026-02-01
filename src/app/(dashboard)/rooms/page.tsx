/**
 * Rooms List Page (Refactored)
 *
 * BEFORE: 420 lines of code
 * AFTER: ~130 lines of code (69% reduction)
 */

"use client"

import { Home, Bed, CheckCircle, AlertCircle } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { ROOM_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"

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
  {
    key: "room_type",
    header: "Type",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (room) => (
      <TableBadge variant="default">
        {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
      </TableBadge>
    ),
  },
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
  {
    key: "rent_amount",
    header: "Rent",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (room) => (
      <span className="font-medium tabular-nums">{formatCurrency(room.rent_amount)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "select",
    editOptions: [
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "maintenance", label: "Maintenance" },
      { value: "blocked", label: "Blocked" },
    ],
    render: (room) => {
      const info = getStatusInfo(room.status)
      return <StatusDot status={info.status} label={info.label} />
    },
  },
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
  {
    key: "deposit_amount",
    header: "Deposit",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (room) => (
      <span className="tabular-nums">{formatCurrency(room.deposit_amount)}</span>
    ),
  },
  {
    key: "has_ac",
    header: "AC",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (room) => (
      <TableBadge variant={room.has_ac ? "success" : "muted"}>
        {room.has_ac ? "Yes" : "No"}
      </TableBadge>
    ),
  },
  {
    key: "has_attached_bathroom",
    header: "Attached Bath",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (room) => (
      <TableBadge variant={room.has_attached_bathroom ? "success" : "muted"}>
        {room.has_attached_bathroom ? "Yes" : "No"}
      </TableBadge>
    ),
  },
  {
    key: "has_balcony",
    header: "Balcony",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (room) => (
      <TableBadge variant={room.has_balcony ? "success" : "muted"}>
        {room.has_balcony ? "Yes" : "No"}
      </TableBadge>
    ),
  },
  {
    key: "is_active",
    header: "Active",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (room) => (
      <StatusDot
        status={room.is_active ? "success" : "muted"}
        label={room.is_active ? "Active" : "Inactive"}
      />
    ),
  },
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
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (room) => formatDate(room.created_at),
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
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "partially_occupied", label: "Partially Occupied" },
      { value: "maintenance", label: "Maintenance" },
    ],
  },
  {
    id: "room_type",
    label: "Room Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "single", label: "Single" },
      { value: "double", label: "Double" },
      { value: "triple", label: "Triple" },
      { value: "dormitory", label: "Dormitory" },
    ],
  },
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

const metrics: MetricConfig<Room>[] = [
  {
    id: "total",
    label: "Total Rooms",
    icon: Home,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "available",
    label: "Available Rooms",
    icon: CheckCircle,
    compute: (items) => items.filter((r) => r.status === "available").length,
    serverFilter: {
      column: "status",
      operator: "eq",
      value: "available",
    },
  },
  {
    id: "total_beds",
    label: "Total Beds",
    icon: Bed,
    compute: (items, _total, serverData) => {
      if (serverData?.total_beds !== undefined) {
        return serverData.total_beds
      }
      return items.reduce((sum, r) => sum + r.total_beds, 0)
    },
    serverSum: {
      column: "total_beds",
    },
  },
  {
    id: "occupied_beds",
    label: "Occupied Beds",
    icon: AlertCircle,
    compute: (items, _total, serverData) => {
      // Use server sums if available for accurate totals
      const totalBeds = serverData?.total_beds ?? items.reduce((sum, r) => sum + r.total_beds, 0)
      const occupiedBeds = serverData?.occupied_beds ?? items.reduce((sum, r) => sum + r.occupied_beds, 0)
      const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      return `${occupiedBeds} (${rate}%)`
    },
    serverSum: {
      column: "occupied_beds",
    },
  },
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
      createHref="/rooms/new"
      createLabel="Add Room"
      createPermission="rooms.create"
      detailHref={(room) => `/rooms/${room.id}`}
      emptyTitle="No rooms found"
      emptyDescription="Add rooms to your properties to start managing tenants"
    />
  )
}
