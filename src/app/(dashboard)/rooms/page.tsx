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
import { PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency } from "@/lib/format"

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
  has_ac: boolean
  has_attached_bathroom: boolean
  property: { id: string; name: string }
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
    render: (room) => (
      <span className="font-medium tabular-nums">{formatCurrency(room.rent_amount)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (room) => {
      const info = getStatusInfo(room.status)
      return <StatusDot status={info.status} label={info.label} />
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Room>[] = [
  {
    id: "total",
    label: "Total Rooms",
    icon: Home,
    compute: (items) => items.length,
  },
  {
    id: "available",
    label: "Available Rooms",
    icon: CheckCircle,
    compute: (items) => items.filter((r) => r.status === "available").length,
  },
  {
    id: "total_beds",
    label: "Total Beds",
    icon: Bed,
    compute: (items) => items.reduce((sum, r) => sum + r.total_beds, 0),
  },
  {
    id: "occupancy",
    label: "Occupied Beds",
    icon: AlertCircle,
    compute: (items) => {
      const totalBeds = items.reduce((sum, r) => sum + r.total_beds, 0)
      const occupiedBeds = items.reduce((sum, r) => sum + r.occupied_beds, 0)
      const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      return `${occupiedBeds} (${rate}%)`
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
      createHref="/rooms/new"
      createLabel="Add Room"
      createPermission="rooms.create"
      detailHref={(room) => `/rooms/${room.id}`}
      emptyTitle="No rooms found"
      emptyDescription="Add rooms to your properties to start managing tenants"
    />
  )
}
