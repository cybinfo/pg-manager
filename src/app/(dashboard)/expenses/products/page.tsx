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
import { PRODUCT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatCurrency } from "@/lib/format"

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
    render: (product) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <Package className="h-4 w-4 text-teal-600" />
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
  { value: "default_unit", label: "Unit" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Product>[] = [
  {
    id: "total",
    label: "Total Products",
    icon: Package,
    compute: (_items, total) => total,
    format: "number",
  },
  {
    id: "active",
    label: "Active",
    icon: Check,
    compute: (_items, _total, serverData) => serverData?.active ?? 0,
    format: "number",
    serverFilter: {
      column: "is_active",
      operator: "eq",
      value: true,
    },
  },
  {
    id: "inactive",
    label: "Inactive",
    icon: X,
    compute: (_items, _total, serverData) => serverData?.inactive ?? 0,
    format: "number",
    serverFilter: {
      column: "is_active",
      operator: "eq",
      value: false,
    },
  },
  {
    id: "categories",
    label: "Categories",
    icon: Tag,
    compute: (items) => {
      // Note: This is computed from current page data as there's no simple way
      // to count distinct categories server-side via REST API
      const categories = new Set(items.map((p) => p.category?.id).filter(Boolean))
      return categories.size
    },
    format: "number",
  },
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
      feature="expenses"
      config={PRODUCT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search product name, Hindi name..."
      createHref="/expenses/products/new"
      createLabel="Add Product"
      createPermission="expenses.create"
      detailHref={(product) => `/expenses/products/${product.id}`}
      emptyTitle="No products found"
      emptyDescription="Add products to track kitchen and daily purchases"
    />
  )
}
