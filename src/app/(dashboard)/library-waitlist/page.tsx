/**
 * Library Waitlist List Page
 *
 * Shows prospective members waiting for spots.
 */

"use client"

import { useRouter } from "next/navigation"
import { LIBRARY_WAITLIST_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { ListPageTemplate } from "@/components/shared"
import { Column } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/columns"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter, TIME_SLOT_FILTER } from "@/lib/filter-presets"
import { Users, Clock, Check, Phone } from "lucide-react"
import { LIBRARY_WAITLIST_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryWaitlist } from "@/types/library.types"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn, labelMapColumn } from "@/lib/export-columns"

// Metric configurations
const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ icon: Users }),
  createStatusMetric("waiting", "Waiting", Clock),
  createStatusMetric("contacted", "Contacted", Phone),
  createStatusMetric("converted", "Converted", Check),
]

// Filter configurations
const filters: FilterConfig[] = [
  createStatusFilter([
    { value: "all", label: "All Status" },
    { value: "waiting", label: "Waiting" },
    { value: "contacted", label: "Contacted" },
    { value: "converted", label: "Converted" },
    { value: "cancelled", label: "Cancelled" },
  ]),
  TIME_SLOT_FILTER,
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Name", ["contains", "eq", "neq", "starts", "ends"]),
  textFilterColumn("phone", "Phone"),
  textFilterColumn("email", "Email", ["contains", "eq", "is_null", "is_not_null"]),
  statusFilterColumn([
    { value: "waiting", label: "Waiting" },
    { value: "contacted", label: "Contacted" },
    { value: "converted", label: "Converted" },
    { value: "cancelled", label: "Cancelled" },
  ]),
  selectFilterColumn("preferred_slot", "Preferred Slot", TIME_SLOT_FILTER.options!),
  dateFilterColumn("created_at", "Joined On"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "status", label: "Status" },
  { value: "preferred_slot", label: "Preferred Slot" },
]

// ============================================
// Export Columns
// ============================================

const WAITLIST_STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  contacted: "Contacted",
  converted: "Converted",
  cancelled: "Cancelled",
}

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "position", header: "Position", format: (v) => String(v ?? "") },
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  labelMapColumn("status", "Status", WAITLIST_STATUS_LABELS),
  { key: "preferred_slot", header: "Preferred Slot", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Joined On"),
]

// Column definitions
const columns: Column<LibraryWaitlist>[] = [
  {
    key: "position",
    header: "#",
    width: "count",
    sortable: true,
    canHide: false,
    render: (item) => (
      <span className="font-mono text-muted-foreground">
        {item.status === "waiting" && item.position ? `#${item.position}` : "—"}
      </span>
    ),
  },
  {
    key: "name",
    header: "Name",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (item) => (
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">{item.phone}</p>
      </div>
    ),
  },
  {
    key: "library.name",
    header: "Library",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (item) => item.library?.name || "—",
  },
  {
    key: "preferred_slot",
    header: "Slot",
    width: "badge",
    canHide: true,
    defaultVisible: true,
    render: (item) => (
      item.preferred_slot ? (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
          {item.preferred_slot}
        </span>
      ) : "—"
    ),
  },
  statusColumn(LIBRARY_WAITLIST_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  dateColumn("created_at", "Joined", { defaultVisible: false }),
]

export default function LibraryWaitlistPage() {
  const router = useRouter()

  return (
    <ListPageTemplate
      tableKey="library-waitlist"
      config={LIBRARY_WAITLIST_LIST_CONFIG}
      columns={columns}
      filters={filters}
      metrics={metrics}
      title="Waitlist"
      description="Manage prospective library members"
      icon={Users}
      permission="library_waitlist.view"
      module="waitlist"
      searchPlaceholder="Search by name, phone, email..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="library-waitlist"
      groupByOptions={groupByOptions}
      onRowClick={(item) => router.push(`/library-waitlist/${item.id}`)}
      createHref="/library-waitlist/new"
      createLabel="Add to Waitlist"
      createPermission="library_waitlist.create"
      emptyTitle="No one on the waitlist"
      emptyDescription="Add prospective members to the waitlist when the library is full"
    />
  )
}
