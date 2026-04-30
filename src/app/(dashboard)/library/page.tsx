/**
 * Libraries List Page
 *
 * Displays all study libraries with occupancy stats, sections, and members.
 */

"use client"

import { Library, Users, Armchair, MapPin, Phone, Clock } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatDate } from "@/lib/format"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface LibraryItem {
  id: string
  name: string
  code: string | null
  address: string | null
  city: string | null
  state: string
  pincode: string | null
  phone: string | null
  email: string | null
  total_sections: number
  total_seats: number
  occupied_seats: number
  opening_time: string | null
  closing_time: string | null
  has_ac: boolean
  has_wifi: boolean
  has_lockers: boolean
  has_parking: boolean
  is_active: boolean
  created_at: string
  // Computed fields
  available_seats?: number
  occupancy_percent?: number
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LibraryItem>[] = [
  {
    key: "name",
    header: "Library",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (library) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
          <Library className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium">{library.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {library.code && <span className="font-mono">{library.code}</span>}
            {library.code && library.city && <span>•</span>}
            {library.city && (
              <>
                <MapPin className="h-3 w-3" />
                {library.city}
              </>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "total_seats",
    header: "Seats",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (library) => (
      <div className="flex items-center gap-1.5">
        <Armchair className="h-4 w-4 text-muted-foreground" />
        <span>{library.occupied_seats}/{library.total_seats}</span>
      </div>
    ),
  },
  {
    key: "occupancy_percent",
    header: "Occupancy",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (library) => {
      const percent = library.occupancy_percent || 0
      const colorClass = percent >= 80 ? "text-destructive" : percent >= 50 ? "text-warning" : "text-success"
      return (
        <span className={`font-medium ${colorClass}`}>{percent}%</span>
      )
    },
  },
  {
    key: "total_sections",
    header: "Sections",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (library) => library.total_sections || 0,
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (library) => (
      <StatusDot
        status={library.is_active ? "success" : "muted"}
        label={library.is_active ? "Active" : "Inactive"}
      />
    ),
  },
  // Hidden by default columns
  {
    key: "address",
    header: "Address",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (library) => library.address || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (library) => library.phone ? (
      <div className="flex items-center gap-1">
        <Phone className="h-3 w-3 text-muted-foreground" />
        {library.phone}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "opening_time",
    header: "Hours",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (library) => library.opening_time && library.closing_time ? (
      <div className="flex items-center gap-1 text-sm">
        <Clock className="h-3 w-3 text-muted-foreground" />
        {library.opening_time?.slice(0, 5)} - {library.closing_time?.slice(0, 5)}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "has_ac",
    header: "Features",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (library) => (
      <div className="flex gap-1 flex-wrap">
        {library.has_ac && (
          <span className="px-1.5 py-0.5 bg-info/10 text-info rounded text-xs">AC</span>
        )}
        {library.has_wifi && (
          <span className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">WiFi</span>
        )}
        {library.has_lockers && (
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Lockers</span>
        )}
        {library.has_parking && (
          <span className="px-1.5 py-0.5 bg-warning/10 text-warning rounded text-xs">Parking</span>
        )}
      </div>
    ),
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (library) => formatDate(library.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "city",
    label: "City",
    type: "select",
    placeholder: "All Cities",
  },
  ACTIVE_STATUS_FILTER,
  {
    id: "has_ac",
    label: "AC",
    type: "select",
    placeholder: "AC Filter",
    options: [
      { value: "true", label: "Has AC" },
      { value: "false", label: "Non-AC" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "city", label: "City" },
  { value: "is_active", label: "Status" },
  { value: "has_ac", label: "AC/Non-AC" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Library Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "city",
    header: "City",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts"],
  },
  {
    key: "is_active",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    key: "total_seats",
    header: "Total Seats",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Libraries", icon: Library }),
  createBooleanMetric("is_active", true, "Active", Library, { id: "active" }),
  createSumMetric("total_seats", "total_seats", "Total Seats", Armchair, { format: "number" }),
  createSumMetric("occupied_seats", "occupied_seats", "Occupied", Users, { format: "number" }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Library Name", format: (v) => String(v ?? "") },
  { key: "code", header: "Code", format: (v) => String(v ?? "") },
  { key: "address", header: "Address", format: (v) => String(v ?? "") },
  { key: "city", header: "City", format: (v) => String(v ?? "") },
  { key: "state", header: "State", format: (v) => String(v ?? "") },
  { key: "pincode", header: "Pincode", format: (v) => String(v ?? "") },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "total_seats", header: "Total Seats", format: (v) => String(v ?? "0") },
  { key: "occupied_seats", header: "Occupied Seats", format: (v) => String(v ?? "0") },
  { key: "total_sections", header: "Sections", format: (v) => String(v ?? "0") },
  { key: "is_active", header: "Status", format: (v) => (v ? "Active" : "Inactive") },
  { key: "has_ac", header: "AC", format: (v) => (v ? "Yes" : "No") },
  { key: "has_wifi", header: "WiFi", format: (v) => (v ? "Yes" : "No") },
  { key: "has_lockers", header: "Lockers", format: (v) => (v ? "Yes" : "No") },
  { key: "has_parking", header: "Parking", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function LibrariesPage() {
  return (
    <ListPageTemplate
      tableKey="libraries"
      title="Libraries"
      description="Manage your study libraries and reading rooms"
      icon={Library}
      permission="library.view"
      module="members"
      config={LIBRARY_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by library name, code, city..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      exportColumns={exportColumns}
      exportFilename="libraries"
      createHref="/library/new"
      createLabel="Add Library"
      createPermission="library.create"
      detailHref={(library) => `/library/${library.id}`}
      emptyTitle="No libraries found"
      emptyDescription="Add your first library to start managing study spaces"
    />
  )
}
