/**
 * Library Sections List Page
 *
 * Displays all sections across libraries with seat stats.
 */

"use client"

import { Grid3X3, Armchair } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_SECTION_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, ACTIVE_STATUS_FILTER, LIBRARY_AC_TYPE_FILTER } from "@/lib/filter-presets"
import { Currency } from "@/components/ui/currency"
import { dateColumn } from "@/lib/columns"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, numberFilterColumn, booleanFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn } from "@/lib/export-columns"

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
      const colorClass = percent >= 80 ? "text-destructive" : percent >= 50 ? "text-warning" : "text-success"
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
      <TableBadge variant={section.is_ac ? "info" : "muted"}>
        {section.is_ac ? "AC" : "Non-AC"}
      </TableBadge>
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
  dateColumn("created_at", "Added On", { defaultVisible: false }),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Section Name", ["contains", "eq", "neq", "starts", "ends"]),
  numberFilterColumn("total_seats", "Total Seats"),
  numberFilterColumn("occupied_seats", "Occupied Seats"),
  booleanFilterColumn("is_ac", "AC/Non-AC", { trueLabel: "AC", falseLabel: "Non-AC" }),
  booleanFilterColumn("is_active", "Status", { trueLabel: "Active", falseLabel: "Inactive" }),
  booleanFilterColumn("has_power_outlets", "Power Outlets"),
  numberFilterColumn("floor", "Floor"),
  numberFilterColumn("hourly_rate", "Hourly Rate"),
  numberFilterColumn("monthly_rate", "Monthly Rate"),
  dateFilterColumn("created_at", "Added On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Sections", icon: Grid3X3 }),
  createSumMetric("total_seats", "total_seats", "Total Seats", Armchair, { format: "number" }),
  createSumMetric("occupied_seats", "occupied", "Occupied", Armchair, { format: "number" }),
  createBooleanMetric("is_ac", true, "AC Sections", Grid3X3, { id: "ac_sections" }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Section Name" },
  nestedColumn("library_name", "Library", "library.name"),
  { key: "section_number", header: "Section #", format: (v) => String(v ?? "") },
  { key: "floor", header: "Floor", format: (v) => String(v ?? "0") },
  { key: "total_seats", header: "Total Seats", format: (v) => String(v ?? "0") },
  { key: "occupied_seats", header: "Occupied Seats", format: (v) => String(v ?? "0") },
  { key: "is_ac", header: "AC", format: (v) => (v ? "AC" : "Non-AC") },
  { key: "has_power_outlets", header: "Power Outlets", format: (v) => (v ? "Yes" : "No") },
  currencyExportColumn("hourly_rate", "Hourly Rate"),
  currencyExportColumn("monthly_rate", "Monthly Rate"),
  { key: "is_active", header: "Status", format: (v) => (v ? "Active" : "Inactive") },
  dateExportColumn("created_at", "Added On"),
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
      module="sections"
      config={LIBRARY_SECTION_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by section name, library..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
exportColumns={exportColumns}
      exportFilename="library-sections"
      createHref="/library-sections/new"
      createLabel="Add Section"
      createPermission="library_sections.create"
      detailHref={(section) => `/library-sections/${section.id}`}
      emptyTitle="No sections found"
      emptyDescription="Add your first section to organize seating areas"
    />
  )
}
