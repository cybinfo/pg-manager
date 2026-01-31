/**
 * Service Providers List Page
 *
 * Part of the Enhanced Expense Module - manages service providers
 * like plumbers, electricians, carpenters, etc.
 */

"use client"

import { Wrench, Check, X, Phone, Star, FileText } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { SERVICE_PROVIDER_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"

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
    render: (provider) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-amber-600" />
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
    render: (provider) =>
      provider.rating ? (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
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
    render: (provider) => (
      <span className="tabular-nums">{provider.total_jobs}</span>
    ),
  },
  {
    key: "tds_applicable",
    header: "TDS",
    width: "badge",
    hideOnMobile: true,
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
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "category_id",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
  },
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

const metrics: MetricConfig<ServiceProviderListItem>[] = [
  {
    id: "total",
    label: "Total Providers",
    icon: Wrench,
    compute: (items, total) => total,
    format: "number",
  },
  {
    id: "active",
    label: "Active",
    icon: Check,
    compute: (items) => items.filter((p) => p.is_active).length,
    format: "number",
    serverFilter: {
      column: "is_active",
      operator: "eq",
      value: true,
    },
  },
  {
    id: "with_tds",
    label: "With TDS",
    icon: FileText,
    compute: (items) => items.filter((p) => p.tds_applicable).length,
    format: "number",
  },
  {
    id: "total_jobs",
    label: "Total Jobs",
    icon: Wrench,
    compute: (items) => items.reduce((sum, p) => sum + p.total_jobs, 0),
    format: "number",
  },
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
      feature="expenses"
      config={SERVICE_PROVIDER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search provider name, phone..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      createHref="/expenses/services/providers/new"
      createLabel="Add Provider"
      createPermission="expenses.create"
      detailHref={(provider) => `/expenses/services/providers/${provider.id}`}
      emptyTitle="No service providers found"
      emptyDescription="Add service providers to track maintenance and repair expenses"
    />
  )
}
