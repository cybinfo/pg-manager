/**
 * Staff List Page (Refactored)
 *
 * BEFORE: ~485 lines of code
 * AFTER: ~180 lines of code (63% reduction)
 */

"use client"

import Link from "next/link"
import {
  Users,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  UserCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { dateColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { STAFF_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createNullCheckMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { Avatar } from "@/components/ui/avatar"
import { PersonAvatarCell } from "@/components/ui/column-renders"
import { transformJoin } from "@/lib/supabase/transforms"
import { formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  user_id: string | null
  roles: {
    id: string
    role: { id: string; name: string; description: string | null } | null
    property: { id: string; name: string } | null
  }[]
  person: { id: string; name: string; photo_url: string | null } | null
  // Computed fields
  status_label?: string
  primary_role?: string
  account_status?: string
  joined_month?: string
  joined_year?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Transform staff roles from Supabase JOIN format
 * Handles both array (from JOIN) and object formats
 */
const transformStaffRoles = (staff: StaffMember) => {
  return (staff.roles || []).map((r) => ({
    ...r,
    role: transformJoin(r.role),
    property: transformJoin(r.property),
  }))
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<StaffMember>[] = [
  {
    key: "name",
    header: "Staff Member",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (staff) => {
      const roles = transformStaffRoles(staff)
      // Use person.name (live data) with fallback to staff.name (denormalized)
      const displayName = staff.person?.name || staff.name

      return (
        <div className="flex items-center gap-3">
          <Avatar
            name={displayName}
            src={staff.person?.photo_url}
            size="md"
            className={staff.is_active ? "" : "bg-muted text-muted-foreground"}
          />
          <div className={!staff.is_active ? "opacity-60" : ""}>
            <div className="font-medium flex items-center gap-2">
              {displayName}
              {!staff.is_active && (
                <TableBadge variant="muted">Inactive</TableBadge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {staff.email}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "phone",
    header: "Phone",
    width: "tertiary",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (staff) => staff.phone ? (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Phone className="h-3 w-3" />
        {staff.phone}
      </div>
    ) : (
      <span className="text-muted-foreground">-</span>
    ),
  },
  {
    key: "roles",
    header: "Roles",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (staff) => {
      const roles = transformStaffRoles(staff)

      return (
        <div className="flex flex-wrap gap-1">
          {roles.length > 0 ? (
            roles.slice(0, 2).map((userRole) => (
              <TableBadge key={userRole.id} variant="default">
                {userRole.role?.name}
              </TableBadge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No roles</span>
          )}
          {roles.length > 2 && (
            <TableBadge variant="muted">+{roles.length - 2}</TableBadge>
          )}
        </div>
      )
    },
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    sortKey: "is_active",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "boolean",
    editField: "is_active",
    render: (staff) => (
      <StatusDot
        status={staff.is_active ? "success" : "muted"}
        label={staff.is_active ? "Active" : "Inactive"}
      />
    ),
  },
  // Hidden by default columns
  {
    key: "email",
    header: "Email",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (staff) => staff.email,
  },
  {
    key: "user_id",
    header: "Has Login",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (staff) => (
      <StatusDot
        status={staff.user_id ? "success" : "muted"}
        label={staff.user_id ? "Yes" : "No"}
      />
    ),
  },
  dateColumn("created_at", "Joined", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "status_label", label: "Status" },
  { value: "primary_role", label: "Role" },
  { value: "account_status", label: "Account" },
  { value: "joined_month", label: "Joined Month" },
  { value: "joined_year", label: "Joined Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "email",
    header: "Email",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "is_active",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    key: "created_at",
    header: "Joined Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Staff", icon: Users }),
  createBooleanMetric("is_active", true, "Active", CheckCircle, { id: "active" }),
  createBooleanMetric("is_active", false, "Inactive", XCircle, { id: "inactive" }),
  createNullCheckMetric("user_id", false, "With Login", Shield, { id: "withLogin" }),
]

// ============================================
// Page Component
// ============================================

export default function StaffPage() {
  return (
    <ListPageTemplate
      tableKey="staff"
      title="Staff Management"
      description="Manage staff members and their access"
      icon={UserCog}
      permission="staff.view"
      config={STAFF_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, email, or phone..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/staff/new"
      createLabel="Add Staff"
      createPermission="staff.create"
      headerActions={
        <Link href="/staff/roles">
          <Button variant="outline">
            <Shield className="mr-2 h-4 w-4" />
            Manage Roles
          </Button>
        </Link>
      }
      detailHref={(staff) => `/staff/${staff.id}`}
      emptyTitle="No staff members found"
      emptyDescription="Add staff members to help manage your properties"
    />
  )
}
