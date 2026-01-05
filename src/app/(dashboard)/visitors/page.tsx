/**
 * Visitors List Page (Refactored)
 *
 * BEFORE: ~400 lines of code
 * AFTER: ~130 lines of code (67% reduction)
 */

"use client"

import { Users, UserCheck, Clock, CalendarDays } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { VISITOR_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface Visitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  purpose: string | null
  check_in_date: string
  check_out_date: string | null
  status: string
  tenant: { id: string; name: string } | null
  property: { id: string; name: string } | null
  created_at: string
}

// ============================================
// Status Helper
// ============================================

const getStatusInfo = (status: string): { status: "success" | "warning" | "muted"; label: string } => {
  switch (status) {
    case "checked_in":
      return { status: "success", label: "Inside" }
    case "checked_out":
      return { status: "muted", label: "Left" }
    default:
      return { status: "warning", label: status }
  }
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Visitor>[] = [
  {
    key: "visitor_name",
    header: "Visitor",
    width: "primary",
    sortable: true,
    render: (visitor) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <Users className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{visitor.visitor_name}</div>
          {visitor.visitor_phone && (
            <div className="text-xs text-muted-foreground">{visitor.visitor_phone}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "tenant",
    header: "Visiting",
    width: "secondary",
    sortable: true,
    sortKey: "tenant.name",
    render: (visitor) => (
      <div className="text-sm">
        {visitor.tenant && (
          <div><TenantLink id={visitor.tenant.id} name={visitor.tenant.name} size="sm" /></div>
        )}
        {visitor.property && (
          <div><PropertyLink id={visitor.property.id} name={visitor.property.name} size="sm" /></div>
        )}
      </div>
    ),
  },
  {
    key: "purpose",
    header: "Purpose",
    width: "tertiary",
    hideOnMobile: true,
    render: (visitor) => (
      <span className="text-sm text-muted-foreground truncate">
        {visitor.purpose || "—"}
      </span>
    ),
  },
  {
    key: "check_in_date",
    header: "Check In",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (visitor) => formatDate(visitor.check_in_date),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (visitor) => {
      const info = getStatusInfo(visitor.status)
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
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "checked_in", label: "Inside" },
      { value: "checked_out", label: "Left" },
    ],
  },
  {
    id: "check_in_date",
    label: "Check In Date",
    type: "date-range",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "status", label: "Status" },
  { value: "purpose", label: "Purpose" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Visitor>[] = [
  {
    id: "total",
    label: "Total Visitors",
    icon: Users,
    compute: (items) => items.length,
  },
  {
    id: "inside",
    label: "Currently Inside",
    icon: UserCheck,
    compute: (items) => items.filter((v) => v.status === "checked_in").length,
    highlight: (value) => (value as number) > 0,
  },
  {
    id: "today",
    label: "Today",
    icon: CalendarDays,
    compute: (items) => {
      const today = new Date().toDateString()
      return items.filter((v) => new Date(v.check_in_date).toDateString() === today).length
    },
  },
  {
    id: "left",
    label: "Checked Out",
    icon: Clock,
    compute: (items) => items.filter((v) => v.status === "checked_out").length,
  },
]

// ============================================
// Page Component
// ============================================

export default function VisitorsPage() {
  return (
    <ListPageTemplate
      title="Visitors"
      description="Track visitor entries and exits"
      icon={Users}
      permission="visitors.view"
      feature="visitors"
      config={VISITOR_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by visitor name, tenant..."
      createHref="/visitors/new"
      createLabel="Log Visitor"
      createPermission="visitors.create"
      detailHref={(visitor) => `/visitors/${visitor.id}`}
      emptyTitle="No visitors logged"
      emptyDescription="Start logging visitor entries"
    />
  )
}
