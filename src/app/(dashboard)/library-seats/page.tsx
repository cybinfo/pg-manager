/**
 * Library Seats List Page
 *
 * Displays all seats with availability status.
 */

"use client"

import { Armchair, Users, CheckCircle, XCircle } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_SEAT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter } from "@/lib/filter-presets"
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
          seat.status === "available" ? "bg-green-100 dark:bg-green-900" :
          seat.status === "occupied" ? "bg-blue-100 dark:bg-blue-900" :
          seat.status === "reserved" ? "bg-yellow-100 dark:bg-yellow-900" : "bg-gray-100 dark:bg-gray-800"
        }`}>
          <Armchair className={`h-4 w-4 ${
            seat.status === "available" ? "text-green-600" :
            seat.status === "occupied" ? "text-blue-600" :
            seat.status === "reserved" ? "text-yellow-600" : "text-muted-foreground"
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
  statusColumn(LIBRARY_SEAT_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
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
  dateColumn("created_at", "Added On", { defaultVisible: false }),
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
  createStatusFilter([
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "reserved", label: "Reserved" },
    { value: "maintenance", label: "Maintenance" },
  ]),
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

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Seats", icon: Armchair }),
  createStatusMetric("available", "Available", CheckCircle),
  createStatusMetric("occupied", "Occupied", Users),
  createStatusMetric("maintenance", "Maintenance", XCircle),
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
