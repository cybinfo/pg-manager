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
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { STAFF_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { Avatar } from "@/components/ui/avatar"
import { transformJoin } from "@/lib/supabase/transforms"

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
  // Computed fields
  status_label?: string
  primary_role?: string
  account_status?: string
  joined_month?: string
  joined_year?: string
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
    render: (staff) => {
      // Transform roles if they're arrays (from Supabase JOIN)
      const roles = (staff.roles || []).map((r) => ({
        ...r,
        role: Array.isArray(r.role) ? transformJoin(r.role) : r.role,
        property: Array.isArray(r.property) ? transformJoin(r.property) : r.property,
      }))

      return (
        <div className="flex items-center gap-3">
          <Avatar
            name={staff.name}
            size="md"
            className={staff.is_active ? "" : "bg-gray-100 text-gray-500"}
          />
          <div className={!staff.is_active ? "opacity-60" : ""}>
            <div className="font-medium flex items-center gap-2">
              {staff.name}
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
    render: (staff) => {
      // Transform roles if they're arrays (from Supabase JOIN)
      const roles = (staff.roles || []).map((r) => ({
        ...r,
        role: Array.isArray(r.role) ? transformJoin(r.role) : r.role,
        property: Array.isArray(r.property) ? transformJoin(r.property) : r.property,
      }))

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
    render: (staff) => (
      <StatusDot
        status={staff.is_active ? "success" : "muted"}
        label={staff.is_active ? "Active" : "Inactive"}
      />
    ),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "is_active",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<StaffMember>[] = [
  {
    id: "total",
    label: "Total Staff",
    icon: Users,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "active",
    label: "Active",
    icon: CheckCircle,
    compute: (items) => items.filter((s) => s.is_active).length,
  },
  {
    id: "inactive",
    label: "Inactive",
    icon: XCircle,
    compute: (items) => items.filter((s) => !s.is_active).length,
  },
  {
    id: "withLogin",
    label: "With Login",
    icon: Shield,
    compute: (items) => items.filter((s) => s.user_id).length,
  },
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
