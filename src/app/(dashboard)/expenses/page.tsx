/**
 * Expenses List Page (Refactored)
 *
 * BEFORE: 482 lines of code
 * AFTER: ~170 lines of code (65% reduction)
 */

"use client"

import { Receipt, TrendingDown, Calendar, BarChart3, Wallet, Download } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { currencyColumn, dateColumn, badgeColumn } from "@/lib/column-builders"
import { Button } from "@/components/ui/button"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { EXPENSE_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createThisMonthSumMetric, createLastMonthSumMetric, createYearToDateSumMetric, createTopValueByAmountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, PAYMENT_METHOD_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"
import { showSuccess } from "@/lib/toast-helpers"
import { PAYMENT_METHODS } from "@/lib/status"
import { getTodayISO } from "@/lib/date-helpers"

// ============================================
// Types
// ============================================

interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string | null
  vendor_name: string | null
  reference_number: string | null
  payment_method: string
  property_id: string | null
  expense_type_id: string
  expense_type: { id: string; name: string; code: string } | null
  property: { id: string; name: string } | null
  created_at: string
  expense_month?: string
  expense_year?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Expense>[] = [
  {
    key: "expense_type",
    header: "Category",
    width: "primary",
    sortable: true,
    sortKey: "expense_type.name",
    canHide: false,
    render: (expense) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Receipt className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <div className="font-medium">{expense.expense_type?.name || "Expense"}</div>
          <div className="text-xs text-muted-foreground">
            {expense.vendor_name || expense.description || "No description"}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (expense) => (
      <span className="font-semibold text-destructive tabular-nums">
        -{formatCurrency(Number(expense.amount))}
      </span>
    ),
  },
  badgeColumn("payment_method", "Method", PAYMENT_METHODS, {
    hideOnMobile: true,
    defaultVariant: "muted",
  }),
  {
    key: "property",
    header: "Property",
    width: "tertiary",
    hideOnMobile: true,
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    render: (expense) =>
      expense.property ? (
        <PropertyLink id={expense.property.id} name={expense.property.name} showIcon={false} />
      ) : (
        "General"
      ),
  },
  dateColumn("expense_date", "Date"),
  // Hidden by default columns
  {
    key: "description",
    header: "Description",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (expense) => expense.description ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{expense.description}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "vendor_name",
    header: "Vendor",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (expense) => expense.vendor_name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "reference_number",
    header: "Reference",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (expense) => expense.reference_number || <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  {
    id: "expense_type_id",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
  },
  PAYMENT_METHOD_FILTER,
  createDateRangeFilter("expense_date", "Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "expense_type.name", label: "Category" },
  { value: "property.name", label: "Property" },
  { value: "vendor_name", label: "Vendor" },
  { value: "payment_method", label: "Method" },
  { value: "expense_month", label: "Month" },
  { value: "expense_year", label: "Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "amount",
    header: "Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "payment_method",
    header: "Payment Method",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "card", label: "Card" },
      { value: "cheque", label: "Cheque" },
    ],
  },
  {
    key: "expense_date",
    header: "Expense Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "vendor_name",
    header: "Vendor",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Expense>[] = [
  createThisMonthSumMetric("amount", "expense_date", "This Month", TrendingDown),
  createLastMonthSumMetric("amount", "expense_date", "Last Month", Calendar),
  createYearToDateSumMetric("amount", "expense_date", "Year to Date", BarChart3),
  createTopValueByAmountMetric("expense_type.name", "amount", "top_category", "Top Category", Wallet, {
    dateField: "expense_date",
  }),
]

// ============================================
// Export Function
// ============================================

function ExportButton({ expenses }: { expenses: Expense[] }) {
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Category",
      "Description",
      "Vendor",
      "Property",
      "Amount",
      "Payment Method",
      "Reference",
    ]
    const rows = expenses.map((e) => [
      e.expense_date,
      e.expense_type?.name || "",
      e.description || "",
      e.vendor_name || "",
      e.property?.name || "All Properties",
      e.amount,
      PAYMENT_METHODS[e.payment_method] || e.payment_method,
      e.reference_number || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${getTodayISO()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showSuccess("Expenses exported to CSV")
  }

  return (
    <Button variant="outline" size="sm" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  )
}

// ============================================
// Page Component
// ============================================

export default function ExpensesPage() {
  return (
    <ListPageTemplate
      tableKey="expenses"
      title="Expenses"
      description="Track and manage property expenses"
      icon={Receipt}
      permission="expenses.view"
      feature="expenses"
      config={EXPENSE_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search vendor, description, reference..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      createHref="/expenses/new"
      createLabel="Add Expense"
      createPermission="expenses.create"
      detailHref={(expense) => `/expenses/${expense.id}`}
      emptyTitle="No expenses found"
      emptyDescription="Start tracking your property expenses"
    />
  )
}
