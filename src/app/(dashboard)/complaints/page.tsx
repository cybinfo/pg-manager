/**
 * Complaints List Page (Refactored)
 *
 * BEFORE: 476 lines of code
 * AFTER: ~160 lines of code (66% reduction)
 */

"use client"

import { MessageSquare, AlertCircle, Clock, CheckCircle, Wrench } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { statusColumn, badgeColumn, timeAgoColumn } from "@/lib/columns"
import { formatTimeAgo } from "@/lib/format"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { COMPLAINT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, PRIORITY_FILTER, COMPLAINT_STATUS_FILTER, COMPLAINT_CATEGORY_FILTER } from "@/lib/filter-presets"
import { COMPLAINT_STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { COMPLAINT_PRIORITY, COMPLAINT_CATEGORIES, getStatusInfo as getComplaintStatusInfo } from "@/lib/status-config"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import { NullDisplay } from "@/components/ui/null-display"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn, nestedColumn } from "@/lib/export-columns"

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
    editOptions: COMPLAINT_STATUS_OPTIONS,
  }),
  timeAgoColumn("created_at", "Created", {
    width: "date",
    hideOnMobile: true,
  }),
  // Hidden by default columns
  {
    key: "description",
    header: "Description",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (row) => row.description ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{row.description}</span>
    ) : <NullDisplay />,
  },
  badgeColumn("priority", "Priority", COMPLAINT_PRIORITY, {
    defaultVisible: false,
    editable: true,
    editType: "select",
    editOptions: PRIORITY_OPTIONS,
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
    ) : <NullDisplay />,
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
    render: (row) => row.resolved_at ? formatTimeAgo(row.resolved_at) : <NullDisplay />,
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  COMPLAINT_STATUS_FILTER,
  PRIORITY_FILTER,
  COMPLAINT_CATEGORY_FILTER,
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
  textFilterColumn("title", "Title"),
  statusFilterColumn(COMPLAINT_STATUS_OPTIONS),
  selectFilterColumn("priority", "Priority", PRIORITY_OPTIONS, ["eq", "neq", "in", "not_in"]),
  selectFilterColumn("category", "Category", COMPLAINT_CATEGORY_FILTER.options!),
  dateFilterColumn("created_at", "Created Date"),
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
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "title", header: "Title" },
  { key: "category", header: "Category", format: (v) => COMPLAINT_CATEGORIES[String(v)] || String(v ?? "") },
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  { key: "priority", header: "Priority", format: (v) => COMPLAINT_PRIORITY[String(v)]?.label || String(v ?? "") },
  nestedColumn("tenant_name", "Tenant", "tenant.name"),
  nestedColumn("property_name", "Property", "property.name"),
  nestedColumn("room_number", "Room", "room.room_number"),
  dateExportColumn("created_at", "Created On"),
  dateExportColumn("resolved_at", "Resolved On"),
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
      module="complaints"
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
      exportColumns={exportColumns}
      exportFilename="complaints"
      createHref="/complaints/new"
      createLabel="New Complaint"
      createPermission="complaints.create"
      detailHref={(complaint) => `/complaints/${complaint.id}`}
      emptyTitle="No complaints found"
      emptyDescription="No complaints have been reported yet"
    />
  )
}
