/**
 * Library Waitlist List Page
 *
 * Shows prospective members waiting for spots.
 */

"use client"

import { useRouter } from "next/navigation"
import { ListPageConfig } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { ListPageTemplate } from "@/components/shared"
import { Column, StatusDot } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/column-builders"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter } from "@/lib/filter-presets"
import { Users, Clock, Check, Phone } from "lucide-react"
import { formatDate } from "@/lib/format"
import { LIBRARY_WAITLIST_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryWaitlist } from "@/types/library.types"

// List page configuration
const LIBRARY_WAITLIST_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_waitlist",
  select: `
    *,
    library:libraries(id, name)
  `,
  joinFields: ["library"],
  searchFields: ["name", "phone", "email"],
  defaultOrderBy: "position",
  defaultOrderDirection: "asc",
  defaultPageSize: 25,
}

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
  {
    id: "preferred_slot",
    label: "Slot",
    type: "select",
    options: [
      { value: "all", label: "All Slots" },
      { value: "Morning", label: "Morning" },
      { value: "Evening", label: "Evening" },
      { value: "Night", label: "Night" },
      { value: "24 Hours", label: "24 Hours" },
    ],
  },
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
    defaultVisible: true,
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
  dateColumn("created_at", "Joined"),
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
      searchPlaceholder="Search by name, phone, email..."
      onRowClick={(item) => router.push(`/library-waitlist/${item.id}`)}
      createHref="/library-waitlist/new"
      createLabel="Add to Waitlist"
      createPermission="library_waitlist.create"
      emptyTitle="No one on the waitlist"
      emptyDescription="Add prospective members to the waitlist when the library is full"
    />
  )
}
