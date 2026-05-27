/**
 * Notices List Page (Refactored)
 *
 * BEFORE: ~540 lines of code
 * AFTER: ~140 lines of code (74% reduction)
 */

"use client"

import {
  Bell,
  Eye,
  AlertTriangle,
  Clock,
  Megaphone,
  Building2,
  Users,
  CalendarClock,
} from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { timeAgoColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { NOTICE_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createCountMetric, createExpiringMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, ACTIVE_STATUS_FILTER, NOTICE_TYPE_FILTER } from "@/lib/filter-presets"
import { NOTICE_TYPE_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatTimeAgo } from "@/lib/format"
import { NOTICE_TYPE_DISPLAY_CONFIG, NOTICE_AUDIENCES } from "@/lib/status"
import { textFilterColumn, selectFilterColumn, booleanFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn, labelMapColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Notice {
  id: string
  title: string
  content: string
  type: string
  target_audience: string
  target_rooms: string[] | null
  is_active: boolean
  is_published?: boolean
  scheduled_at?: string | null
  expires_at: string | null
  created_at: string
  property: { id: string; name: string } | null
  // Computed fields
  is_expired?: boolean
  type_label?: string
  active_label?: string
}

// ============================================
// Type Configuration
// ============================================

const audienceLabels = NOTICE_AUDIENCES

// ============================================
// Column Definitions
// ============================================

const columns: Column<Notice>[] = [
  {
    key: "title",
    header: "Notice",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    render: (notice) => {
      const TypeIcon = (NOTICE_TYPE_DISPLAY_CONFIG[notice.type] || NOTICE_TYPE_DISPLAY_CONFIG.general).icon
      const isActive = notice.is_active && !notice.is_expired
      return (
        <div className={`flex items-start gap-3 ${!isActive ? "opacity-60" : ""}`}>
          <div className={`p-2 rounded-lg shrink-0 ${NOTICE_TYPE_DISPLAY_CONFIG[notice.type]?.bgColor || "bg-muted"}`}>
            <TypeIcon className={`h-4 w-4 ${NOTICE_TYPE_DISPLAY_CONFIG[notice.type]?.color || "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <TableBadge variant={notice.type === "emergency" ? "error" : "default"}>
                {NOTICE_TYPE_DISPLAY_CONFIG[notice.type]?.label || notice.type}
              </TableBadge>
              {!isActive && (
                <TableBadge variant="muted">
                  {notice.is_expired ? "Expired" : "Inactive"}
                </TableBadge>
              )}
            </div>
            <div className="font-medium truncate">{notice.title}</div>
          </div>
        </div>
      )
    },
  },
  {
    key: "property",
    header: "Property",
    width: "tertiary",
    hideOnMobile: true,
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    render: (notice) => notice.property ? (
      <PropertyLink id={notice.property.id} name={notice.property.name} size="sm" />
    ) : (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Building2 className="h-3 w-3" />
        All
      </div>
    ),
  },
  {
    key: "target_audience",
    header: "Audience",
    width: "tertiary",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (notice) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-3 w-3" />
        {audienceLabels[notice.target_audience] || notice.target_audience}
      </div>
    ),
  },
  timeAgoColumn("created_at", "Posted", {
    width: "date",
    hideOnMobile: true,
  }),
  // Hidden by default columns
  {
    key: "content",
    header: "Content",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (notice) => (
      <p className="text-sm text-muted-foreground line-clamp-2">{notice.content}</p>
    ),
  },
  {
    key: "type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (notice) => (
      <TableBadge variant={notice.type === "emergency" ? "error" : "default"}>
        {NOTICE_TYPE_DISPLAY_CONFIG[notice.type]?.label || notice.type}
      </TableBadge>
    ),
  },
  {
    key: "is_active",
    header: "Active",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "boolean",
    render: (notice) => (
      <TableBadge variant={notice.is_active ? "success" : "muted"}>
        {notice.is_active ? "Active" : "Inactive"}
      </TableBadge>
    ),
  },
  {
    key: "expires_at",
    header: "Expires",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (notice) => notice.expires_at ? formatTimeAgo(notice.expires_at) : <span className="text-muted-foreground">Never</span>,
  },
  {
    key: "scheduled_at",
    header: "Scheduled",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (notice) => {
      if (notice.is_published !== false) return <span className="text-muted-foreground">—</span>
      return notice.scheduled_at ? (
        <div className="flex items-center gap-1 text-warning text-sm">
          <CalendarClock className="h-3 w-3" />
          {formatTimeAgo(notice.scheduled_at)}
        </div>
      ) : <span className="text-muted-foreground">—</span>
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  NOTICE_TYPE_FILTER,
  ACTIVE_STATUS_FILTER,
  {
    id: "is_published",
    label: "Publication",
    type: "select" as const,
    options: [
      { value: "all", label: "All Notices" },
      { value: "true", label: "Published" },
      { value: "false", label: "Scheduled (Pending)" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "type_label", label: "Type" },
  { value: "target_audience", label: "Audience" },
  { value: "active_label", label: "Status" },
  { value: "created_month", label: "Month" },
  { value: "created_year", label: "Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("title", "Title"),
  selectFilterColumn("type", "Type", NOTICE_TYPE_OPTIONS),
  booleanFilterColumn("is_active", "Status", { trueLabel: "Active", falseLabel: "Inactive" }),
  booleanFilterColumn("is_published", "Published", { trueLabel: "Published", falseLabel: "Scheduled (Pending)" }),
  selectFilterColumn("target_audience", "Audience", [
    { value: "all", label: "All Residents" },
    { value: "tenants_only", label: "Tenants Only" },
    { value: "specific_rooms", label: "Specific Rooms" },
  ], ["eq", "neq"]),
  dateFilterColumn("created_at", "Created Date"),
  dateFilterColumn("scheduled_at", "Scheduled At"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Notices", icon: Bell }),
  createCountMetric("active", "Active", Eye,
    (item) => Boolean(item.is_active) && !item.is_expired
  ),
  createCountMetric("emergency", "Emergency", AlertTriangle,
    (item) => item.type === "emergency" && Boolean(item.is_active),
    { highlight: true }
  ),
  createExpiringMetric("expires_at", 3, "Expiring Soon", Clock, { activeField: "is_active" }),
]

// ============================================
// Export Columns
// ============================================

const NOTICE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(NOTICE_TYPE_DISPLAY_CONFIG).map(([k, v]) => [k, v.label])
)

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "title", header: "Title" },
  labelMapColumn("type", "Type", NOTICE_TYPE_LABELS),
  labelMapColumn("target_audience", "Audience", audienceLabels),
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  { key: "is_published", header: "Published", format: (v) => (v === false ? "No (Scheduled)" : "Yes") },
  dateExportColumn("scheduled_at", "Scheduled At"),
  dateExportColumn("expires_at", "Expires At"),
  dateExportColumn("created_at", "Posted On"),
]

// ============================================
// Page Component
// ============================================

export default function NoticesPage() {
  return (
    <ListPageTemplate
      tableKey="notices"
      title="Notices"
      description="Announcements and notifications for tenants"
      icon={Bell}
      permission="notices.view"
      module="notices"
      config={NOTICE_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search notices..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="notices"
      createHref="/notices/new"
      createLabel="New Notice"
      createPermission="notices.create"
      detailHref={(notice) => `/notices/${notice.id}`}
      emptyTitle="No notices found"
      emptyDescription="Create your first notice to communicate with tenants"
    />
  )
}
