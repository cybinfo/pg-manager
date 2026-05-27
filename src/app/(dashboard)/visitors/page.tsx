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

import Link from "next/link"
import { Users, UserCheck, CalendarDays, Search, Wrench, User, Star, Ban, BookUser } from "lucide-react"
import { FeatureGuard } from "@/components/auth"
import { Column } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/columns"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { VISITOR_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createNullCheckMetric, createCountMetric, createTodayCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, VISITOR_TYPE_FILTER, createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPE_BADGE_COLORS,
  ENQUIRY_STATUS_LABELS,
  EnquiryStatus,
} from "@/types/visitors.types"
import { getStatusInfo as getVisitorStatusInfo } from "@/lib/status-config"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, labelMapColumn } from "@/lib/export-columns"

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
  visitor_contact: {
    id: string
    name: string
    visit_count: number
    is_frequent: boolean
    is_blocked: boolean
    person_id: string | null
    person: { id: string; name: string; photo_url: string | null } | null
  } | null
  // Computed fields from config
  total_visits: number
  is_frequent_visitor: boolean
  is_blocked_visitor: boolean
  created_at: string
}

// Status helper uses centralized VISITOR_STATUS from status-config

// ============================================
// Visitor Type Badge
// ============================================

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
    pending: "bg-warning/10 text-warning",
    follow_up: "bg-info/10 text-info",
    converted: "bg-success/10 text-success",
    lost: "bg-destructive/10 text-destructive",
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
    canHide: false,
    render: (visitor) => {
      const photoUrl = visitor.visitor_contact?.person?.photo_url
      // Use person.name (live data) with fallback to visitor_contact.name then visitor_name
      const displayName = visitor.visitor_contact?.person?.name || visitor.visitor_contact?.name || visitor.visitor_name
      return (
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <Avatar
              name={displayName}
              src={photoUrl}
              size="sm"
              className="shrink-0"
            />
          ) : (
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${VISITOR_TYPE_BADGE_COLORS[visitor.visitor_type]}`}>
              {VISITOR_TYPE_ICONS[visitor.visitor_type]}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{displayName}</span>
              {visitor.is_frequent_visitor && (
                <Star className="h-3 w-3 text-warning flex-shrink-0" />
              )}
              {visitor.is_blocked_visitor && (
                <Ban className="h-3 w-3 text-destructive flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {visitor.visitor_phone && <span>{visitor.visitor_phone}</span>}
              {visitor.total_visits > 1 && (
                <span className="text-info">({visitor.total_visits} visits)</span>
              )}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "visitor_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
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
  dateColumn("check_in_date", "Check In"),
  statusColumn((status) => getVisitorStatusInfo("visitor", status)),
  // Hidden by default columns
  {
    key: "purpose",
    header: "Purpose",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (visitor) => (
      <span className="text-sm text-muted-foreground truncate">
        {visitor.purpose || "—"}
      </span>
    ),
  },
  {
    key: "visitor_phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (visitor) => visitor.visitor_phone || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "company_name",
    header: "Company",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (visitor) => visitor.company_name || <span className="text-muted-foreground">—</span>,
  },
  dateColumn("check_out_date", "Check Out", { defaultVisible: false }),
  {
    key: "total_visits",
    header: "Total Visits",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (visitor) => <span className="tabular-nums">{visitor.total_visits}</span>,
  },
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  VISITOR_TYPE_FILTER,
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "checked_in", label: "Inside" },
    { value: "checked_out", label: "Left" },
  ]),
  createDateRangeFilter("check_in_date", "Check In Date"),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "visitor_name",
    header: "Visitor Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts"],
  },
  {
    key: "visitor_type",
    header: "Visitor Type",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "tenant_visitor", label: "Tenant Visitor" },
      { value: "enquiry", label: "Enquiry" },
      { value: "service_provider", label: "Service Provider" },
      { value: "general", label: "General" },
    ],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "checked_in", label: "Inside" },
      { value: "checked_out", label: "Left" },
    ],
  },
  {
    key: "check_in_date",
    header: "Check In Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "purpose",
    header: "Purpose",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
]

// ============================================
// Export Columns
// ============================================

const VISITOR_TYPE_EXPORT_LABELS: Record<string, string> = {
  tenant_visitor: "Tenant Visitor",
  enquiry: "Enquiry",
  service_provider: "Service Provider",
  general: "General",
}

const VISITOR_STATUS_LABELS: Record<string, string> = {
  checked_in: "Inside",
  checked_out: "Left",
}

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "visitor_name", header: "Visitor Name" },
  { key: "visitor_phone", header: "Phone", format: (v) => String(v ?? "") },
  labelMapColumn("visitor_type", "Type", VISITOR_TYPE_EXPORT_LABELS),
  labelMapColumn("status", "Status", VISITOR_STATUS_LABELS),
  nestedColumn("tenant_name", "Tenant", "tenant.name"),
  nestedColumn("property_name", "Property", "property.name"),
  { key: "purpose", header: "Purpose", format: (v) => String(v ?? "") },
  { key: "company_name", header: "Company", format: (v) => String(v ?? "") },
  dateExportColumn("check_in_date", "Check In"),
  dateExportColumn("check_out_date", "Check Out"),
  { key: "total_visits", header: "Total Visits", format: (v) => String(v ?? "0") },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Entries", icon: Users }),
  createNullCheckMetric("check_out_time", true, "Currently Inside", UserCheck, { id: "inside", highlight: true }),
  createCountMetric("frequent", "Frequent Visitors", Star,
    (item) => Boolean(item.is_frequent_visitor)
  ),
  createTodayCountMetric("check_in_date", "Today", CalendarDays),
]

// ============================================
// Page Component
// ============================================

export default function VisitorsPage() {
  return (
    <FeatureGuard module="visitors" feature="visitorLog">
      <ListPageTemplate
        tableKey="visitors"
        title="Visitors"
        description="Manage all visitor entries - tenants, enquiries, service providers"
        icon={Users}
        permission="visitors.view"
        module="visitors"
        config={VISITOR_LIST_CONFIG}
        filters={filters}
        groupByOptions={groupByOptions}
        metrics={metrics}
        columns={columns}
        searchPlaceholder="Search by visitor name, phone, company..."
        enableColumnManager={true}
        enableAdvancedFilters={true}
        advancedFilterColumns={advancedFilterColumns}
        enableInlineEdit={true}
        exportColumns={exportColumns}
        exportFilename="visitors"
        createHref="/visitors/new"
        createLabel="Check In Visitor"
        createPermission="visitors.create"
        detailHref={(visitor) => `/visitors/${visitor.id}`}
        emptyTitle="No visitors logged"
        emptyDescription="Start logging visitor entries"
        headerActions={
          <Link href="/visitors/directory">
            <Button variant="outline" size="sm">
              <BookUser className="mr-2 h-4 w-4" />
              Directory
            </Button>
          </Link>
        }
      />
    </FeatureGuard>
  )
}
