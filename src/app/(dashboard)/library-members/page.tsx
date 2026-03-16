/**
 * Library Members List Page
 *
 * Displays all library members with subscription and hours info.
 */

"use client"

import { Users, Library, Clock, CreditCard, AlertTriangle, CalendarClock } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { statusColumn, dateColumn, personNameWithAvatarColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_MEMBER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, TIME_SLOT_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { formatDate } from "@/lib/format"
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
  overdue_days?: number
  days_until_expiry?: number
  overdue_status?: string
  missing_data_count?: number
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LibraryMemberItem>[] = [
  personNameWithAvatarColumn("Member", {
    subtitleField: ["member_code", "phone"],
  }) as Column<LibraryMemberItem>,
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
  {
    key: "overdue_status",
    header: "Overdue Status",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (member) => {
      if (!member.expiry_date) return "—"
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(member.expiry_date)
      expiry.setHours(0, 0, 0, 0)
      const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < -30) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">Severely Overdue</span>
      if (diff < 0) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">Overdue</span>
      if (diff <= 7) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Expiring Soon</span>
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">Current</span>
    },
  },
  {
    key: "overdue_days",
    header: "Overdue Days",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (member) => {
      if (!member.expiry_date) return "—"
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(member.expiry_date)
      expiry.setHours(0, 0, 0, 0)
      const diff = Math.ceil((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24))
      if (diff <= 0) return "—"
      return <span className="text-destructive font-medium">{diff}d</span>
    },
  },
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
  { value: "overdue_status", label: "Overdue Status" },
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
  createCountMetric("overdue", "Overdue", AlertTriangle,
    (item) => {
      if (!item.expiry_date || item.status !== "active") return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(item.expiry_date as string)
      expiry.setHours(0, 0, 0, 0)
      return expiry < today
    }
  ),
  createCountMetric("expiring_soon", "Expiring Soon", CalendarClock,
    (item) => {
      if (!item.expiry_date || item.status !== "active") return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(item.expiry_date as string)
      expiry.setHours(0, 0, 0, 0)
      const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 7
    }
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
