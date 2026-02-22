/**
 * Daily Spend List Page (Kitchen/Daily Purchases)
 *
 * Part of the Enhanced Expense Module - tracks daily kitchen purchases,
 * groceries, and other day-to-day expenses.
 */

"use client"

import { ShoppingBag, Calendar, TrendingUp, Package } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { DAILY_SPEND_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER, createDateFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency, formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface DailySpendItem {
  id: string
  spend_date: string
  product_id: string | null
  product_name: string
  quantity: number
  unit: string
  rate: number
  total: number
  vendor_name: string | null
  payment_mode: string
  notes: string | null
  created_at: string
  product: { id: string; name: string; name_hi: string | null } | null
  category: { id: string; name: string; name_hi: string | null } | null
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<DailySpendItem>[] = [
  {
    key: "spend_date",
    header: "Date",
    width: "date",
    sortable: true,
    canHide: false,
    render: (item) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Calendar className="h-4 w-4 text-warning" />
        </div>
        <div>
          <div className="font-medium">{formatDate(item.spend_date)}</div>
          {item.vendor_name && (
            <div className="text-xs text-muted-foreground">{item.vendor_name}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "product_name",
    header: "Item",
    width: "primary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (item) => (
      <div>
        <div className="font-medium">{item.product?.name || item.product_name}</div>
        {item.product?.name_hi && (
          <div className="text-xs text-muted-foreground">{item.product.name_hi}</div>
        )}
      </div>
    ),
  },
  {
    key: "quantity",
    header: "Qty",
    width: "count",
    hideOnMobile: true,
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (item) => (
      <span className="tabular-nums">
        {item.quantity} {item.unit}
      </span>
    ),
  },
  {
    key: "rate",
    header: "Rate",
    width: "amount",
    hideOnMobile: true,
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (item) => (
      <span className="tabular-nums text-muted-foreground">
        {formatCurrency(item.rate)}/{item.unit}
      </span>
    ),
  },
  {
    key: "total",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (item) => (
      <span className="font-medium tabular-nums">{formatCurrency(item.total)}</span>
    ),
  },
  {
    key: "payment_mode",
    header: "Payment",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (item) => (
      <TableBadge
        variant={
          item.payment_mode === "cash"
            ? "warning"
            : item.payment_mode === "upi"
              ? "success"
              : "muted"
        }
      >
        {item.payment_mode.toUpperCase()}
      </TableBadge>
    ),
  },
  // Hidden by default columns
  {
    key: "vendor_name",
    header: "Vendor",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (item) => item.vendor_name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "category",
    header: "Category",
    width: "badge",
    sortable: true,
    sortKey: "category.name",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.category?.name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "unit",
    header: "Unit",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.unit || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (item) => item.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{item.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "created_at",
    header: "Recorded On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (item) => formatDate(item.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  EXPENSE_CATEGORY_FILTER,
  {
    id: "payment_mode",
    label: "Payment",
    type: "select",
    placeholder: "All Modes",
    options: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "card", label: "Card" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "credit", label: "Credit" },
    ],
  },
  createDateFilter("spend_date", "Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "spend_date", label: "Date" },
  { value: "product_name", label: "Product" },
  { value: "category.name", label: "Category" },
  { value: "payment_mode", label: "Payment Mode" },
  { value: "vendor_name", label: "Vendor" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "product_name",
    header: "Product",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "total",
    header: "Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "spend_date",
    header: "Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "payment_mode",
    header: "Payment Mode",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "card", label: "Card" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "credit", label: "Credit" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createSumMetric("total", "total_spend", "Total Spend", TrendingUp),
  createTotalMetric({ id: "total_items", label: "Items", icon: Package, format: "number" }),
  createSumMetric("total", "cash", "Cash", ShoppingBag, {
    filter: { column: "payment_mode", operator: "eq", value: "cash" },
  }),
  createSumMetric("total", "upi", "UPI", ShoppingBag, {
    filter: { column: "payment_mode", operator: "eq", value: "upi" },
  }),
]

// ============================================
// Page Component
// ============================================

export default function DailySpendPage() {
  return (
    <ListPageTemplate
      tableKey="daily-spend"
      title="Daily Spend"
      description="Track kitchen and daily purchase expenses"
      icon={ShoppingBag}
      permission="expenses.view"
      feature="expenses"
      config={DAILY_SPEND_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search item, vendor..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/daily-spend/new"
      createLabel="Add Entry"
      createPermission="expenses.create"
      detailHref={(item) => `/expenses/daily-spend/${item.id}`}
      emptyTitle="No daily spend entries"
      emptyDescription="Start tracking your daily kitchen and household expenses"
    />
  )
}
