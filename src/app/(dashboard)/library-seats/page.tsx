/**
 * Library Seats List Page
 *
 * Displays all seats with availability status.
 */

"use client"

import { Armchair, Users, CheckCircle, XCircle } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_SEAT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatDate } from "@/lib/format"
import { LIBRARY_SEAT_STATUS_CONFIG } from "@/types/library.types"

// ============================================
// Types
// ============================================

interface SeatItem {
  id: string
  seat_number: string
  row_number: string | null
  has_power_outlet: boolean
  has_lamp: boolean
  is_window_seat: boolean
  status: string
  created_at: string
  section?: { id: string; name: string; library?: { id: string; name: string } | null } | null
  current_member?: { id: string; name: string; member_code: string | null } | null
  // Computed
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<SeatItem>[] = [
  {
    key: "seat_number",
    header: "Seat",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (seat) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
          seat.status === "available" ? "bg-green-100" :
          seat.status === "occupied" ? "bg-blue-100" :
          seat.status === "reserved" ? "bg-yellow-100" : "bg-gray-100"
        }`}>
          <Armchair className={`h-4 w-4 ${
            seat.status === "available" ? "text-green-600" :
            seat.status === "occupied" ? "text-blue-600" :
            seat.status === "reserved" ? "text-yellow-600" : "text-gray-600"
          }`} />
        </div>
        <div>
          <div className="font-medium">{seat.seat_number}</div>
          <div className="text-xs text-muted-foreground">
            {seat.section?.name}
            {seat.row_number && ` • Row ${seat.row_number}`}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "section",
    header: "Section",
    width: "secondary",
    sortable: false,
    canHide: true,
    defaultVisible: true,
    render: (seat) => seat.section ? (
      <div>
        <div className="font-medium text-sm">{seat.section.name}</div>
        <div className="text-xs text-muted-foreground">
          {seat.section.library?.name}
        </div>
      </div>
    ) : "—",
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (seat) => {
      const config = LIBRARY_SEAT_STATUS_CONFIG[seat.status as keyof typeof LIBRARY_SEAT_STATUS_CONFIG]
      return (
        <StatusDot
          status={config?.variant || "muted"}
          label={config?.label || seat.status}
        />
      )
    },
  },
  {
    key: "current_member",
    header: "Assigned To",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (seat) => seat.current_member ? (
      <div>
        <div className="font-medium text-sm">{seat.current_member.name}</div>
        <div className="text-xs text-muted-foreground">{seat.current_member.member_code}</div>
      </div>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
  },
  {
    key: "features",
    header: "Features",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (seat) => {
      const features = []
      if (seat.has_power_outlet) features.push("Power")
      if (seat.has_lamp) features.push("Lamp")
      if (seat.is_window_seat) features.push("Window")
      return features.length > 0 ? features.join(", ") : "—"
    },
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (seat) => formatDate(seat.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "section_id",
    label: "Section",
    type: "select",
    placeholder: "All Sections",
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "reserved", label: "Reserved" },
      { value: "maintenance", label: "Maintenance" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "section.name", label: "Section" },
  { value: "status", label: "Status" },
  { value: "row_number", label: "Row" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<SeatItem>[] = [
  {
    id: "total",
    label: "Total Seats",
    icon: Armchair,
    compute: (_items, total) => total,
  },
  {
    id: "available",
    label: "Available",
    icon: CheckCircle,
    compute: (items) => items.filter((s) => s.status === "available").length,
  },
  {
    id: "occupied",
    label: "Occupied",
    icon: Users,
    compute: (items) => items.filter((s) => s.status === "occupied").length,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: XCircle,
    compute: (items) => items.filter((s) => s.status === "maintenance").length,
  },
]

// ============================================
// Page Component
// ============================================

export default function LibrarySeatsPage() {
  return (
    <ListPageTemplate
      tableKey="library-seats"
      title="Seats"
      description="Manage library seats and assignments"
      icon={Armchair}
      permission="library.view"
      config={LIBRARY_SEAT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by seat number, section..."
      enableColumnManager={true}
      createHref="/library-seats/new"
      createLabel="Add Seat"
      createPermission="library.create"
      detailHref={(seat) => `/library-seats/${seat.id}`}
      emptyTitle="No seats found"
      emptyDescription="Add seats to your library sections"
    />
  )
}
