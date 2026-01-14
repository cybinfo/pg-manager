/**
 * Visitors List Page (Refactored)
 *
 * Supports multiple visitor types:
 * - tenant_visitor: Visiting existing tenant
 * - enquiry: Prospective tenant viewing the PG
 * - service_provider: Plumbers, electricians, etc.
 * - general: Any other visitor
 */

"use client"

import { Users, UserCheck, Clock, CalendarDays, Search, Wrench, User } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { VISITOR_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatDate } from "@/lib/format"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPE_COLORS,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_COLORS,
  EnquiryStatus,
} from "@/types/visitors.types"

// ============================================
// Types
// ============================================

interface Visitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  visitor_type: VisitorType
  purpose: string | null
  check_in_date: string
  check_out_date: string | null
  status: string
  // Type-specific fields
  company_name: string | null
  service_type: string | null
  enquiry_status: EnquiryStatus | null
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
// Visitor Type Badge
// ============================================

const VISITOR_TYPE_BADGE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-blue-100 text-blue-700",
  enquiry: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  general: "bg-slate-100 text-slate-700",
}

const VISITOR_TYPE_ICONS: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <Users className="h-3 w-3" />,
  enquiry: <Search className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  general: <User className="h-3 w-3" />,
}

const VisitorTypeBadge = ({ type }: { type: VisitorType }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${VISITOR_TYPE_BADGE_COLORS[type]}`}>
    {VISITOR_TYPE_ICONS[type]}
    {VISITOR_TYPE_LABELS[type]}
  </span>
)

const EnquiryStatusBadge = ({ status }: { status: EnquiryStatus }) => {
  const colorMap: Record<EnquiryStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    follow_up: "bg-blue-100 text-blue-700",
    converted: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-700",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status]}`}>
      {ENQUIRY_STATUS_LABELS[status]}
    </span>
  )
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
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${VISITOR_TYPE_BADGE_COLORS[visitor.visitor_type]}`}>
          {VISITOR_TYPE_ICONS[visitor.visitor_type]}
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
    key: "visitor_type",
    header: "Type",
    width: "badge",
    sortable: true,
    render: (visitor) => (
      <div className="space-y-1">
        <VisitorTypeBadge type={visitor.visitor_type} />
        {visitor.visitor_type === "enquiry" && visitor.enquiry_status && (
          <div><EnquiryStatusBadge status={visitor.enquiry_status} /></div>
        )}
      </div>
    ),
  },
  {
    key: "tenant",
    header: "Details",
    width: "secondary",
    sortable: true,
    sortKey: "tenant.name",
    render: (visitor) => (
      <div className="text-sm">
        {visitor.visitor_type === "tenant_visitor" && visitor.tenant && (
          <div><TenantLink id={visitor.tenant.id} name={visitor.tenant.name} size="sm" /></div>
        )}
        {visitor.visitor_type === "service_provider" && visitor.service_type && (
          <div className="text-muted-foreground">
            <span className="font-medium">{visitor.service_type}</span>
            {visitor.company_name && <span> - {visitor.company_name}</span>}
          </div>
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
    id: "visitor_type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "tenant_visitor", label: "Tenant Visitor" },
      { value: "enquiry", label: "Enquiry" },
      { value: "service_provider", label: "Service Provider" },
      { value: "general", label: "General" },
    ],
  },
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
  { value: "visitor_type", label: "Visitor Type" },
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "status", label: "Status" },
  { value: "service_type", label: "Service Type" },
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
    id: "enquiries",
    label: "Enquiries",
    icon: Search,
    compute: (items) => items.filter((v) => v.visitor_type === "enquiry").length,
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
]

// ============================================
// Page Component
// ============================================

export default function VisitorsPage() {
  return (
    <ListPageTemplate
      title="Visitors"
      description="Manage all visitor entries - tenants, enquiries, service providers"
      icon={Users}
      permission="visitors.view"
      feature="visitors"
      config={VISITOR_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by visitor name, phone, company..."
      createHref="/visitors/new"
      createLabel="Check In Visitor"
      createPermission="visitors.create"
      detailHref={(visitor) => `/visitors/${visitor.id}`}
      emptyTitle="No visitors logged"
      emptyDescription="Start logging visitor entries"
    />
  )
}
