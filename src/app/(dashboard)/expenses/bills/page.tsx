/**
 * Bill Payments List Page
 *
 * Part of the Enhanced Expense Module - manages recurring bills like
 * electricity, water, internet, rent, and other vendor payments.
 */

"use client"

import { Receipt, AlertCircle, Clock, IndianRupee } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BILL_PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency, formatDate } from "@/lib/format"
import { BILL_STATUS, EXPENSE_BILL_STATUS_OPTIONS } from "@/lib/status"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface BillPaymentListItem {
  id: string
  vendor_id: string | null
  vendor_name: string
  category_id: string | null
  category_name: string | null
  bill_number: string | null
  bill_period: string | null
  bill_date: string | null
  due_date: string | null
  bill_amount: number
  paid_amount: number | null
  payment_date: string | null
  payment_mode: string | null
  status: string
  created_at: string
  vendor: { id: string; name: string } | null
  category: { id: string; name: string; name_hi: string | null } | null
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<BillPaymentListItem>[] = [
  {
    key: "vendor_name",
    header: "Vendor / Bill",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (bill) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
          <Receipt className="h-4 w-4 text-info" />
        </div>
        <div>
          <div className="font-medium">{bill.vendor?.name || bill.vendor_name}</div>
          {bill.bill_number && (
            <div className="text-xs text-muted-foreground">#{bill.bill_number}</div>
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
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (bill) => (
      <span>{bill.category?.name || bill.category_name || "Uncategorized"}</span>
    ),
  },
  {
    key: "bill_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (bill) => (
      <span className="font-medium tabular-nums">{formatCurrency(bill.bill_amount)}</span>
    ),
  },
  {
    key: "due_date",
    header: "Due Date",
    width: "date",
    sortable: true,
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (bill) => {
      if (!bill.due_date) return <span className="text-muted-foreground">—</span>

      const dueDate = new Date(bill.due_date)
      const today = new Date()
      const isOverdue = dueDate < today && bill.status !== "paid"
      const isDueSoon = !isOverdue && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      return (
        <span
          className={
            isOverdue
              ? "text-destructive font-medium"
              : isDueSoon
                ? "text-warning"
                : ""
          }
        >
          {formatDate(bill.due_date)}
        </span>
      )
    },
  },
  {
    key: "payment_date",
    header: "Paid On",
    width: "date",
    sortable: true,
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (bill) =>
      bill.payment_date ? (
        <span className="text-success">{formatDate(bill.payment_date)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "select",
    editOptions: EXPENSE_BILL_STATUS_OPTIONS,
    render: (bill) => {
      const config = BILL_STATUS[bill.status] || { variant: "muted", label: bill.status }

      return <TableBadge variant={config.variant}>{config.label}</TableBadge>
    },
  },
  // Hidden by default columns
  {
    key: "bill_number",
    header: "Bill Number",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.bill_number || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "bill_period",
    header: "Period",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.bill_period || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "bill_date",
    header: "Bill Date",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.bill_date ? formatDate(bill.bill_date) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "paid_amount",
    header: "Paid Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (bill) => bill.paid_amount ? (
      <span className="text-success font-medium tabular-nums">{formatCurrency(bill.paid_amount)}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "payment_mode",
    header: "Payment Mode",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.payment_mode ? (
      <TableBadge variant="muted">{bill.payment_mode.replace(/_/g, " ")}</TableBadge>
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
    render: (bill) => formatDate(bill.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  EXPENSE_CATEGORY_FILTER,
  {
    id: "vendor_id",
    label: "Vendor",
    type: "select",
    placeholder: "All Vendors",
  },
  createStatusFilter([
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "category.name", label: "Category" },
  { value: "vendor_name", label: "Vendor" },
  { value: "status", label: "Status" },
  { value: "bill_period", label: "Period" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "vendor_name",
    header: "Vendor",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "bill_amount",
    header: "Bill Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: [
      { value: "pending", label: "Pending" },
      { value: "partial", label: "Partial" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
    ],
  },
  {
    key: "due_date",
    header: "Due Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "payment_date",
    header: "Payment Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Bills", icon: Receipt, format: "number" }),
  createStatusMetric(["pending", "partial"], "Pending", Clock, { id: "pending", format: "number" }),
  createStatusMetric("overdue", "Overdue", AlertCircle, { format: "number" }),
  createSumMetric("bill_amount", "total_amount", "Total Amount", IndianRupee),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "vendor_name", header: "Vendor Name" },
  { key: "bill_number", header: "Bill Number", format: (v) => String(v ?? "") },
  currencyExportColumn("bill_amount", "Bill Amount"),
  currencyExportColumn("paid_amount", "Paid Amount"),
  dateExportColumn("due_date", "Due Date"),
  dateExportColumn("payment_date", "Paid On"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  { key: "bill_period", header: "Period", format: (v) => String(v ?? "") },
  { key: "payment_mode", header: "Payment Mode", format: (v) => String(v ?? "").replace(/_/g, " ") },
  dateExportColumn("created_at", "Recorded On"),
]

// ============================================
// Page Component
// ============================================

export default function BillPaymentsPage() {
  return (
    <ListPageTemplate
      tableKey="bill-payments"
      title="Bill Payments"
      description="Track recurring bills and vendor payments"
      icon={Receipt}
      permission="expenses.view"
      feature="expenses"
      config={BILL_PAYMENT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search vendor, bill number..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/bills/new"
      createLabel="Add Bill"
      createPermission="expenses.create"
      detailHref={(bill) => `/expenses/bills/${bill.id}`}
      exportColumns={exportColumns}
      exportFilename="expense-bills"
      emptyTitle="No bills found"
      emptyDescription="Start tracking your recurring bills and vendor payments"
    />
  )
}
