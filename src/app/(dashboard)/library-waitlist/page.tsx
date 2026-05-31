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
import { Column, TableBadge } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/columns"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter, TIME_SLOT_FILTER } from "@/lib/filter-presets"
import { Users, Clock, Check, Phone } from "lucide-react"
import { LIBRARY_WAITLIST_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryWaitlist } from "@/types/library.types"
import { LIBRARY_WAITLIST_STATUS_LABELS, LIBRARY_WAITLIST_STATUS_OPTIONS } from "@/lib/status"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { useFeatures } from "@/lib/features/use-features"
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
  createStatusFilter(LIBRARY_WAITLIST_STATUS_OPTIONS),
  TIME_SLOT_FILTER,
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Name", ["contains", "eq", "neq", "starts", "ends"]),
  textFilterColumn("phone", "Phone"),
  textFilterColumn("email", "Email", ["contains", "eq", "is_null", "is_not_null"]),
  statusFilterColumn(LIBRARY_WAITLIST_STATUS_OPTIONS),
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

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "position", header: "Position", format: (v) => String(v ?? "") },
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  labelMapColumn("status", "Status", LIBRARY_WAITLIST_STATUS_LABELS),
  { key: "preferred_slot", header: "Preferred Slot", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Joined On"),
]

export default function LibraryWaitlistPage() {
  const router = useRouter()
  const { isFeatureEnabled } = useFeatures()
  const autoQueueingEnabled = isFeatureEnabled("waitlist", "autoQueueing")

  const columns: Column<LibraryWaitlist>[] = [
    {
      key: autoQueueingEnabled ? "queue_position" : "position",
      header: "#",
      width: "count",
      sortable: true,
      canHide: false,
      render: (item) => {
        const pos = autoQueueingEnabled ? item.queue_position : item.position
        return (
          <span className="font-mono text-muted-foreground">
            {item.status === "waiting" && pos ? `#${pos}` : "—"}
          </span>
        )
      },
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
          <TableBadge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {item.preferred_slot}
          </TableBadge>
        ) : "—"
      ),
    },
    statusColumn(LIBRARY_WAITLIST_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
    dateColumn("created_at", "Joined", { defaultVisible: false }),
  ]

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
