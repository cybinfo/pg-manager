/**
 * Library Sections List Page
 *
 * Displays all sections across libraries with seat stats.
 */

"use client"

import { Grid3X3, Armchair, Library } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_SECTION_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, ACTIVE_STATUS_FILTER, LIBRARY_AC_TYPE_FILTER } from "@/lib/filter-presets"
import { formatDate } from "@/lib/format"
import { Currency } from "@/components/ui/currency"

// ============================================
// Types
// ============================================

interface LibrarySectionItem {
  id: string
  name: string
  section_number: string | null
  floor: number
  total_seats: number
  occupied_seats: number
  is_ac: boolean
  has_power_outlets: boolean
  hourly_rate: number | null
  monthly_rate: number | null
  is_active: boolean
  created_at: string
  library?: { id: string; name: string; code?: string } | null
  // Computed
  available_seats?: number
  occupancy_percent?: number
  status_label?: string
  ac_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LibrarySectionItem>[] = [
  {
    key: "name",
    header: "Section",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (section) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Grid3X3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium">{section.name}</div>
          <div className="text-xs text-muted-foreground">
            {section.library?.name}
            {section.floor > 0 && ` • Floor ${section.floor}`}
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
    render: (section) => (
      <div className="flex items-center gap-1.5">
        <Armchair className="h-4 w-4 text-muted-foreground" />
        <span>{section.occupied_seats}/{section.total_seats}</span>
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
    render: (section) => {
      const percent = section.occupancy_percent || 0
      const colorClass = percent >= 80 ? "text-red-600" : percent >= 50 ? "text-yellow-600" : "text-green-600"
      return <span className={`font-medium ${colorClass}`}>{percent}%</span>
    },
  },
  {
    key: "is_ac",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (section) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        section.is_ac ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-muted text-muted-foreground"
      }`}>
        {section.is_ac ? "AC" : "Non-AC"}
      </span>
    ),
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (section) => (
      <StatusDot
        status={section.is_active ? "success" : "muted"}
        label={section.is_active ? "Active" : "Inactive"}
      />
    ),
  },
  // Hidden by default
  {
    key: "hourly_rate",
    header: "Hourly Rate",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (section) => section.hourly_rate ? <Currency amount={section.hourly_rate} /> : "—",
  },
  {
    key: "monthly_rate",
    header: "Monthly Rate",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (section) => section.monthly_rate ? <Currency amount={section.monthly_rate} /> : "—",
  },
  {
    key: "has_power_outlets",
    header: "Power",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (section) => section.has_power_outlets ? "Yes" : "No",
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (section) => formatDate(section.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  LIBRARY_FILTER,
  LIBRARY_AC_TYPE_FILTER,
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "library.name", label: "Library" },
  { value: "is_ac", label: "AC/Non-AC" },
  { value: "floor", label: "Floor" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Sections", icon: Grid3X3 }),
  {
    id: "total_seats",
    label: "Total Seats",
    icon: Armchair,
    compute: (items) => items.reduce((sum: number, s) => sum + (Number(s.total_seats) || 0), 0),
  },
  {
    id: "occupied",
    label: "Occupied",
    icon: Armchair,
    compute: (items) => items.reduce((sum: number, s) => sum + (Number(s.occupied_seats) || 0), 0),
  },
  createBooleanMetric("is_ac", true, "AC Sections", Grid3X3, { id: "ac_sections" }),
]

// ============================================
// Page Component
// ============================================

export default function LibrarySectionsPage() {
  return (
    <ListPageTemplate
      tableKey="library-sections"
      title="Library Sections"
      description="Manage sections and seating areas"
      icon={Grid3X3}
      permission="library_sections.view"
      feature="library"
      config={LIBRARY_SECTION_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by section name, library..."
      enableColumnManager={true}
      createHref="/library-sections/new"
      createLabel="Add Section"
      createPermission="library_sections.create"
      detailHref={(section) => `/library-sections/${section.id}`}
      emptyTitle="No sections found"
      emptyDescription="Add your first section to organize seating areas"
    />
  )
}
