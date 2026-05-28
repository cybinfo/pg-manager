/**
 * Library Lockers List Page
 *
 * Displays all lockers with assignment status.
 */

"use client"

import { Lock, Users } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_LOCKER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { Currency } from "@/components/ui/currency"
import { LIBRARY_LOCKER_STATUS_CONFIG, LIBRARY_LOCKER_SIZE_CONFIG } from "@/types/library.types"
import { LIBRARY_LOCKER_SIZE_LABELS, LIBRARY_LOCKER_STATUS_LABELS } from "@/lib/status"
import { LOCKER_STATUS_OPTIONS, LOCKER_SIZE_OPTIONS } from "@/lib/constants/form-options"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, numberFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn, labelMapColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface LockerItem {
  id: string
  locker_number: string
  size: string
  floor: number
  section: string | null
  monthly_rent: number | null
  deposit_amount: number | null
  status: string
  assigned_from: string | null
  assigned_until: string | null
  created_at: string
  library?: { id: string; name: string } | null
  current_member?: { id: string; name: string; member_code: string | null } | null
  // Computed
  status_label?: string
  size_label?: string
  display_rent?: string
  display_deposit?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LockerItem>[] = [
  {
    key: "locker_number",
    header: "Locker",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (locker) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
          locker.status === "available" ? "bg-success/10" :
          locker.status === "occupied" ? "bg-info/10" : "bg-muted"
        }`}>
          <Lock className={`h-4 w-4 ${
            locker.status === "available" ? "text-success" :
            locker.status === "occupied" ? "text-info" : "text-muted-foreground"
          }`} />
        </div>
        <div>
          <div className="font-medium">#{locker.locker_number}</div>
          <div className="text-xs text-muted-foreground">
            {locker.library?.name}
            {locker.section && ` • ${locker.section}`}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "size",
    header: "Size",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (locker) => {
      const config = LIBRARY_LOCKER_SIZE_CONFIG[locker.size as keyof typeof LIBRARY_LOCKER_SIZE_CONFIG]
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          locker.size === "large" ? "bg-info/10 text-info" :
          locker.size === "medium" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
          "bg-muted text-muted-foreground"
        }`}>
          {config?.label || locker.size}
        </span>
      )
    },
  },
  {
    key: "monthly_rent",
    header: "Rent",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (locker) => locker.monthly_rent ? (
      <Currency amount={locker.monthly_rent} />
    ) : "—",
  },
  statusColumn(LIBRARY_LOCKER_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  {
    key: "current_member",
    header: "Assigned To",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (locker) => locker.current_member ? (
      <div>
        <div className="font-medium text-sm">{locker.current_member.name}</div>
        <div className="text-xs text-muted-foreground">{locker.current_member.member_code}</div>
      </div>
    ) : (
      <span className="text-success text-sm flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
        Available
      </span>
    ),
  },
  // Hidden by default
  {
    key: "floor",
    header: "Floor",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (locker) => locker.floor === 0 ? "Ground" : `Floor ${locker.floor}`,
  },
  {
    key: "deposit_amount",
    header: "Deposit",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (locker) => locker.deposit_amount ? (
      <Currency amount={locker.deposit_amount} />
    ) : "—",
  },
  dateColumn("assigned_from", "Assigned From", { defaultVisible: false }),
  dateColumn("assigned_until", "Assigned Until", { defaultVisible: false }),
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  LIBRARY_FILTER,
  createStatusFilter(LOCKER_STATUS_OPTIONS),
  {
    id: "size",
    label: "Size",
    type: "select",
    placeholder: "All Sizes",
    options: LOCKER_SIZE_OPTIONS,
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "library.name", label: "Library" },
  { value: "status", label: "Status" },
  { value: "size", label: "Size" },
  { value: "floor", label: "Floor" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("locker_number", "Locker Number"),
  selectFilterColumn("size", "Size", LOCKER_SIZE_OPTIONS),
  statusFilterColumn(LOCKER_STATUS_OPTIONS),
  numberFilterColumn("floor", "Floor"),
  numberFilterColumn("monthly_rent", "Monthly Rent"),
  numberFilterColumn("deposit_amount", "Deposit Amount"),
  textFilterColumn("section", "Section"),
  dateFilterColumn("assigned_from", "Assigned From", ["is_null", "is_not_null"]),
  dateFilterColumn("assigned_until", "Assigned Until", ["is_null", "is_not_null"]),
  dateFilterColumn("created_at", "Added On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Lockers", icon: Lock }),
  createStatusMetric("available", "Available", Lock),
  createStatusMetric("occupied", "Occupied", Users),
  createStatusMetric("maintenance", "Maintenance", Lock),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "locker_number", header: "Locker Number" },
  nestedColumn("library_name", "Library", "library.name"),
  labelMapColumn("size", "Size", LIBRARY_LOCKER_SIZE_LABELS),
  labelMapColumn("status", "Status", LIBRARY_LOCKER_STATUS_LABELS),
  currencyExportColumn("monthly_rent", "Monthly Rent"),
  currencyExportColumn("deposit_amount", "Deposit"),
  { key: "floor", header: "Floor", format: (v) => (Number(v) === 0 ? "Ground" : `Floor ${v}`) },
  { key: "section", header: "Section", format: (v) => String(v ?? "") },
  nestedColumn("member_name", "Assigned To", "current_member.name"),
  nestedColumn("member_code", "Member Code", "current_member.member_code"),
  dateExportColumn("assigned_from", "Assigned From"),
  dateExportColumn("assigned_until", "Assigned Until"),
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function LibraryLockersPage() {
  return (
    <ListPageTemplate
      tableKey="library-lockers"
      title="Lockers"
      description="Manage locker rentals and assignments"
      icon={Lock}
      permission="library_lockers.view"
      module="lockers"
      config={LIBRARY_LOCKER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by locker number, library..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="library-lockers"
      createHref="/library-lockers/new"
      createLabel="Add Locker"
      createPermission="library_lockers.create"
      detailHref={(locker) => `/library-lockers/${locker.id}`}
      emptyTitle="No lockers found"
      emptyDescription="Add lockers to offer storage to your members"
    />
  )
}
