/**
 * Products List Page (Kitchen/Daily Spend Items)
 *
 * Part of the Enhanced Expense Module - Product Master for tracking
 * kitchen items, groceries, and daily purchases.
 */

"use client"

import { Package, Check, X, Tag } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PRODUCT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER, ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { UNIT_OPTIONS } from "@/lib/status"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency, formatDate } from "@/lib/format"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Product {
  id: string
  name: string
  name_hi: string | null
  category_id: string | null
  default_unit: string | null
  default_rate: number | null
  is_active: boolean
  created_at: string
  category: { id: string; name: string; name_hi: string | null } | null
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Product>[] = [
  {
    key: "name",
    header: "Product Name",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true, minLength: 2 },
    render: (product) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-medium">{product.name}</div>
          {product.name_hi && (
            <div className="text-xs text-muted-foreground">{product.name_hi}</div>
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
    render: (product) => (
      <div className="flex items-center gap-2">
        <Tag className="h-3 w-3 text-muted-foreground" />
        <span>{product.category?.name || "Uncategorized"}</span>
      </div>
    ),
  },
  {
    key: "default_unit",
    header: "Unit",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "select",
    editOptions: UNIT_OPTIONS,
    render: (product) => (
      <TableBadge variant="muted">
        {product.default_unit || "—"}
      </TableBadge>
    ),
  },
  {
    key: "default_rate",
    header: "Default Rate",
    width: "amount",
    hideOnMobile: true,
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (product) =>
      product.default_rate ? (
        <span className="font-medium tabular-nums">
          {formatCurrency(product.default_rate)}
          {product.default_unit && (
            <span className="text-xs text-muted-foreground">/{product.default_unit}</span>
          )}
        </span>
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
    render: (product) =>
      product.is_active ? (
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
    key: "name_hi",
    header: "Hindi Name",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (product) => product.name_hi || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (product) => formatDate(product.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  EXPENSE_CATEGORY_FILTER,
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "category.name", label: "Category" },
  { value: "default_unit", label: "Unit" },
  { value: "is_active", label: "Status" },
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
    key: "default_rate",
    header: "Default Rate",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "default_unit",
    header: "Unit",
    filterType: "text",
    filterOperators: ["contains", "eq"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Products", icon: Package, format: "number" }),
  createBooleanMetric("is_active", true, "Active", Check, { id: "active", format: "number" }),
  createBooleanMetric("is_active", false, "Inactive", X, { id: "inactive", format: "number" }),
  {
    // Custom: distinct count of categories
    id: "categories",
    label: "Categories",
    icon: Tag,
    compute: (items) => {
      const categories = new Set(items.map((p) => (p.category as { id?: string } | null)?.id).filter(Boolean))
      return categories.size
    },
    format: "number",
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Product Name" },
  { key: "name_hi", header: "Hindi Name", format: (v) => String(v ?? "") },
  { key: "default_unit", header: "Unit", format: (v) => String(v ?? "") },
  currencyExportColumn("default_rate", "Default Rate"),
  { key: "is_active", header: "Status", format: (v) => (v ? "Active" : "Inactive") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function ProductsPage() {
  return (
    <ListPageTemplate
      tableKey="products"
      title="Product Master"
      description="Manage kitchen and daily spend items"
      icon={Package}
      permission="expenses.view"
      module="expenses"
      config={PRODUCT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search product name, Hindi name..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/products/new"
      createLabel="Add Product"
      createPermission="expenses.create"
      detailHref={(product) => `/expenses/products/${product.id}`}
      exportColumns={exportColumns}
      exportFilename="products"
      emptyTitle="No products found"
      emptyDescription="Add products to track kitchen and daily purchases"
    />
  )
}
