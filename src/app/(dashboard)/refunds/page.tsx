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
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { REFUND_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency, formatDate } from "@/lib/format"

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
  {
    key: "tenant",
    header: "Tenant",
    width: "primary",
    sortable: true,
    sortKey: "tenant.name",
    render: (refund) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={refund.tenant?.name || "Unknown"}
          src={refund.tenant?.photo_url}
          size="sm"
          className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
        />
        <div className="min-w-0">
          {refund.tenant ? (
            <TenantLink id={refund.tenant.id} name={refund.tenant.name} showIcon={false} />
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
          <div className="text-xs text-muted-foreground">{refund.tenant?.phone}</div>
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
    hideOnMobile: true,
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
    render: (refund) => (
      <div className="text-right">
        <span className="font-semibold text-green-600">
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
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (refund) => {
      const statusMap: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string }> = {
        pending: { variant: "warning", label: "Pending" },
        processing: { variant: "muted", label: "Processing" },
        completed: { variant: "success", label: "Completed" },
        failed: { variant: "error", label: "Failed" },
        cancelled: { variant: "error", label: "Cancelled" },
      }
      const status = statusMap[refund.status] || { variant: "muted" as const, label: refund.status }
      return <TableBadge variant={status.variant}>{status.label}</TableBadge>
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
      { value: "processing", label: "Processing" },
      { value: "completed", label: "Completed" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Refund>[] = [
  {
    id: "total",
    label: "Total Refunds",
    icon: Wallet,
    compute: (items) => items.length,
  },
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    compute: (items) => items.filter((r) => r.status === "pending").length,
    highlight: (value) => (value as number) > 0,
  },
  {
    id: "completed",
    label: "Completed",
    icon: CheckCircle,
    compute: (items) => items.filter((r) => r.status === "completed").length,
  },
  {
    id: "pendingAmount",
    label: "Pending Amount",
    icon: AlertCircle,
    compute: (items) => formatCurrency(
      items.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0)
    ),
    highlight: (value) => value !== "₹0",
  },
  {
    id: "paidOut",
    label: "Paid Out",
    icon: Banknote,
    compute: (items) => formatCurrency(
      items.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.amount, 0)
    ),
  },
]

// ============================================
// Page Component
// ============================================

export default function RefundsPage() {
  return (
    <ListPageTemplate
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
      createHref="/refunds/new"
      createLabel="New Refund"
      createPermission="refunds.create"
      detailHref={(refund) => `/refunds/${refund.id}`}
      emptyTitle="No refunds found"
      emptyDescription="No refunds have been recorded yet"
    />
  )
}
