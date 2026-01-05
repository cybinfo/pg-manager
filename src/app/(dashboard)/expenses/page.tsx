/**
 * Expenses List Page (Refactored)
 *
 * BEFORE: 482 lines of code
 * AFTER: ~170 lines of code (65% reduction)
 */

"use client"

import { Receipt, TrendingDown, Calendar, BarChart3, Wallet, Download } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { EXPENSE_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"

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

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  card: "Card",
  cheque: "Cheque",
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
    render: (expense) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
          <Receipt className="h-4 w-4 text-rose-600" />
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
    render: (expense) => (
      <span className="font-semibold text-rose-600 tabular-nums">
        -{formatCurrency(Number(expense.amount))}
      </span>
    ),
  },
  {
    key: "payment_method",
    header: "Method",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    render: (expense) => (
      <TableBadge variant="muted">
        {paymentMethodLabels[expense.payment_method] || expense.payment_method}
      </TableBadge>
    ),
  },
  {
    key: "property",
    header: "Property",
    width: "tertiary",
    hideOnMobile: true,
    sortable: true,
    sortKey: "property.name",
    render: (expense) =>
      expense.property ? (
        <PropertyLink id={expense.property.id} name={expense.property.name} showIcon={false} />
      ) : (
        "General"
      ),
  },
  {
    key: "expense_date",
    header: "Date",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (expense) => formatDate(expense.expense_date),
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
    id: "expense_type_id",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
  },
  {
    id: "payment_method",
    label: "Method",
    type: "select",
    placeholder: "All Methods",
    options: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "card", label: "Card" },
      { value: "cheque", label: "Cheque" },
    ],
  },
  {
    id: "expense_date",
    label: "Date",
    type: "date-range",
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Expense>[] = [
  {
    id: "this_month",
    label: "This Month",
    icon: TrendingDown,
    compute: (items) => {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthExpenses = items.filter((e) => new Date(e.expense_date) >= thisMonthStart)
      return formatCurrency(thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0))
    },
  },
  {
    id: "last_month",
    label: "Last Month",
    icon: Calendar,
    compute: (items) => {
      const now = new Date()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const lastMonthExpenses = items.filter((e) => {
        const date = new Date(e.expense_date)
        return date >= lastMonthStart && date <= lastMonthEnd
      })
      return formatCurrency(lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0))
    },
  },
  {
    id: "ytd",
    label: "Year to Date",
    icon: BarChart3,
    compute: (items) => {
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const ytdExpenses = items.filter((e) => new Date(e.expense_date) >= yearStart)
      return formatCurrency(ytdExpenses.reduce((sum, e) => sum + Number(e.amount), 0))
    },
  },
  {
    id: "top_category",
    label: "Top Category",
    icon: Wallet,
    compute: (items) => {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthExpenses = items.filter((e) => new Date(e.expense_date) >= thisMonthStart)

      const categoryTotals: Record<string, { name: string; total: number }> = {}
      thisMonthExpenses.forEach((e) => {
        const catName = e.expense_type?.name || "Unknown"
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { name: catName, total: 0 }
        }
        categoryTotals[catName].total += Number(e.amount)
      })
      const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0]
      return topCategory?.name || "—"
    },
  },
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
      paymentMethodLabels[e.payment_method] || e.payment_method,
      e.reference_number || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Expenses exported to CSV")
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
      createHref="/expenses/new"
      createLabel="Add Expense"
      createPermission="expenses.create"
      detailHref={(expense) => `/expenses/${expense.id}`}
      emptyTitle="No expenses found"
      emptyDescription="Start tracking your property expenses"
    />
  )
}
