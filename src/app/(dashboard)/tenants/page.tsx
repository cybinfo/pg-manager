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
import { Avatar, getAvatarUrl } from "@/components/ui/avatar"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { TENANT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency, formatDate } from "@/lib/format"
import { getStatusInfo as getTenantStatusInfo } from "@/lib/status-config"

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
  check_out_date: string | null
  expected_exit_date: string | null
  notice_date: string | null
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  created_at: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  person: { id: string; name: string; photo_url: string | null } | null
  checkin_month?: string
  checkin_year?: string
}

// Status helper uses centralized TENANT_STATUS from status-config

// ============================================
// Column Definitions
// ============================================

// Extended column type with metadata for advanced features
interface ExtendedColumn<T> extends Column<T> {
  canHide?: boolean
  defaultVisible?: boolean
  groupable?: boolean
  groupKey?: string
  groupLabel?: string
}

const columns: ExtendedColumn<Tenant>[] = [
  {
    key: "name",
    header: "Tenant",
    width: "primary",
    sortable: true,
    canHide: false, // Always visible - primary identifier
    defaultVisible: true,
    render: (tenant) => {
      // Use person.name (live data) with fallback to tenant.name (denormalized)
      const displayName = tenant.person?.name || tenant.name
      return (
        <div className="flex items-center gap-3">
          {/* UI-008: Use centralized avatar URL resolution */}
          <Avatar
            name={displayName}
            src={getAvatarUrl(tenant)}
            size="sm"
            className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
          />
          <div className="min-w-0">
            <div className="font-medium truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground">{tenant.phone}</div>
          </div>
        </div>
      )
    },
  },
  {
    key: "property",
    header: "Property / Room",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    groupable: true,
    groupKey: "property.name",
    groupLabel: "Property",
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
    render: (tenant) => formatDate(tenant.check_in_date),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    groupable: true,
    groupKey: "status",
    groupLabel: "Status",
    render: (tenant) => {
      const info = getTenantStatusInfo("tenant", tenant.status)
      return <StatusDot status={info.status} label={info.label} />
    },
  },
  // Additional columns - hidden by default, user can toggle them on
  {
    key: "email",
    header: "Email",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (tenant) => tenant.email || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (tenant) => tenant.phone,
  },
  {
    key: "security_deposit",
    header: "Security Deposit",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (tenant) => (
      <span className="tabular-nums">{formatCurrency(tenant.security_deposit)}</span>
    ),
  },
  {
    key: "police_verification_status",
    header: "Police Verification",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    groupable: true,
    render: (tenant) => {
      const statusMap: Record<string, { label: string; className: string }> = {
        pending: { label: "Pending", className: "text-yellow-600 bg-yellow-50" },
        submitted: { label: "Submitted", className: "text-blue-600 bg-blue-50" },
        verified: { label: "Verified", className: "text-green-600 bg-green-50" },
        rejected: { label: "Rejected", className: "text-red-600 bg-red-50" },
        not_required: { label: "Not Required", className: "text-gray-600 bg-gray-50" },
      }
      const status = statusMap[tenant.police_verification_status] || statusMap.pending
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      )
    },
  },
  {
    key: "agreement_signed",
    header: "Agreement",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (tenant) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        tenant.agreement_signed
          ? "text-green-600 bg-green-50"
          : "text-yellow-600 bg-yellow-50"
      }`}>
        {tenant.agreement_signed ? "Signed" : "Pending"}
      </span>
    ),
  },
  {
    key: "check_out_date",
    header: "Check-out Date",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (tenant) => tenant.check_out_date ? formatDate(tenant.check_out_date) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "expected_exit_date",
    header: "Expected Exit",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (tenant) => tenant.expected_exit_date ? formatDate(tenant.expected_exit_date) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notice_date",
    header: "Notice Date",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (tenant) => tenant.notice_date ? formatDate(tenant.notice_date) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (tenant) => formatDate(tenant.created_at),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Tenant Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "email",
    header: "Email",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "is_null", "is_not_null"],
  },
  {
    key: "phone",
    header: "Phone",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "active", label: "Active" },
      { value: "notice_period", label: "Notice Period" },
      { value: "checked_out", label: "Moved Out" },
    ],
  },
  {
    key: "monthly_rent",
    header: "Monthly Rent",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "security_deposit",
    header: "Security Deposit",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "check_in_date",
    header: "Check-in Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "check_out_date",
    header: "Check-out Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  },
  {
    key: "notice_date",
    header: "Notice Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  },
  {
    key: "police_verification_status",
    header: "Police Verification",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "pending", label: "Pending" },
      { value: "submitted", label: "Submitted" },
      { value: "verified", label: "Verified" },
      { value: "rejected", label: "Rejected" },
      { value: "not_required", label: "Not Required" },
    ],
  },
  {
    key: "agreement_signed",
    header: "Agreement Signed",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "created_at",
    header: "Added On",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Tenant>[] = [
  {
    id: "total",
    label: "Total",
    icon: Users,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "active",
    label: "Active",
    icon: UserCheck,
    compute: (items) => items.filter((t) => t.status === "active").length,
    serverFilter: {
      column: "status",
      operator: "eq",
      value: "active",
    },
  },
  {
    id: "notice",
    label: "Notice Period",
    icon: Clock,
    compute: (items) => items.filter((t) => t.status === "notice_period").length,
    highlight: (value) => (value as number) > 0,
    serverFilter: {
      column: "status",
      operator: "eq",
      value: "notice_period",
    },
  },
  {
    id: "moved_out",
    label: "Moved Out",
    icon: UserMinus,
    compute: (items) => items.filter((t) => t.status === "checked_out").length,
    serverFilter: {
      column: "status",
      operator: "eq",
      value: "checked_out",
    },
  },
  {
    id: "rent",
    label: "Monthly Rent",
    compute: (items, _total, serverData) => {
      // If server sum is available, use it; otherwise fall back to page data
      if (serverData?.rent !== undefined) {
        return formatCurrency(serverData.rent)
      }
      return formatCurrency(
        items.filter((t) => t.status === "active").reduce((sum, t) => sum + t.monthly_rent, 0)
      )
    },
    serverSum: {
      column: "monthly_rent",
      filter: {
        column: "status",
        operator: "eq",
        value: "active",
      },
    },
  },
]

// ============================================
// Page Component
// ============================================

export default function TenantsPage() {
  return (
    <ListPageTemplate
      tableKey="tenants"
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
      // Advanced Table Features
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
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
