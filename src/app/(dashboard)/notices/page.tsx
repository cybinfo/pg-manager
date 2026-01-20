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
  Wrench,
  CreditCard,
  Building2,
  Users,
  Calendar,
} from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { NOTICE_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatTimeAgo } from "@/lib/format"

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

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Megaphone }> = {
  general: { label: "General", color: "text-blue-700", bgColor: "bg-blue-100", icon: Megaphone },
  maintenance: { label: "Maintenance", color: "text-orange-700", bgColor: "bg-orange-100", icon: Wrench },
  payment_reminder: { label: "Payment Reminder", color: "text-green-700", bgColor: "bg-green-100", icon: CreditCard },
  emergency: { label: "Emergency", color: "text-red-700", bgColor: "bg-red-100", icon: AlertTriangle },
}

const audienceLabels: Record<string, string> = {
  all: "All Residents",
  tenants_only: "Tenants Only",
  specific_rooms: "Specific Rooms",
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Notice>[] = [
  {
    key: "title",
    header: "Notice",
    width: "primary",
    sortable: true,
    render: (notice) => {
      const TypeIcon = typeConfig[notice.type]?.icon || Megaphone
      const isActive = notice.is_active && !notice.is_expired
      return (
        <div className={`flex items-start gap-3 ${!isActive ? "opacity-60" : ""}`}>
          <div className={`p-2 rounded-lg shrink-0 ${typeConfig[notice.type]?.bgColor || "bg-gray-100"}`}>
            <TypeIcon className={`h-4 w-4 ${typeConfig[notice.type]?.color || "text-gray-600"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <TableBadge variant={notice.type === "emergency" ? "error" : "default"}>
                {typeConfig[notice.type]?.label || notice.type}
              </TableBadge>
              {!isActive && (
                <TableBadge variant="muted">
                  {notice.is_expired ? "Expired" : "Inactive"}
                </TableBadge>
              )}
            </div>
            <div className="font-medium truncate">{notice.title}</div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {notice.content}
            </p>
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
    render: (notice) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-3 w-3" />
        {audienceLabels[notice.target_audience] || notice.target_audience}
      </div>
    ),
  },
  {
    key: "created_at",
    header: "Posted",
    width: "date",
    sortable: true,
    sortType: "date",
    hideOnMobile: true,
    render: (notice) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {formatTimeAgo(notice.created_at)}
      </div>
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
    id: "type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "general", label: "General" },
      { value: "maintenance", label: "Maintenance" },
      { value: "payment_reminder", label: "Payment Reminder" },
      { value: "emergency", label: "Emergency" },
    ],
  },
  {
    id: "is_active",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Notice>[] = [
  {
    id: "total",
    label: "Total Notices",
    icon: Bell,
    compute: (items) => items.length,
  },
  {
    id: "active",
    label: "Active",
    icon: Eye,
    compute: (items) => items.filter((n) => n.is_active && !n.is_expired).length,
  },
  {
    id: "emergency",
    label: "Emergency",
    icon: AlertTriangle,
    compute: (items) => items.filter((n) => n.type === "emergency" && n.is_active).length,
    highlight: (value) => (value as number) > 0,
  },
  {
    id: "expiring",
    label: "Expiring Soon",
    icon: Clock,
    compute: (items) => {
      const threeDays = 3 * 24 * 60 * 60 * 1000
      const now = new Date().getTime()
      return items.filter((n) => {
        if (!n.expires_at || !n.is_active) return false
        const expiresAt = new Date(n.expires_at).getTime()
        return expiresAt > now && expiresAt - now < threeDays
      }).length
    },
  },
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
      feature="notices"
      config={NOTICE_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search notices..."
      createHref="/notices/new"
      createLabel="New Notice"
      createPermission="notices.create"
      detailHref={(notice) => `/notices/${notice.id}`}
      emptyTitle="No notices found"
      emptyDescription="Create your first notice to communicate with tenants"
    />
  )
}
