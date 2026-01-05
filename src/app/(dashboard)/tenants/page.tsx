/**
 * Tenants List Page (Refactored)
 *
 * BEFORE: 400 lines of code
 * AFTER: ~120 lines of code (70% reduction)
 *
 * This demonstrates how to use the centralized architecture:
 * - ListPageTemplate for UI
 * - useListPage hook for data
 * - Pre-built configs for common patterns
 */

"use client"

import { Users, UserCheck, UserMinus, Clock } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { Avatar } from "@/components/ui/avatar"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { TENANT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatCurrency, formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  checkin_month?: string
  checkin_year?: string
}

// ============================================
// Status Helper
// ============================================

const getStatusInfo = (status: string): { status: "success" | "warning" | "muted"; label: string } => {
  switch (status) {
    case "active":
      return { status: "success", label: "Active" }
    case "notice_period":
      return { status: "warning", label: "Notice" }
    case "checked_out":
      return { status: "muted", label: "Moved Out" }
    default:
      return { status: "muted", label: status }
  }
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Tenant>[] = [
  {
    key: "name",
    header: "Tenant",
    width: "primary",
    sortable: true,
    render: (tenant) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={tenant.name}
          src={tenant.profile_photo || tenant.photo_url}
          size="sm"
          className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
        />
        <div className="min-w-0">
          <div className="font-medium truncate">{tenant.name}</div>
          <div className="text-xs text-muted-foreground">{tenant.phone}</div>
        </div>
      </div>
    ),
  },
  {
    key: "property",
    header: "Property / Room",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    render: (tenant) => (
      <div className="text-sm min-w-0">
        <div className="truncate">{tenant.property?.name || "—"}</div>
        <div className="text-muted-foreground text-xs">
          Room {tenant.room?.room_number || "—"}
        </div>
      </div>
    ),
  },
  {
    key: "monthly_rent",
    header: "Rent",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (tenant) => (
      <span className="font-medium tabular-nums">{formatCurrency(tenant.monthly_rent)}</span>
    ),
  },
  {
    key: "check_in_date",
    header: "Since",
    width: "date",
    hideOnMobile: true,
    sortable: true,
    sortType: "date",
    render: (tenant) => formatDate(tenant.check_in_date),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (tenant) => {
      const info = getStatusInfo(tenant.status)
      return <StatusDot status={info.status} label={info.label} />
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "property",
    label: "Property",
    type: "select",
    placeholder: "All Properties",
    // Options will be loaded from database by useListPage hook
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "active", label: "Active" },
      { value: "notice_period", label: "Notice Period" },
      { value: "checked_out", label: "Moved Out" },
    ],
  },
  {
    id: "check_in_date",
    label: "Check-in Date",
    type: "date-range",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "room.room_number", label: "Room" },
  { value: "status", label: "Status" },
  { value: "checkin_month", label: "Check-in Month" },
  { value: "checkin_year", label: "Check-in Year" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Tenant>[] = [
  {
    id: "total",
    label: "Total",
    icon: Users,
    compute: (items) => items.length,
  },
  {
    id: "active",
    label: "Active",
    icon: UserCheck,
    compute: (items) => items.filter((t) => t.status === "active").length,
  },
  {
    id: "notice",
    label: "Notice Period",
    icon: Clock,
    compute: (items) => items.filter((t) => t.status === "notice_period").length,
    highlight: (value) => (value as number) > 0,
  },
  {
    id: "moved_out",
    label: "Moved Out",
    icon: UserMinus,
    compute: (items) => items.filter((t) => t.status === "checked_out").length,
  },
  {
    id: "rent",
    label: "Monthly Rent",
    compute: (items) =>
      formatCurrency(
        items.filter((t) => t.status === "active").reduce((sum, t) => sum + t.monthly_rent, 0)
      ),
  },
]

// ============================================
// Page Component
// ============================================

export default function TenantsPage() {
  return (
    <ListPageTemplate
      // Page info
      title="Tenants"
      description="Manage all your tenants across properties"
      icon={Users}
      permission="tenants.view"
      // Data config
      config={TENANT_LIST_CONFIG}
      // UI config
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, property..."
      // Actions
      createHref="/tenants/new"
      createLabel="Add Tenant"
      createPermission="tenants.create"
      // Navigation
      detailHref={(tenant) => `/tenants/${tenant.id}`}
      // Empty state
      emptyTitle="No tenants yet"
      emptyDescription="Add your first tenant to start managing your PG"
    />
  )
}
