/**
 * Library Members List Page
 *
 * Displays all library members with subscription and hours info.
 */

"use client"

import { Users, Library, Clock, CreditCard } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_MEMBER_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
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
        <span className={member.hours_balance <= 0 ? "text-red-600 font-medium" : ""}>
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
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (member) => {
      const config = LIBRARY_MEMBER_STATUS_CONFIG[member.status as keyof typeof LIBRARY_MEMBER_STATUS_CONFIG]
      return (
        <StatusDot
          status={config?.variant || "muted"}
          label={config?.label || member.status}
        />
      )
    },
  },
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
  {
    key: "join_date",
    header: "Joined",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (member) => formatDate(member.join_date),
  },
  {
    key: "expiry_date",
    header: "Expiry",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (member) => member.expiry_date ? formatDate(member.expiry_date) : "—",
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "library_id",
    label: "Library",
    type: "select",
    placeholder: "All Libraries",
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "active", label: "Active" },
      { value: "expired", label: "Expired" },
      { value: "suspended", label: "Suspended" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    id: "preferred_slot",
    label: "Slot",
    type: "select",
    placeholder: "All Slots",
    options: [
      { value: "Morning", label: "Morning" },
      { value: "Evening", label: "Evening" },
      { value: "Night", label: "Night" },
      { value: "24 Hours", label: "24 Hours" },
    ],
  },
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

const metrics: MetricConfig<LibraryMemberItem>[] = [
  {
    id: "total",
    label: "Members",
    icon: Users,
    compute: (_items, total) => total,
  },
  {
    id: "active",
    label: "Active",
    icon: Users,
    compute: (items) => items.filter((m) => m.status === "active").length,
  },
  {
    id: "expired",
    label: "Expired",
    icon: Users,
    compute: (items) => items.filter((m) => m.status === "expired").length,
  },
  {
    id: "low_hours",
    label: "Low Hours (<2h)",
    icon: Clock,
    compute: (items) => items.filter((m) => m.hours_balance < 2 && m.status === "active").length,
  },
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
