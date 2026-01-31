/**
 * Miscellaneous Transactions List Page
 *
 * Track money in/out that doesn't fit into regular categories.
 * Includes PG collections, drawings, salaries, and other cash flow.
 *
 * Converted to use ListPageTemplate for consistency with other expense pages.
 */

"use client"

import Link from "next/link"
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react"

import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { MISC_TRANSACTION_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatCurrency, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"

// ============================================
// Types
// ============================================

interface MiscTransactionItem {
  id: string
  transaction_type: "in" | "out"
  category_id: string | null
  category_name: string | null
  person_name: string | null
  description: string | null
  amount: number
  transaction_date: string
  payment_mode: string
  payment_reference: string | null
  property_id: string | null
  tenant_id: string | null
  notes: string | null
  created_at: string
  category: { id: string; name: string; name_hi: string | null; default_type: string } | null
  property: { id: string; name: string } | null
  tenant: { id: string; name: string } | null
  transaction_month?: string
  transaction_year?: string
  type_label?: string
  display_amount?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<MiscTransactionItem>[] = [
  {
    key: "transaction_date",
    header: "Date",
    width: "date",
    sortable: true,
    render: (item) => formatDate(item.transaction_date),
  },
  {
    key: "transaction_type",
    header: "Type",
    width: "badge",
    sortable: true,
    render: (item) => (
      <TableBadge variant={item.transaction_type === "in" ? "success" : "error"}>
        {item.transaction_type === "in" ? (
          <>
            <ArrowDownLeft className="h-3 w-3 mr-1" /> In
          </>
        ) : (
          <>
            <ArrowUpRight className="h-3 w-3 mr-1" /> Out
          </>
        )}
      </TableBadge>
    ),
  },
  {
    key: "person_name",
    header: "Person / Description",
    width: "primary",
    sortable: true,
    render: (item) => (
      <div>
        <div className="font-medium">{item.person_name || "—"}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
            {item.description}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "category_name",
    header: "Category",
    width: "secondary",
    sortable: true,
    hideOnMobile: true,
    render: (item) => (
      <TableBadge variant="muted">
        {item.category?.name || item.category_name || "Uncategorized"}
      </TableBadge>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (item) => (
      <span className={item.transaction_type === "in" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {item.transaction_type === "in" ? "+" : "-"}
        {formatCurrency(item.amount)}
      </span>
    ),
  },
  {
    key: "payment_mode",
    header: "Mode",
    width: "badge",
    sortable: true,
    hideOnMobile: true,
    render: (item) => {
      const modeLabels: Record<string, string> = {
        cash: "Cash",
        upi: "UPI",
        paytm: "Paytm",
        bank_transfer: "Bank",
        card: "Card",
        cheque: "Cheque",
        other: "Other",
      }
      return <TableBadge variant="muted">{modeLabels[item.payment_mode] || item.payment_mode}</TableBadge>
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "transaction_type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "in", label: "Money In" },
      { value: "out", label: "Money Out" },
    ],
  },
  {
    id: "category_id",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
  },
  {
    id: "payment_mode",
    label: "Payment Mode",
    type: "select",
    placeholder: "All Modes",
    options: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "paytm", label: "Paytm" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "card", label: "Card" },
      { value: "cheque", label: "Cheque" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "transaction_date",
    label: "Date",
    type: "date",
    placeholder: "Select date",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "transaction_date", label: "Date" },
  { value: "transaction_type", label: "Type" },
  { value: "category.name", label: "Category" },
  { value: "payment_mode", label: "Payment Mode" },
  { value: "person_name", label: "Person" },
  { value: "transaction_month", label: "Month" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<MiscTransactionItem>[] = [
  {
    id: "money_in",
    label: "Money In",
    icon: ArrowDownLeft,
    compute: (_items, _total, serverData) => serverData?.money_in ?? 0,
    format: "currency",
    highlight: () => true,
    serverSum: {
      column: "amount",
      filter: { column: "transaction_type", operator: "eq", value: "in" },
    },
  },
  {
    id: "money_out",
    label: "Money Out",
    icon: ArrowUpRight,
    compute: (_items, _total, serverData) => serverData?.money_out ?? 0,
    format: "currency",
    serverSum: {
      column: "amount",
      filter: { column: "transaction_type", operator: "eq", value: "out" },
    },
  },
  {
    id: "net_amount",
    label: "Net Balance",
    icon: TrendingUp,
    compute: (_items, _total, serverData) => {
      const inAmount = serverData?.money_in ?? 0
      const outAmount = serverData?.money_out ?? 0
      return inAmount - outAmount
    },
    format: "currency",
    highlight: (_value, _items) => {
      // Highlight if positive
      return typeof _value === "number" && _value >= 0
    },
  },
  {
    id: "total_transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    compute: (_items, total) => total,
    format: "number",
  },
]

// ============================================
// Custom Header Actions
// ============================================

function HeaderActions() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/expenses/misc/categories">Manage Categories</Link>
    </Button>
  )
}

// ============================================
// Page Component
// ============================================

export default function MiscTransactionsPage() {
  return (
    <ListPageTemplate
      tableKey="misc-transactions"
      title="Miscellaneous Transactions"
      description="Track money in and out that doesn't fit regular categories"
      icon={ArrowLeftRight}
      permission="expenses.view"
      feature="expenses"
      config={MISC_TRANSACTION_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search person, description..."
      createHref="/expenses/misc/new"
      createLabel="New Transaction"
      createPermission="expenses.create"
      detailHref={(item) => `/expenses/misc/${item.id}`}
      emptyTitle="No transactions found"
      emptyDescription="Start recording your miscellaneous money in and out"
      headerActions={<HeaderActions />}
    />
  )
}
