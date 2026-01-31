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
import { DAILY_SPEND_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
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
    render: (item) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <Calendar className="h-4 w-4 text-orange-600" />
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
  {
    id: "spend_date",
    label: "Date",
    type: "date",
    placeholder: "Select date",
  },
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

const metrics: MetricConfig<DailySpendItem>[] = [
  {
    id: "total_spend",
    label: "Total Spend",
    icon: TrendingUp,
    compute: (_items, _total, serverData) => serverData?.total_spend ?? 0,
    format: "currency",
    serverSum: { column: "total" },
  },
  {
    id: "total_items",
    label: "Items",
    icon: Package,
    compute: (_items, total) => total,
    format: "number",
  },
  {
    id: "cash",
    label: "Cash",
    icon: ShoppingBag,
    compute: (_items, _total, serverData) => serverData?.cash ?? 0,
    format: "currency",
    serverSum: {
      column: "total",
      filter: { column: "payment_mode", operator: "eq", value: "cash" },
    },
  },
  {
    id: "upi",
    label: "UPI",
    icon: ShoppingBag,
    compute: (_items, _total, serverData) => serverData?.upi ?? 0,
    format: "currency",
    serverSum: {
      column: "total",
      filter: { column: "payment_mode", operator: "eq", value: "upi" },
    },
  },
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
      createHref="/expenses/daily-spend/new"
      createLabel="Add Entry"
      createPermission="expenses.create"
      detailHref={(item) => `/expenses/daily-spend/${item.id}`}
      emptyTitle="No daily spend entries"
      emptyDescription="Start tracking your daily kitchen and household expenses"
    />
  )
}
