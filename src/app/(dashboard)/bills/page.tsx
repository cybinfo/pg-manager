/**
 * Bills List Page (Refactored)
 *
 * BEFORE: 420 lines of code
 * AFTER: ~130 lines of code (69% reduction)
 */

"use client"

import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BILL_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  tenant: { id: string; name: string; phone: string } | null
  property: { id: string; name: string } | null
  bill_month?: string
  bill_year?: string
}

// ============================================
// Status Helper
// ============================================

const getStatusInfo = (status: string): { status: "success" | "warning" | "error" | "muted"; label: string } => {
  switch (status) {
    case "paid":
      return { status: "success", label: "Paid" }
    case "pending":
      return { status: "warning", label: "Pending" }
    case "partial":
      return { status: "warning", label: "Partial" }
    case "overdue":
      return { status: "error", label: "Overdue" }
    default:
      return { status: "muted", label: status }
  }
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Bill>[] = [
  {
    key: "bill_number",
    header: "Bill",
    width: "primary",
    sortable: true,
    render: (bill) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{bill.bill_number}</div>
          {bill.tenant && (
            <div><TenantLink id={bill.tenant.id} name={bill.tenant.name} size="sm" /></div>
          )}
          {bill.property && (
            <div><PropertyLink id={bill.property.id} name={bill.property.name} size="sm" /></div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "for_month",
    header: "Period",
    width: "tertiary",
    sortable: true,
    render: (bill) => bill.for_month,
  },
  {
    key: "total_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (bill) => (
      <div>
        <div className="font-medium tabular-nums">{formatCurrency(bill.total_amount)}</div>
        {bill.balance_due > 0 && bill.status !== "paid" && (
          <div className="text-xs text-rose-600">Due: {formatCurrency(bill.balance_due)}</div>
        )}
      </div>
    ),
  },
  {
    key: "due_date",
    header: "Due",
    width: "date",
    hideOnMobile: true,
    sortable: true,
    sortType: "date",
    render: (bill) => formatDate(bill.due_date),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (bill) => {
      const info = getStatusInfo(bill.status)
      return <StatusDot status={info.status} label={info.label} />
    },
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
  {
    id: "bill_date",
    label: "Bill Date",
    type: "date-range",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "status", label: "Status" },
  { value: "for_month", label: "Period" },
  { value: "bill_month", label: "Bill Month" },
  { value: "bill_year", label: "Year" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Bill>[] = [
  {
    id: "total",
    label: "Total Billed",
    icon: FileText,
    compute: (items) => formatCurrency(items.reduce((sum, b) => sum + Number(b.total_amount), 0)),
  },
  {
    id: "collected",
    label: "Collected",
    icon: CheckCircle,
    compute: (items) => formatCurrency(items.reduce((sum, b) => sum + Number(b.paid_amount), 0)),
  },
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    compute: (items) =>
      formatCurrency(
        items
          .filter((b) => b.status === "pending" || b.status === "partial")
          .reduce((sum, b) => sum + Number(b.balance_due), 0)
      ),
    highlight: (value) => value !== "₹0",
  },
  {
    id: "overdue",
    label: "Overdue",
    icon: AlertCircle,
    compute: (items) =>
      formatCurrency(
        items.filter((b) => b.status === "overdue").reduce((sum, b) => sum + Number(b.balance_due), 0)
      ),
    highlight: (value) => value !== "₹0",
  },
]

// ============================================
// Page Component
// ============================================

export default function BillsPage() {
  return (
    <ListPageTemplate
      title="Bills"
      description="Generate and manage monthly bills for tenants"
      icon={FileText}
      permission="bills.view"
      config={BILL_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by bill number, tenant, or month..."
      createHref="/bills/new"
      createLabel="Generate Bill"
      createPermission="bills.create"
      detailHref={(bill) => `/bills/${bill.id}`}
      emptyTitle="No bills found"
      emptyDescription="Generate your first bill to get started"
    />
  )
}
