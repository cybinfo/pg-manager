/**
 * Activity Log Page (Refactored)
 *
 * BEFORE: ~325 lines with manual data fetching, DataTable, MetricsBar, ListPageFilters
 * AFTER: ~160 lines using ListPageTemplate
 *
 * Uses the centralized ListPageTemplate pattern:
 * - AUDIT_EVENT_LIST_CONFIG for data fetching
 * - MetricConfig with compute functions
 * - FilterConfig for action types, entity types
 * - Preserves specialized audit event formatting (action icons, user display)
 */

"use client"

import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { AUDIT_EVENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createDateRangeFilter } from "@/lib/filter-presets"
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  Eye,
  User,
  Building2,
  Users,
  Receipt,
  CreditCard,
  Clock,
} from "lucide-react"
import { formatTimeAgo, formatDateTime } from "@/lib/format"
import { getEntityName } from "@/lib/entity-names"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { dateTimeExportColumn } from "@/lib/export-columns"
import { useFeatures } from "@/lib/features/use-features"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"

// ============================================
// Types
// ============================================

interface AuditEvent {
  id: string
  occurred_at: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  workspace_id: string
  event_date?: string
  event_month?: string
}

// ============================================
// Action / Entity Configuration
// ============================================

const ACTION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Plus }> = {
  create: { label: "Created", variant: "default", icon: Plus },
  update: { label: "Updated", variant: "secondary", icon: Edit },
  delete: { label: "Deleted", variant: "destructive", icon: Trash2 },
  view: { label: "Viewed", variant: "outline", icon: Eye },
}

const ACTIVITY_ACTION_OPTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
]

const ENTITY_ICONS: Record<string, typeof User> = {
  tenant: User,
  tenants: User,
  property: Building2,
  properties: Building2,
  room: Building2,
  rooms: Building2,
  bill: Receipt,
  bills: Receipt,
  payment: CreditCard,
  payments: CreditCard,
  staff: Users,
  staff_members: Users,
  role: Users,
  roles: Users,
}

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createCountMetric("today", "Today", Clock,
    (item) => {
      const today = new Date()
      const eventDate = new Date(item.occurred_at as string)
      return eventDate.toDateString() === today.toDateString()
    }
  ),
  createCountMetric("created", "Created", Plus,
    (item) => item.action === "create"
  ),
  createCountMetric("updated", "Updated", Edit,
    (item) => item.action === "update"
  ),
  createCountMetric("deleted", "Deleted", Trash2,
    (item) => item.action === "delete"
  ),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "action",
    label: "Action",
    type: "select",
    placeholder: "All Actions",
    options: ACTIVITY_ACTION_OPTIONS,
  },
  {
    id: "entity_type",
    label: "Entity Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "tenant", label: getEntityName("tenant", true) },
      { value: "property", label: getEntityName("property", true) },
      { value: "room", label: getEntityName("room", true) },
      { value: "bill", label: getEntityName("bill", true) },
      { value: "payment", label: getEntityName("payment", true) },
      { value: "staff", label: getEntityName("staff", true) },
    ],
  },
  createDateRangeFilter("occurred_at", "Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "action", label: "Action" },
  { value: "entity_type", label: "Entity Type" },
  { value: "actor_name", label: "User" },
  { value: "event_date", label: "Date" },
  { value: "event_month", label: "Month" },
]

// ============================================
// Column Definitions
// ============================================

const columns: Column<AuditEvent>[] = [
  {
    key: "occurred_at",
    header: "When",
    width: "tertiary",
    sortable: true,
    render: (event) => (
      <div className="text-sm">
        <div className="font-medium">
          {formatTimeAgo(event.occurred_at)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDateTime(event.occurred_at)}
        </div>
      </div>
    ),
  },
  {
    key: "action",
    header: "Action",
    width: "badge",
    render: (event) => {
      const config = ACTION_CONFIG[event.action] || { label: event.action, variant: "outline" as const, icon: Activity }
      return (
        <TableBadge variant={
          config.variant === "default" ? "success" :
          config.variant === "destructive" ? "error" :
          config.variant === "secondary" ? "warning" : "default"
        }>
          {config.label}
        </TableBadge>
      )
    },
  },
  {
    key: "entity_type",
    header: "What",
    width: "primary",
    render: (event) => {
      const entityKey = event.entity_type.toLowerCase()
      const Icon = ENTITY_ICONS[entityKey] || Activity
      const label = getEntityName(entityKey)
      return (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {event.entity_id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "actor_name",
    header: "Who",
    width: "secondary",
    hideOnMobile: true,
    render: (event) => (
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-full ${brandGradient.solid} flex items-center justify-center text-white text-xs font-medium`}>
          {(event.actor_name || event.actor_email || "S")[0].toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium">
            {event.actor_name || "System"}
          </div>
          {event.actor_email && (
            <div className="text-xs text-muted-foreground">
              {event.actor_email}
            </div>
          )}
        </div>
      </div>
    ),
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "actor_name", header: "User", format: (v) => String(v ?? "System") },
  { key: "actor_email", header: "Email", format: (v) => String(v ?? "") },
  { key: "action", header: "Action", format: (v) => ACTION_CONFIG[String(v)]?.label || String(v ?? "") },
  { key: "entity_type", header: "Entity Type", format: (v) => getEntityName(String(v ?? "").toLowerCase()) },
  { key: "entity_id", header: "Entity ID", format: (v) => String(v ?? "") },
  dateTimeExportColumn("occurred_at", "Occurred At"),
]

// ============================================
// Page Component
// ============================================

export default function ActivityLogPage() {
  const { isFeatureEnabled } = useFeatures()
  const filterByUserEnabled = isFeatureEnabled("activityLog", "filterByUser")

  const advancedFilterColumns: FilterableColumn[] = [
    {
      key: "occurred_at",
      header: "Date",
      filterType: "date",
      filterOperators: ["eq", "gt", "lt", "gte", "lte", "between"],
    },
    ...(filterByUserEnabled ? [
      {
        key: "actor_name",
        header: "Filter by User",
        filterType: "text" as const,
        filterOperators: ["contains", "eq", "neq", "starts"] as ("contains" | "eq" | "neq" | "starts")[],
      },
      {
        key: "actor_email",
        header: "Email",
        filterType: "text" as const,
        filterOperators: ["contains", "eq", "starts"] as ("contains" | "eq" | "starts")[],
      },
    ] : []),
    {
      key: "action",
      header: "Action",
      filterType: "select",
      filterOperators: ["eq", "neq", "in", "not_in"],
      filterOptions: ACTIVITY_ACTION_OPTIONS,
    },
    {
      key: "entity_type",
      header: "Entity Type",
      filterType: "text",
      filterOperators: ["contains", "eq", "neq"],
    },
  ]

  return (
    <ListPageTemplate
      tableKey="activity"
      title="Activity Log"
      description="Track all changes and actions in your workspace"
      icon={Activity}
      module="activityLog"
      config={AUDIT_EVENT_LIST_CONFIG}
      columns={columns}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      searchPlaceholder="Search activity..."
      exportColumns={isFeatureEnabled("activityLog", "exportLog") ? exportColumns : undefined}
      exportFilename="activity-log"
      emptyTitle="No activity yet"
      emptyDescription="Activity will appear here as changes are made"
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableColumnManager={true}
    />
  )
}
