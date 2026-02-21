/**
 * Complaints List Page (Refactored)
 *
 * BEFORE: 476 lines of code
 * AFTER: ~160 lines of code (66% reduction)
 */

"use client"

import { MessageSquare, AlertCircle, Clock, CheckCircle, Wrench } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { statusColumn, badgeColumn } from "@/lib/column-builders"
import { formatTimeAgo } from "@/lib/format"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { COMPLAINT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, PRIORITY_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { COMPLAINT_STATUS, COMPLAINT_PRIORITY, COMPLAINT_CATEGORIES, getStatusInfo as getComplaintStatusInfo } from "@/lib/status-config"

// ============================================
// Types
// ============================================

interface Complaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  created_at: string
  resolved_at: string | null
  tenant: { id: string; name: string } | null
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  created_month?: string
  created_year?: string
}

// Uses COMPLAINT_STATUS, COMPLAINT_PRIORITY, and COMPLAINT_CATEGORIES from status-config

// ============================================
// Column Definitions
// ============================================

const columns: Column<Complaint>[] = [
  {
    key: "title",
    header: "Complaint",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (row) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TableBadge variant={COMPLAINT_PRIORITY[row.priority]?.variant || "default"}>
            {COMPLAINT_PRIORITY[row.priority]?.label || row.priority}
          </TableBadge>
          <span className="text-xs text-muted-foreground">
            {COMPLAINT_CATEGORIES[row.category] || row.category}
          </span>
        </div>
        <div className="font-medium truncate">{row.title}</div>
      </div>
    ),
  },
  {
    key: "tenant",
    header: "Tenant",
    width: "secondary",
    sortable: true,
    sortKey: "tenant.name",
    canHide: true,
    defaultVisible: true,
    render: (row) => (
      <div className="text-sm">
        {row.tenant && (
          <div><TenantLink id={row.tenant.id} name={row.tenant.name} size="sm" /></div>
        )}
        {row.property && (
          <div><PropertyLink id={row.property.id} name={row.property.name} size="sm" /></div>
        )}
      </div>
    ),
  },
  statusColumn((status) => getComplaintStatusInfo("complaint", status), {
    editable: true,
    editType: "select",
    editOptions: [
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
      { value: "closed", label: "Closed" },
    ],
  }),
  {
    key: "created_at",
    header: "Created",
    width: "date",
    hideOnMobile: true,
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: true,
    render: (row) => (
      <span className="text-sm text-muted-foreground">{formatTimeAgo(row.created_at)}</span>
    ),
  },
  // Hidden by default columns
  {
    key: "description",
    header: "Description",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (row) => row.description ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{row.description}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  badgeColumn("priority", "Priority", COMPLAINT_PRIORITY, {
    defaultVisible: false,
    editable: true,
    editType: "select",
    editOptions: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "urgent", label: "Urgent" },
    ],
  }),
  {
    key: "category",
    header: "Category",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (row) => (
      <span className="text-sm">{COMPLAINT_CATEGORIES[row.category] || row.category}</span>
    ),
  },
  {
    key: "room",
    header: "Room",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (row) => row.room ? (
      <RoomLink id={row.room.id} roomNumber={row.room.room_number} size="sm" />
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "assigned_to",
    header: "Assigned To",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (row) => row.assigned_to || <span className="text-muted-foreground">Unassigned</span>,
  },
  {
    key: "resolved_at",
    header: "Resolved On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (row) => row.resolved_at ? formatTimeAgo(row.resolved_at) : <span className="text-muted-foreground">—</span>,
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "open", label: "Open" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ]),
  PRIORITY_FILTER,
  {
    id: "category",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
    options: Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => ({ value, label })),
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "room.room_number", label: "Room" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "category", label: "Category" },
  { value: "assigned_to", label: "Assigned To" },
  { value: "created_month", label: "Month" },
  { value: "created_year", label: "Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "title",
    header: "Title",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "open", label: "Open" },
      { value: "acknowledged", label: "Acknowledged" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    key: "priority",
    header: "Priority",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "urgent", label: "Urgent" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
  {
    key: "category",
    header: "Category",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => ({ value, label })),
  },
  {
    key: "created_at",
    header: "Created Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createStatusMetric("open", "Open", AlertCircle, { highlight: true }),
  createStatusMetric(["in_progress", "acknowledged"], "In Progress", Wrench, { id: "in_progress" }),
  createStatusMetric(["resolved", "closed"], "Resolved", CheckCircle, { id: "resolved" }),
  createCountMetric("urgent", "Urgent", Clock,
    (item) => item.priority === "urgent" && item.status !== "resolved" && item.status !== "closed",
    { highlight: true }
  ),
]

// ============================================
// Page Component
// ============================================

export default function ComplaintsPage() {
  return (
    <ListPageTemplate
      tableKey="complaints"
      title="Complaints"
      description="Manage tenant complaints and issues"
      icon={MessageSquare}
      permission="complaints.view"
      feature="complaints"
      config={COMPLAINT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by title, tenant, or property..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/complaints/new"
      createLabel="New Complaint"
      createPermission="complaints.create"
      detailHref={(complaint) => `/complaints/${complaint.id}`}
      emptyTitle="No complaints found"
      emptyDescription="No complaints have been reported yet"
    />
  )
}
