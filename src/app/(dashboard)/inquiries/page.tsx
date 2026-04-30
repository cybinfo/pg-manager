/**
 * Website Inquiries List Page
 *
 * Displays leads/inquiries from public PG websites.
 * Status workflow: new -> contacted -> converted/closed
 */

"use client"

import { Inbox, Clock, UserCheck, Phone } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { INQUIRY_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { INQUIRY_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatDate, formatPhone } from "@/lib/format"
import { INQUIRY_STATUS_COLORS, INQUIRY_SOURCE_COLORS } from "@/lib/status-config"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Inquiry {
  id: string
  name: string
  phone: string
  email: string | null
  message: string | null
  preferred_room_type: string | null
  expected_move_in: string | null
  status: "new" | "contacted" | "converted" | "closed"
  notes: string | null
  source: "website" | "whatsapp" | "phone"
  property: { id: string; name: string } | null
  created_at: string
  updated_at: string
  // Computed
  status_label: string
  source_label: string
}

// ============================================
// Status Badges
// ============================================

const StatusBadge = ({ status, label }: { status: string; label: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INQUIRY_STATUS_COLORS[status] || INQUIRY_STATUS_COLORS.new}`}>
    {label}
  </span>
)

const SourceBadge = ({ source, label }: { source: string; label: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INQUIRY_SOURCE_COLORS[source] || INQUIRY_SOURCE_COLORS.website}`}>
    {label}
  </span>
)

// ============================================
// Column Definitions
// ============================================

const columns: Column<Inquiry>[] = [
  {
    key: "name",
    header: "Contact",
    width: "primary",
    sortable: true,
    render: (inquiry) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary font-medium text-sm">
            {inquiry.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{inquiry.name}</div>
          <div className="text-sm text-muted-foreground truncate">
            {formatPhone(inquiry.phone)}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "property.name",
    header: "Property",
    width: "secondary",
    sortable: true,
    render: (inquiry) =>
      inquiry.property ? (
        <PropertyLink id={inquiry.property.id} name={inquiry.property.name} size="sm" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "preferred_room_type",
    header: "Preference",
    width: "tertiary",
    hideOnMobile: true,
    render: (inquiry) => (
      <div className="text-sm">
        {inquiry.preferred_room_type ? (
          <span className="capitalize">{inquiry.preferred_room_type} room</span>
        ) : (
          <span className="text-muted-foreground">Any</span>
        )}
        {inquiry.expected_move_in && (
          <div className="text-xs text-muted-foreground">
            Move-in: {formatDate(inquiry.expected_move_in)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "source",
    header: "Source",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (inquiry) => <SourceBadge source={inquiry.source} label={inquiry.source_label} />,
  },
  {
    key: "created_at",
    header: "Received",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (inquiry) => formatDate(inquiry.created_at),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    editable: true,
    editType: "select",
    editOptions: INQUIRY_STATUS_OPTIONS,
    render: (inquiry) => <StatusBadge status={inquiry.status} label={inquiry.status_label} />,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (inquiry) => inquiry.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{inquiry.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  createStatusFilter([
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "converted", label: "Converted" },
    { value: "closed", label: "Closed" },
  ]),
  {
    id: "source",
    label: "Source",
    type: "select",
    placeholder: "All Sources",
    options: [
      { value: "website", label: "Website" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "phone", label: "Phone" },
      { value: "walk_in", label: "Walk-in" },
    ],
  },
  PROPERTY_FILTER,
  createDateRangeFilter("created_at", "Received Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "status", label: "Status" },
  { value: "property.name", label: "Property" },
  { value: "source", label: "Source" },
  { value: "preferred_room_type", label: "Room Type" },
  { value: "created_month", label: "Month" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "converted", label: "Converted" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    key: "source",
    header: "Source",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "website", label: "Website" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "phone", label: "Phone" },
      { value: "walk_in", label: "Walk-in" },
    ],
  },
  {
    key: "created_at",
    header: "Received Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  nestedColumn("property_name", "Property", "property.name"),
  { key: "source_label", header: "Source" },
  { key: "status_label", header: "Status" },
  { key: "preferred_room_type", header: "Preferred Room Type", format: (v) => String(v ?? "") },
  dateExportColumn("expected_move_in", "Expected Move-in"),
  { key: "notes", header: "Notes", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Received Date"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Inquiries", icon: Inbox }),
  createStatusMetric("new", "New", Clock, { highlight: true }),
  createStatusMetric("contacted", "Contacted", Phone),
  createStatusMetric("converted", "Converted", UserCheck),
]

// ============================================
// Page Component
// ============================================

export default function InquiriesPage() {
  return (
    <ListPageTemplate
      tableKey="inquiries"
      title="Inquiries"
      description="Manage leads from your PG websites"
      icon={Inbox}
      permission="tenants.view"
      config={INQUIRY_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, email..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      detailHref={(inquiry) => `/inquiries/${inquiry.id}`}
      createHref="/inquiries/new"
      createLabel="Log Inquiry"
      emptyTitle="No inquiries yet"
      emptyDescription="Inquiries from your public PG websites will appear here"
    />
  )
}
