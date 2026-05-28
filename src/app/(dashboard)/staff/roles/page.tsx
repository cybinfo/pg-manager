"use client"

import { Shield, Lock, Users, Check } from "lucide-react"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { dateColumn, booleanColumn, countColumn } from "@/lib/columns"
import { Column } from "@/components/ui/data-table"
import { createDateRangeFilter } from "@/lib/filter-presets"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, booleanFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import { GroupByOption, ListPageConfig } from "@/lib/hooks/useListPage"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"
import { TableBadge } from "@/components/ui/data-table"

// ============================================
// Types
// ============================================

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
  permissions: string[]
  created_at: string
  user_roles?: { id: string }[]
}

// ============================================
// Config
// ============================================

const ROLES_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "roles",
  select: `
    *,
    user_roles(id)
  `,
  defaultOrderBy: "is_system_role",
  defaultOrderDirection: "desc",
  searchFields: ["name", "description"],
  joinFields: [],
  includeSoftDeleted: true,
  computedFields: (item) => ({
    user_count: (item.user_roles as { id: string }[] | null)?.length ?? 0,
  }),
}

// ============================================
// Columns
// ============================================

const columns: Column<Role>[] = [
  {
    key: "name",
    header: "Role",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (role) => (
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${role.is_system_role ? "bg-info/10" : "bg-purple-100"}`}>
          {role.is_system_role ? (
            <Lock className="h-4 w-4 text-info" />
          ) : (
            <Shield className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {role.name}
            {role.is_system_role && (
              <TableBadge variant="default">System</TableBadge>
            )}
          </div>
          {role.description && (
            <div className="text-xs text-muted-foreground truncate">{role.description}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "permissions_count",
    header: "Permissions",
    width: "secondary",
    sortable: false,
    canHide: true,
    defaultVisible: true,
    render: (role) => (
      <span className="text-sm tabular-nums">
        {(role.permissions as string[] | null)?.length ?? 0}
      </span>
    ),
  },
  countColumn("user_count", "Staff Assigned", {
    icon: Users,
    canHide: true,
    defaultVisible: true,
  }),
  booleanColumn("is_system_role", "Type", {
    trueLabel: "System",
    falseLabel: "Custom",
    defaultVisible: true,
  }),
  dateColumn("created_at", "Created", { defaultVisible: false }),
]

// ============================================
// Filters
// ============================================

const filters: FilterConfig[] = [
  createDateRangeFilter("created_at", "Created"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "is_system_role", label: "Type (System / Custom)" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Role Name"),
  textFilterColumn("description", "Description"),
  booleanFilterColumn("is_system_role", "Type", { trueLabel: "System", falseLabel: "Custom" }),
  dateFilterColumn("created_at", "Created"),
]

// ============================================
// Metrics
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Roles", icon: Shield }),
  createBooleanMetric("is_system_role", true, "System Roles", Lock),
  createBooleanMetric("is_system_role", false, "Custom Roles", Check),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Role Name", format: (v) => String(v ?? "") },
  { key: "description", header: "Description", format: (v) => String(v ?? "") },
  { key: "is_system_role", header: "System Role", format: (v) => (v ? "Yes" : "No") },
  {
    key: "permissions",
    header: "Permission Count",
    format: (v) => String((v as string[] | null)?.length ?? 0),
  },
  dateExportColumn("created_at", "Created On"),
]

// ============================================
// Page Component
// ============================================

export default function RolesPage() {
  return (
    <ListPageTemplate
      tableKey="roles"
      title="Roles & Permissions"
      description="Manage access levels for your staff"
      icon={Shield}
      permission="staff.view"
      module="staff"
      feature="staffRoles"
      config={ROLES_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by role name or description..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={false}
      exportColumns={exportColumns}
      exportFilename="roles"
      createHref="/staff/roles/new"
      createLabel="Create Role"
      createPermission="staff.create"
      detailHref={(role) => `/staff/roles/${(role as Role).id}`}
      emptyTitle="No roles found"
      emptyDescription="Create custom roles to define specific permissions for your staff"
    />
  )
}
