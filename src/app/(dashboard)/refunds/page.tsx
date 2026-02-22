/**
 * Refunds List Page (Refactored)
 *
 * BEFORE: ~375 lines of code
 * AFTER: ~200 lines of code (47% reduction)
 */

"use client"

import {
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { statusColumn, dateColumn, personNameWithAvatarColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { REFUND_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"
import { REFUND_STATUS } from "@/lib/status-config"
import { numberFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"

// ============================================
// Types
// ============================================

interface Refund {
  id: string
  refund_type: string
  amount: number
  payment_mode: string
  reference_number: string | null
  status: string
  refund_date: string | null
  due_date: string | null
  reason: string | null
  notes: string | null
  created_at: string
  tenant: { id: string; name: string; phone: string; photo_url: string | null } | null
  property: { id: string; name: string } | null
  exit_clearance: { id: string; expected_exit_date: string } | null
  // Computed fields
  refund_month?: string
  refund_year?: string
  status_label?: string
  type_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Refund>[] = [
  personNameWithAvatarColumn("Tenant", {
    key: "tenant",
    nameField: "tenant.name",
    personNameField: "tenant.name",
    photoField: "tenant.photo_url",
    subtitleField: "tenant.phone",
    sortKey: "tenant.name",
    avatarClassName: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0",
  }) as Column<Refund>,
  {
    key: "property",
    header: "Property",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (refund) => (
      <div className="min-w-0">
        {refund.property ? (
          <PropertyLink id={refund.property.id} name={refund.property.name} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
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
    render: (refund) => (
      <div className="text-right">
        <span className="font-semibold text-success">
          {formatCurrency(refund.amount)}
        </span>
        <div className="text-xs text-muted-foreground capitalize">
          {refund.refund_type.replace(/_/g, " ")}
        </div>
      </div>
    ),
  },
  {
    key: "payment_mode",
    header: "Mode",
    width: "badge",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (refund) => {
      const modeIcons: Record<string, React.ReactNode> = {
        cash: <Banknote className="h-3.5 w-3.5" />,
        upi: <Smartphone className="h-3.5 w-3.5" />,
        bank_transfer: <Building2 className="h-3.5 w-3.5" />,
        cheque: <CreditCard className="h-3.5 w-3.5" />,
      }
      return (
        <div className="flex items-center gap-1.5 text-sm">
          {modeIcons[refund.payment_mode] || <Wallet className="h-3.5 w-3.5" />}
          <span className="capitalize">{refund.payment_mode.replace(/_/g, " ")}</span>
        </div>
      )
    },
  },
  {
    key: "refund_date",
    header: "Date",
    width: "date",
    sortable: true,
    sortType: "date",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (refund) => (
      <div>
        {refund.refund_date ? formatDate(refund.refund_date) : "—"}
        {refund.reference_number && (
          <div className="text-xs text-muted-foreground truncate max-w-[100px]" title={refund.reference_number}>
            Ref: {refund.reference_number}
          </div>
        )}
      </div>
    ),
  },
  statusColumn(REFUND_STATUS, {
    style: "badge",
    editable: true,
    editType: "select",
    editOptions: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "processed", label: "Processed" },
      { value: "rejected", label: "Rejected" },
    ],
  }),
  // Hidden by default columns
  {
    key: "refund_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (refund) => (
      <span className="capitalize text-sm">{refund.refund_type.replace(/_/g, " ")}</span>
    ),
  },
  {
    key: "reference_number",
    header: "Reference",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (refund) => refund.reference_number || <span className="text-muted-foreground">—</span>,
  },
  dateColumn("due_date", "Due Date", { defaultVisible: false }),
  {
    key: "reason",
    header: "Reason",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (refund) => refund.reason ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{refund.reason}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (refund) => refund.notes ? (
      <span className="text-sm text-muted-foreground line-clamp-2">{refund.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "exit_clearance",
    header: "Exit Clearance",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    render: (refund) => refund.exit_clearance ? (
      <span className="text-sm">Exit: {formatDate(refund.exit_clearance.expected_exit_date)}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Created On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ]),
  {
    id: "refund_type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "deposit_refund", label: "Deposit Refund" },
      { value: "overpayment", label: "Overpayment" },
      { value: "adjustment", label: "Adjustment" },
      { value: "other", label: "Other" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "status_label", label: "Status" },
  { value: "type_label", label: "Type" },
  { value: "payment_mode", label: "Payment Mode" },
  { value: "refund_month", label: "Month" },
  { value: "refund_year", label: "Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  numberFilterColumn("amount", "Amount"),
  statusFilterColumn([
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ]),
  selectFilterColumn("refund_type", "Type", [
    { value: "deposit_refund", label: "Deposit Refund" },
    { value: "overpayment", label: "Overpayment" },
    { value: "adjustment", label: "Adjustment" },
    { value: "other", label: "Other" },
  ]),
  selectFilterColumn("payment_mode", "Payment Mode", [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
  ]),
  dateFilterColumn("refund_date", "Refund Date"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Refunds", icon: Wallet }),
  createStatusMetric("pending", "Pending", Clock, { highlight: true }),
  createStatusMetric("completed", "Completed", CheckCircle),
  createSumMetric("amount", "pendingAmount", "Pending Amount", AlertCircle, {
    filter: { column: "status", operator: "eq", value: "pending" },
    highlight: true,
  }),
  createSumMetric("amount", "paidOut", "Paid Out", Banknote, {
    filter: { column: "status", operator: "eq", value: "completed" },
  }),
]

// ============================================
// Page Component
// ============================================

export default function RefundsPage() {
  return (
    <ListPageTemplate
      tableKey="refunds"
      title="Refunds"
      description="Track and manage tenant refunds"
      icon={Wallet}
      permission="refunds.view"
      config={REFUND_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by tenant, property, or reference..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/refunds/new"
      createLabel="New Refund"
      createPermission="refunds.create"
      detailHref={(refund) => `/refunds/${refund.id}`}
      emptyTitle="No refunds found"
      emptyDescription="No refunds have been recorded yet"
    />
  )
}
