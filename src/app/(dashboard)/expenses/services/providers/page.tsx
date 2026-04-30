/**
 * Service Providers List Page
 *
 * Part of the Enhanced Expense Module - manages service providers
 * like plumbers, electricians, carpenters, etc.
 */

"use client"

import { Wrench, Check, X, Star, FileText } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { SERVICE_PROVIDER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createCountMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER, ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatDate } from "@/lib/format"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface ServiceProviderListItem {
  id: string
  name: string
  category_id: string | null
  phone: string | null
  email: string | null
  pan: string | null
  tds_applicable: boolean
  tds_section: string | null
  rating: number | null
  total_jobs: number
  is_active: boolean
  created_at: string
  category: { id: string; name: string; name_hi: string | null } | null
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<ServiceProviderListItem>[] = [
  {
    key: "name",
    header: "Provider",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true, minLength: 2 },
    render: (provider) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-warning" />
        </div>
        <div>
          <div className="font-medium">{provider.name}</div>
          {provider.phone && (
            <div className="text-xs text-muted-foreground">{provider.phone}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    width: "secondary",
    sortable: true,
    sortKey: "category.name",
    canHide: true,
    defaultVisible: true,
    render: (provider) => (
      <span>{provider.category?.name || "Uncategorized"}</span>
    ),
  },
  {
    key: "rating",
    header: "Rating",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 1, max: 5 },
    render: (provider) =>
      provider.rating ? (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-warning fill-warning" />
          <span className="tabular-nums">{provider.rating.toFixed(1)}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "total_jobs",
    header: "Jobs",
    width: "count",
    hideOnMobile: true,
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (provider) => (
      <span className="tabular-nums">{provider.total_jobs}</span>
    ),
  },
  {
    key: "tds_applicable",
    header: "TDS",
    width: "badge",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (provider) =>
      provider.tds_applicable ? (
        <TableBadge variant="muted">
          <FileText className="h-3 w-3 mr-1" />
          {provider.tds_section || "Yes"}
        </TableBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "boolean",
    render: (provider) =>
      provider.is_active ? (
        <TableBadge variant="success">
          <Check className="h-3 w-3 mr-1" />
          Active
        </TableBadge>
      ) : (
        <TableBadge variant="error">
          <X className="h-3 w-3 mr-1" />
          Inactive
        </TableBadge>
      ),
  },
  // Hidden by default columns
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (provider) => provider.phone || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "email",
    header: "Email",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (provider) => provider.email || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pan",
    header: "PAN",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (provider) => provider.pan ? (
      <span className="font-mono text-sm">{provider.pan}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "tds_section",
    header: "TDS Section",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (provider) => provider.tds_section || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (provider) => formatDate(provider.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  EXPENSE_CATEGORY_FILTER,
  {
    id: "tds_applicable",
    label: "TDS",
    type: "select",
    placeholder: "All",
    options: [
      { value: "true", label: "TDS Applicable" },
      { value: "false", label: "No TDS" },
    ],
  },
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "category.name", label: "Category" },
  { value: "tds_section", label: "TDS Section" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Provider Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "is_active",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    key: "tds_applicable",
    header: "TDS Applicable",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "rating",
    header: "Rating",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
  {
    key: "total_jobs",
    header: "Total Jobs",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Providers", icon: Wrench, format: "number" }),
  createBooleanMetric("is_active", true, "Active", Check, { id: "active", format: "number" }),
  createCountMetric("with_tds", "With TDS", FileText,
    (item) => Boolean(item.tds_applicable),
    { format: "number" }
  ),
  createSumMetric("total_jobs", "total_jobs", "Total Jobs", Wrench, { format: "number" }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Provider Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  { key: "pan", header: "PAN", format: (v) => String(v ?? "") },
  { key: "tds_applicable", header: "TDS Applicable", format: (v) => (v ? "Yes" : "No") },
  { key: "tds_section", header: "TDS Section", format: (v) => String(v ?? "") },
  { key: "rating", header: "Rating", format: (v) => (v != null ? String(v) : "") },
  { key: "total_jobs", header: "Total Jobs", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Status", format: (v) => (v ? "Active" : "Inactive") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function ServiceProvidersPage() {
  return (
    <ListPageTemplate
      tableKey="service-providers"
      title="Service Providers"
      description="Manage plumbers, electricians, carpenters, and other service providers"
      icon={Wrench}
      permission="expenses.view"
      module="expenses"
      feature="serviceTracking"
      config={SERVICE_PROVIDER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search provider name, phone..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/services/providers/new"
      createLabel="Add Provider"
      createPermission="expenses.create"
      detailHref={(provider) => `/expenses/services/providers/${provider.id}`}
      exportColumns={exportColumns}
      exportFilename="service-providers"
      emptyTitle="No service providers found"
      emptyDescription="Add service providers to track maintenance and repair expenses"
    />
  )
}
