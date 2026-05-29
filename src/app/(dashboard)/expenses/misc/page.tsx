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
import { MISC_TRANSACTION_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER, createDateFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency } from "@/lib/format"
import { PAYMENT_METHODS, EXPENSE_MISC_PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { dateColumn, badgeColumn } from "@/lib/columns"
import { Button } from "@/components/ui/button"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"

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
  dateColumn("transaction_date", "Date", { canHide: false }),
  {
    key: "transaction_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: false,
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
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (item) => (
      <span className={item.transaction_type === "in" ? "text-success font-medium" : "text-destructive font-medium"}>
        {item.transaction_type === "in" ? "+" : "-"}
        {formatCurrency(item.amount)}
      </span>
    ),
  },
  badgeColumn("payment_mode", "Mode", PAYMENT_METHODS, { hideOnMobile: true }),
  // Hidden by default columns
  {
    key: "description",
    header: "Description",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (item) => item.description ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{item.description}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "property",
    header: "Property",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.property?.name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "tenant",
    header: "Tenant",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.tenant?.name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "payment_reference",
    header: "Reference",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.payment_reference || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (item) => item.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{item.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Recorded On", { sortType: "date", defaultVisible: false }),
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
  EXPENSE_CATEGORY_FILTER,
  {
    id: "payment_mode",
    label: "Payment Mode",
    type: "select",
    placeholder: "All Modes",
    options: EXPENSE_MISC_PAYMENT_MODE_OPTIONS,
  },
  createDateFilter("transaction_date", "Date"),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "transaction_type",
    header: "Type",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "in", label: "Money In" },
      { value: "out", label: "Money Out" },
    ],
  },
  {
    key: "amount",
    header: "Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "transaction_date",
    header: "Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "person_name",
    header: "Person",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createSumMetric("amount", "money_in", "Money In", ArrowDownLeft, {
    filter: { column: "transaction_type", operator: "eq", value: "in" },
    highlight: () => true,
  }),
  createSumMetric("amount", "money_out", "Money Out", ArrowUpRight, {
    filter: { column: "transaction_type", operator: "eq", value: "out" },
  }),
  {
    // Net balance derived from two server sums — returns string to avoid AnimatedNumber with negatives
    id: "net_amount",
    label: "Net Balance",
    icon: TrendingUp,
    compute: (_items, _total, serverData) => {
      const inAmount = Number(serverData?.["money_in"]) || 0
      const outAmount = Number(serverData?.["money_out"]) || 0
      return formatCurrency(inAmount - outAmount)
    },
    highlight: (value) => typeof value === "string" && !value.startsWith("-"),
  },
  createTotalMetric({ id: "total_transactions", label: "Transactions", icon: ArrowLeftRight, format: "number", serverCount: true }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  dateExportColumn("transaction_date", "Date"),
  { key: "transaction_type", header: "Type", format: (v) => v === "in" ? "Money In" : "Money Out" },
  { key: "person_name", header: "Person", format: (v) => String(v ?? "") },
  { key: "description", header: "Description", format: (v) => String(v ?? "") },
  { key: "category_name", header: "Category", format: (v) => String(v ?? "") },
  currencyExportColumn("amount", "Amount"),
  { key: "payment_mode", header: "Payment Mode", format: (v) => PAYMENT_METHODS[v as string] || String(v ?? "") },
  { key: "payment_reference", header: "Reference", format: (v) => String(v ?? "") },
  { key: "notes", header: "Notes", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Recorded On"),
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
      module="expenses"
      feature="miscTransactions"
      config={MISC_TRANSACTION_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search person, description..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/misc/new"
      createLabel="New Transaction"
      createPermission="expenses.create"
      detailHref={(item) => `/expenses/misc/${item.id}`}
      exportColumns={exportColumns}
      exportFilename="misc-expenses"
      emptyTitle="No transactions found"
      emptyDescription="Start recording your miscellaneous money in and out"
      headerActions={<HeaderActions />}
    />
  )
}
