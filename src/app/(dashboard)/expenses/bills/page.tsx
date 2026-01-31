/**
 * Bill Payments List Page
 *
 * Part of the Enhanced Expense Module - manages recurring bills like
 * electricity, water, internet, rent, and other vendor payments.
 */

"use client"

import { Receipt, Calendar, AlertCircle, Check, Clock, IndianRupee } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BILL_PAYMENT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatCurrency, formatDate } from "@/lib/format"

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
    render: (bill) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Receipt className="h-4 w-4 text-blue-600" />
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
              ? "text-red-600 font-medium"
              : isDueSoon
                ? "text-orange-600"
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
    render: (bill) =>
      bill.payment_date ? (
        <span className="text-green-600">{formatDate(bill.payment_date)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (bill) => {
      const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string }> = {
        paid: { variant: "success", label: "Paid" },
        pending: { variant: "warning", label: "Pending" },
        partial: { variant: "muted", label: "Partial" },
        overdue: { variant: "error", label: "Overdue" },
      }
      const config = statusConfig[bill.status] || { variant: "muted", label: bill.status }

      return <TableBadge variant={config.variant}>{config.label}</TableBadge>
    },
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
    id: "vendor_id",
    label: "Vendor",
    type: "select",
    placeholder: "All Vendors",
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "pending", label: "Pending" },
      { value: "partial", label: "Partial" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
    ],
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<BillPaymentListItem>[] = [
  {
    id: "total",
    label: "Total Bills",
    icon: Receipt,
    compute: (items, total) => total,
    format: "number",
  },
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    compute: (items) =>
      items.filter((b) => b.status === "pending" || b.status === "partial").length,
    format: "number",
    serverFilter: {
      column: "status",
      operator: "in",
      value: ["pending", "partial"],
    },
  },
  {
    id: "overdue",
    label: "Overdue",
    icon: AlertCircle,
    compute: (items) => items.filter((b) => b.status === "overdue").length,
    format: "number",
    serverFilter: {
      column: "status",
      operator: "eq",
      value: "overdue",
    },
  },
  {
    id: "total_amount",
    label: "Total Amount",
    icon: IndianRupee,
    compute: (items) => items.reduce((sum, b) => sum + Number(b.bill_amount), 0),
    format: "currency",
  },
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
      createHref="/expenses/bills/new"
      createLabel="Add Bill"
      createPermission="expenses.create"
      detailHref={(bill) => `/expenses/bills/${bill.id}`}
      emptyTitle="No bills found"
      emptyDescription="Start tracking your recurring bills and vendor payments"
    />
  )
}
