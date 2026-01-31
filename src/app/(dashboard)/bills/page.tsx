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
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
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
  notes: string | null
  created_at: string
  tenant: { id: string; name: string; phone: string; email?: string } | null
  property: { id: string; name: string; address?: string } | null
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
    canHide: false,
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
        </div>
      </div>
    ),
  },
  {
    key: "property",
    header: "Property",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    render: (bill) => bill.property ? (
      <PropertyLink id={bill.property.id} name={bill.property.name} size="sm" />
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "for_month",
    header: "Period",
    width: "tertiary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (bill) => bill.for_month,
  },
  {
    key: "total_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
    render: (bill) => formatDate(bill.due_date),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (bill) => {
      const info = getStatusInfo(bill.status)
      return <StatusDot status={info.status} label={info.label} />
    },
  },
  // Hidden by default columns
  {
    key: "paid_amount",
    header: "Paid Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (bill) => (
      <span className="tabular-nums text-emerald-600">{formatCurrency(bill.paid_amount)}</span>
    ),
  },
  {
    key: "balance_due",
    header: "Balance Due",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (bill) => (
      <span className={`tabular-nums ${bill.balance_due > 0 ? "text-rose-600" : ""}`}>
        {formatCurrency(bill.balance_due)}
      </span>
    ),
  },
  {
    key: "bill_date",
    header: "Bill Date",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (bill) => formatDate(bill.bill_date),
  },
  {
    key: "tenant_phone",
    header: "Tenant Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.tenant?.phone || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (bill) => bill.notes ? (
      <span className="truncate max-w-[150px]" title={bill.notes}>{bill.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "created_at",
    header: "Created",
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "bill_number",
    header: "Bill Number",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: [
      { value: "pending", label: "Pending" },
      { value: "partial", label: "Partial" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
    ],
  },
  {
    key: "total_amount",
    header: "Total Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "balance_due",
    header: "Balance Due",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "bill_date",
    header: "Bill Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "due_date",
    header: "Due Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Bill>[] = [
  {
    id: "total",
    label: "Total Billed",
    icon: FileText,
    compute: (items, _total, serverData) => {
      if (serverData?.total !== undefined) {
        return formatCurrency(serverData.total)
      }
      return formatCurrency(items.reduce((sum, b) => sum + Number(b.total_amount), 0))
    },
    serverSum: {
      column: "total_amount",
    },
  },
  {
    id: "collected",
    label: "Collected",
    icon: CheckCircle,
    compute: (items, _total, serverData) => {
      if (serverData?.collected !== undefined) {
        return formatCurrency(serverData.collected)
      }
      return formatCurrency(items.reduce((sum, b) => sum + Number(b.paid_amount), 0))
    },
    serverSum: {
      column: "paid_amount",
    },
  },
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    compute: (items, _total, serverData) => {
      if (serverData?.pending !== undefined) {
        return formatCurrency(serverData.pending)
      }
      return formatCurrency(
        items
          .filter((b) => b.status === "pending" || b.status === "partial")
          .reduce((sum, b) => sum + Number(b.balance_due), 0)
      )
    },
    highlight: (value) => value !== "₹0",
    serverSum: {
      column: "balance_due",
      filter: {
        column: "status",
        operator: "in",
        value: ["pending", "partial"],
      },
    },
  },
  {
    id: "overdue",
    label: "Overdue",
    icon: AlertCircle,
    compute: (items, _total, serverData) => {
      if (serverData?.overdue !== undefined) {
        return formatCurrency(serverData.overdue)
      }
      return formatCurrency(
        items.filter((b) => b.status === "overdue").reduce((sum, b) => sum + Number(b.balance_due), 0)
      )
    },
    highlight: (value) => value !== "₹0",
    serverSum: {
      column: "balance_due",
      filter: {
        column: "status",
        operator: "eq",
        value: "overdue",
      },
    },
  },
]

// ============================================
// Page Component
// ============================================

export default function BillsPage() {
  return (
    <ListPageTemplate
      tableKey="bills"
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
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      createHref="/bills/new"
      createLabel="Generate Bill"
      createPermission="bills.create"
      detailHref={(bill) => `/bills/${bill.id}`}
      emptyTitle="No bills found"
      emptyDescription="Generate your first bill to get started"
    />
  )
}
