/**
 * Library Members List Page
 *
 * Displays all library members with subscription and hours info.
 */

"use client"

import { Users, Library, Clock, CreditCard } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_MEMBER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, TIME_SLOT_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { LIBRARY_MEMBER_STATUS_CONFIG } from "@/types/library.types"

// ============================================
// Types
// ============================================

interface LibraryMemberItem {
  id: string
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  status: string
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  join_date: string
  expiry_date: string | null
  created_at: string
  person?: { id: string; name?: string; photo_url?: string } | null
  library?: { id: string; name: string } | null
  assigned_seat?: { id: string; seat_number: string; section?: { id: string; name: string } } | null
  // Computed
  display_name?: string
  join_month?: string
  join_year?: string
  status_label?: string
  hours_display?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LibraryMemberItem>[] = [
  {
    key: "name",
    header: "Member",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (member) => {
      const displayName = member.person?.name || member.name
      const photoUrl = member.person?.photo_url
      return (
        <div className="flex items-center gap-3">
          <Avatar name={displayName} src={photoUrl} size="sm" />
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {member.member_code || member.phone || "—"}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "library.name",
    header: "Library",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (member) => member.library?.name || "—",
  },
  {
    key: "hours_balance",
    header: "Hours",
    width: "secondary",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (member) => (
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className={member.hours_balance <= 0 ? "text-destructive font-medium" : ""}>
          {member.hours_balance?.toFixed(1) || 0}h left
        </span>
      </div>
    ),
  },
  {
    key: "preferred_slot",
    header: "Slot",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (member) => member.preferred_slot ? (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
        {member.preferred_slot}
      </span>
    ) : "—",
  },
  statusColumn(LIBRARY_MEMBER_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  // Hidden by default
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (member) => member.phone || "—",
  },
  {
    key: "email",
    header: "Email",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (member) => member.email || "—",
  },
  {
    key: "assigned_seat",
    header: "Seat",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (member) => member.assigned_seat ? (
      <span className="text-xs">
        {member.assigned_seat.seat_number}
        {member.assigned_seat.section && ` (${member.assigned_seat.section.name})`}
      </span>
    ) : "—",
  },
  {
    key: "hours_used",
    header: "Hours Used",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (member) => `${member.hours_used?.toFixed(1) || 0}h`,
  },
  dateColumn("join_date", "Joined", { defaultVisible: false }),
  dateColumn("expiry_date", "Expiry", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  LIBRARY_FILTER,
  createStatusFilter([
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "suspended", label: "Suspended" },
    { value: "cancelled", label: "Cancelled" },
  ]),
  TIME_SLOT_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "library.name", label: "Library" },
  { value: "status", label: "Status" },
  { value: "preferred_slot", label: "Time Slot" },
  { value: "join_month", label: "Join Month" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Members", icon: Users }),
  createStatusMetric("active", "Active", Users),
  createStatusMetric("expired", "Expired", Users),
  createCountMetric("low_hours", "Low Hours (<2h)", Clock,
    (item) => (Number(item.hours_balance) || 0) < 2 && item.status === "active"
  ),
]

// ============================================
// Page Component
// ============================================

export default function LibraryMembersPage() {
  return (
    <ListPageTemplate
      tableKey="library-members"
      title="Library Members"
      description="Manage member subscriptions and hours"
      icon={Users}
      permission="library_members.view"
      feature="library"
      config={LIBRARY_MEMBER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, member code..."
      enableColumnManager={true}
      createHref="/library-members/new"
      createLabel="Add Member"
      createPermission="library_members.create"
      detailHref={(member) => `/library-members/${member.id}`}
      emptyTitle="No members found"
      emptyDescription="Add your first member to start tracking subscriptions"
    />
  )
}
