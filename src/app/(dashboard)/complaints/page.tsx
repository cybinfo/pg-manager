/**
 * Complaints List Page (Refactored)
 *
 * BEFORE: 476 lines of code
 * AFTER: ~160 lines of code (66% reduction)
 */

"use client"

import { MessageSquare, AlertCircle, Clock, CheckCircle, Wrench } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { COMPLAINT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink, RoomLink } from "@/components/ui/entity-link"

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

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "error" | "muted" }> = {
  open: { label: "Open", variant: "error" },
  acknowledged: { label: "Acknowledged", variant: "warning" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
}

const priorityConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "muted" }> = {
  low: { label: "Low", variant: "muted" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "error" },
}

const categoryLabels: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture",
  cleanliness: "Cleanliness",
  appliances: "Appliances",
  security: "Security",
  noise: "Noise",
  other: "Other",
}

// ============================================
// Helper Functions
// ============================================

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return "Just now"
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Complaint>[] = [
  {
    key: "title",
    header: "Complaint",
    width: "primary",
    sortable: true,
    render: (row) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TableBadge variant={priorityConfig[row.priority]?.variant || "default"}>
            {priorityConfig[row.priority]?.label || row.priority}
          </TableBadge>
          <span className="text-xs text-muted-foreground">
            {categoryLabels[row.category] || row.category}
          </span>
        </div>
        <div className="font-medium truncate">{row.title}</div>
        {row.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.description}</p>
        )}
      </div>
    ),
  },
  {
    key: "tenant",
    header: "Tenant",
    width: "secondary",
    sortable: true,
    sortKey: "tenant.name",
    render: (row) => (
      <div className="text-sm">
        {row.tenant && (
          <div><TenantLink id={row.tenant.id} name={row.tenant.name} size="sm" /></div>
        )}
        {row.property && (
          <div><PropertyLink id={row.property.id} name={row.property.name} size="sm" /></div>
        )}
        {row.room && (
          <div><RoomLink id={row.room.id} roomNumber={row.room.room_number} size="sm" /></div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (row) => (
      <StatusDot
        status={statusConfig[row.status]?.variant || "muted"}
        label={statusConfig[row.status]?.label || row.status}
      />
    ),
  },
  {
    key: "created_at",
    header: "Created",
    width: "date",
    hideOnMobile: true,
    sortable: true,
    sortType: "date",
    render: (row) => (
      <span className="text-sm text-muted-foreground">{getTimeAgo(row.created_at)}</span>
    ),
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
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "open", label: "Open" },
      { value: "acknowledged", label: "Acknowledged" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    placeholder: "All Priority",
    options: [
      { value: "urgent", label: "Urgent" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
  {
    id: "category",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
    options: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Complaint>[] = [
  {
    id: "open",
    label: "Open",
    icon: AlertCircle,
    compute: (items) => items.filter((c) => c.status === "open").length,
    highlight: (value) => (value as number) > 0,
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: Wrench,
    compute: (items) =>
      items.filter((c) => c.status === "in_progress" || c.status === "acknowledged").length,
  },
  {
    id: "resolved",
    label: "Resolved",
    icon: CheckCircle,
    compute: (items) =>
      items.filter((c) => c.status === "resolved" || c.status === "closed").length,
  },
  {
    id: "urgent",
    label: "Urgent",
    icon: Clock,
    compute: (items) =>
      items.filter(
        (c) => c.priority === "urgent" && c.status !== "resolved" && c.status !== "closed"
      ).length,
    highlight: (value) => (value as number) > 0,
  },
]

// ============================================
// Page Component
// ============================================

export default function ComplaintsPage() {
  return (
    <ListPageTemplate
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
      createHref="/complaints/new"
      createLabel="New Complaint"
      createPermission="complaints.create"
      detailHref={(complaint) => `/complaints/${complaint.id}`}
      emptyTitle="No complaints found"
      emptyDescription="No complaints have been reported yet"
    />
  )
}
