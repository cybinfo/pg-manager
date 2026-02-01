/**
 * Library Lockers List Page
 *
 * Displays all lockers with assignment status.
 */

"use client"

import { Lock, Library, Users } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_LOCKER_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatDate } from "@/lib/format"
import { Currency } from "@/components/ui/currency"
import { LIBRARY_LOCKER_STATUS_CONFIG, LIBRARY_LOCKER_SIZE_CONFIG } from "@/types/library.types"

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
          locker.status === "available" ? "bg-green-100" :
          locker.status === "occupied" ? "bg-blue-100" : "bg-gray-100"
        }`}>
          <Lock className={`h-4 w-4 ${
            locker.status === "available" ? "text-green-600" :
            locker.status === "occupied" ? "text-blue-600" : "text-gray-600"
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
          locker.size === "large" ? "bg-blue-100 text-blue-700" :
          locker.size === "medium" ? "bg-purple-100 text-purple-700" :
          "bg-gray-100 text-gray-700"
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
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (locker) => {
      const config = LIBRARY_LOCKER_STATUS_CONFIG[locker.status as keyof typeof LIBRARY_LOCKER_STATUS_CONFIG]
      return (
        <StatusDot
          status={config?.variant || "muted"}
          label={config?.label || locker.status}
        />
      )
    },
  },
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
      <span className="text-muted-foreground">—</span>
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
  {
    key: "assigned_from",
    header: "Assigned From",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (locker) => locker.assigned_from ? formatDate(locker.assigned_from) : "—",
  },
  {
    key: "assigned_until",
    header: "Assigned Until",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (locker) => locker.assigned_until ? formatDate(locker.assigned_until) : "—",
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (locker) => formatDate(locker.created_at),
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
      { value: "available", label: "Available" },
      { value: "occupied", label: "Occupied" },
      { value: "maintenance", label: "Maintenance" },
    ],
  },
  {
    id: "size",
    label: "Size",
    type: "select",
    placeholder: "All Sizes",
    options: [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<LockerItem>[] = [
  {
    id: "total",
    label: "Total Lockers",
    icon: Lock,
    compute: (_items, total) => total,
  },
  {
    id: "available",
    label: "Available",
    icon: Lock,
    compute: (items) => items.filter((l) => l.status === "available").length,
  },
  {
    id: "occupied",
    label: "Occupied",
    icon: Users,
    compute: (items) => items.filter((l) => l.status === "occupied").length,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Lock,
    compute: (items) => items.filter((l) => l.status === "maintenance").length,
  },
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
      config={LIBRARY_LOCKER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by locker number, library..."
      enableColumnManager={true}
      createHref="/library-lockers/new"
      createLabel="Add Locker"
      createPermission="library_lockers.create"
      detailHref={(locker) => `/library-lockers/${locker.id}`}
      emptyTitle="No lockers found"
      emptyDescription="Add lockers to offer storage to your members"
    />
  )
}
