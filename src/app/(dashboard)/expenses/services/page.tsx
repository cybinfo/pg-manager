/**
 * Service Payments List Page
 *
 * Part of the Enhanced Expense Module - tracks service payments
 * with TDS deduction and warranty tracking.
 */

"use client"

import { Hammer, Calendar, Shield, IndianRupee, FileText } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { SERVICE_PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { EXPENSE_CATEGORY_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatCurrency, formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface ServicePaymentListItem {
  id: string
  provider_id: string | null
  provider_name: string
  category_id: string | null
  category_name: string | null
  service_date: string
  description: string
  gross_amount: number
  tds_applicable: boolean
  tds_amount: number
  net_amount: number
  payment_mode: string | null
  warranty_months: number
  warranty_expiry: string | null
  created_at: string
  provider: { id: string; name: string } | null
  category: { id: string; name: string; name_hi: string | null } | null
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<ServicePaymentListItem>[] = [
  {
    key: "service_date",
    header: "Date",
    width: "date",
    sortable: true,
    canHide: false,
    render: (payment) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Hammer className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="font-medium">{formatDate(payment.service_date)}</div>
          <div className="text-xs text-muted-foreground">
            {payment.provider?.name || payment.provider_name}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "description",
    header: "Service",
    width: "primary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) => (
      <div>
        <div className="font-medium line-clamp-1">{payment.description}</div>
        {payment.category && (
          <div className="text-xs text-muted-foreground">{payment.category.name}</div>
        )}
      </div>
    ),
  },
  {
    key: "gross_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editField: "gross_amount",
    editValidation: { min: 0 },
    render: (payment) => (
      <div className="text-right">
        <div className="font-medium tabular-nums">{formatCurrency(payment.net_amount)}</div>
        {payment.tds_applicable && payment.tds_amount > 0 && (
          <div className="text-xs text-muted-foreground">
            TDS: {formatCurrency(payment.tds_amount)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "warranty_expiry",
    header: "Warranty",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) => {
      if (!payment.warranty_months || payment.warranty_months === 0) {
        return <span className="text-muted-foreground">—</span>
      }

      const expiryDate = payment.warranty_expiry
        ? new Date(payment.warranty_expiry)
        : null
      const isExpired = expiryDate && expiryDate < new Date()

      return (
        <TableBadge variant={isExpired ? "error" : "success"}>
          <Shield className="h-3 w-3 mr-1" />
          {isExpired ? "Expired" : `${payment.warranty_months}mo`}
        </TableBadge>
      )
    },
  },
  {
    key: "tds_applicable",
    header: "TDS",
    width: "badge",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) =>
      payment.tds_applicable ? (
        <TableBadge variant="muted">
          <FileText className="h-3 w-3 mr-1" />
          Yes
        </TableBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  // Hidden by default columns
  {
    key: "provider_name",
    header: "Provider",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.provider?.name || payment.provider_name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "category",
    header: "Category",
    width: "badge",
    sortable: true,
    sortKey: "category.name",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.category?.name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "gross_amount_full",
    header: "Gross Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    sortKey: "gross_amount",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "number",
    editField: "gross_amount",
    editValidation: { min: 0 },
    render: (payment) => (
      <span className="font-medium tabular-nums">{formatCurrency(payment.gross_amount)}</span>
    ),
  },
  {
    key: "tds_amount",
    header: "TDS Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.tds_amount > 0 ? (
      <span className="tabular-nums">{formatCurrency(payment.tds_amount)}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "net_amount",
    header: "Net Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
    render: (payment) => (
      <span className="font-medium tabular-nums">{formatCurrency(payment.net_amount)}</span>
    ),
  },
  {
    key: "payment_mode",
    header: "Payment Mode",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.payment_mode ? (
      <TableBadge variant="muted">{payment.payment_mode.replace(/_/g, " ")}</TableBadge>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "warranty_months",
    header: "Warranty (Months)",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.warranty_months > 0 ? (
      <span className="tabular-nums">{payment.warranty_months}</span>
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
    render: (payment) => formatDate(payment.created_at),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  EXPENSE_CATEGORY_FILTER,
  {
    id: "provider_id",
    label: "Provider",
    type: "select",
    placeholder: "All Providers",
  },
  {
    id: "tds_applicable",
    label: "TDS",
    type: "select",
    placeholder: "All",
    options: [
      { value: "true", label: "With TDS" },
      { value: "false", label: "Without TDS" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "category.name", label: "Category" },
  { value: "provider_name", label: "Provider" },
  { value: "payment_mode", label: "Payment Mode" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "description",
    header: "Description",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "net_amount",
    header: "Net Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "service_date",
    header: "Service Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "tds_applicable",
    header: "TDS Applicable",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "warranty_months",
    header: "Warranty (Months)",
    filterType: "number",
    filterOperators: ["eq", "gt", "gte", "lt", "lte"],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Services", icon: Hammer, format: "number" }),
  createSumMetric("net_amount", "total_amount", "Total Amount", IndianRupee),
  createSumMetric("tds_amount", "tds_deducted", "TDS Deducted", FileText),
  {
    id: "with_warranty",
    label: "With Warranty",
    icon: Shield,
    compute: (_items, _total, serverData) => serverData?.with_warranty ?? 0,
    format: "number",
    serverFilter: { column: "warranty_months", operator: "gt", value: 0 },
  },
]

// ============================================
// Page Component
// ============================================

export default function ServicePaymentsPage() {
  return (
    <ListPageTemplate
      tableKey="service-payments"
      title="Service Payments"
      description="Track maintenance, repairs, and service expenses"
      icon={Hammer}
      permission="expenses.view"
      feature="expenses"
      config={SERVICE_PAYMENT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search service, provider..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/expenses/services/new"
      createLabel="Add Service"
      createPermission="expenses.create"
      detailHref={(payment) => `/expenses/services/${payment.id}`}
      emptyTitle="No service payments found"
      emptyDescription="Start tracking your maintenance and repair expenses"
    />
  )
}
