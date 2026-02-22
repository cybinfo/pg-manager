/**
 * Library Payments List Page
 *
 * Displays all library payments with member info.
 */

"use client"

import { CreditCard, Users, Calendar, Receipt } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { statusColumn, dateColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_PAYMENT_METHOD_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { formatDate } from "@/lib/format"
import { Currency } from "@/components/ui/currency"
import { Avatar } from "@/components/ui/avatar"
import { LIBRARY_PAYMENT_TYPE_CONFIG, LIBRARY_PAYMENT_METHOD_CONFIG, LIBRARY_PAYMENT_STATUS_CONFIG } from "@/types/library.types"

// ============================================
// Types
// ============================================

interface PaymentItem {
  id: string
  receipt_number: string | null
  payment_date: string
  amount: number
  payment_type: string
  payment_method: string
  payment_reference: string | null
  notes: string | null
  status: string
  created_at: string
  member?: {
    id: string
    name: string
    member_code: string | null
    person?: { id: string; name?: string; photo_url?: string } | null
  } | null
  // Computed
  display_name?: string
  type_label?: string
  method_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<PaymentItem>[] = [
  {
    key: "member",
    header: "Member",
    width: "primary",
    sortable: false,
    canHide: false,
    render: (payment) => {
      const displayName = payment.member?.person?.name || payment.member?.name || "Unknown"
      const photoUrl = payment.member?.person?.photo_url
      return (
        <div className="flex items-center gap-3">
          <Avatar name={displayName} src={photoUrl} size="sm" />
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {payment.member?.member_code || "—"}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "receipt_number",
    header: "Receipt",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) => (
      <div>
        <div className="font-mono text-sm">{payment.receipt_number || "—"}</div>
        <div className="text-xs text-muted-foreground">
          {formatDate(payment.payment_date)}
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
    canHide: true,
    defaultVisible: true,
    render: (payment) => (
      <span className="font-semibold text-success">
        +<Currency amount={payment.amount} />
      </span>
    ),
  },
  {
    key: "payment_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) => {
      const config = LIBRARY_PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof LIBRARY_PAYMENT_TYPE_CONFIG]
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          payment.payment_type === "subscription" ? "bg-info/10 text-info" :
          payment.payment_type === "locker_rent" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
          payment.payment_type === "locker_deposit" ? "bg-warning/10 text-warning" :
          "bg-muted text-muted-foreground"
        }`}>
          {config?.label || payment.payment_type}
        </span>
      )
    },
  },
  {
    key: "payment_method",
    header: "Method",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (payment) => {
      const config = LIBRARY_PAYMENT_METHOD_CONFIG[payment.payment_method as keyof typeof LIBRARY_PAYMENT_METHOD_CONFIG]
      return config?.label || payment.payment_method
    },
  },
  statusColumn(LIBRARY_PAYMENT_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  // Hidden by default
  {
    key: "payment_reference",
    header: "Reference",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.payment_reference || "—",
  },
  {
    key: "notes",
    header: "Notes",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.notes ? (
      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
        {payment.notes}
      </span>
    ) : "—",
  },
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "member_id",
    label: "Member",
    type: "select",
    placeholder: "All Members",
  },
  {
    id: "payment_type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: [
      { value: "subscription", label: "Subscription" },
      { value: "locker_rent", label: "Locker Rent" },
      { value: "locker_deposit", label: "Locker Deposit" },
      { value: "fine", label: "Fine" },
      { value: "other", label: "Other" },
    ],
  },
  LIBRARY_PAYMENT_METHOD_FILTER,
  createStatusFilter([
    { value: "completed", label: "Completed" },
    { value: "pending", label: "Pending" },
    { value: "refunded", label: "Refunded" },
  ]),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "payment_type", label: "Type" },
  { value: "payment_method", label: "Method" },
  { value: "status", label: "Status" },
  { value: "payment_date", label: "Date" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Payments", icon: Receipt }),
  {
    id: "total_amount",
    label: "Total Amount",
    icon: CreditCard,
    compute: (items) => {
      const total = items.reduce((sum: number, p) => sum + (Number(p.amount) || 0), 0)
      return `\u20B9${total.toLocaleString("en-IN")}`
    },
  },
  createStatusMetric("subscription", "Subscriptions", Users, { id: "subscriptions", column: "payment_type" }),
  {
    // Custom: dynamic date comparison with "today"
    id: "today",
    label: "Today",
    icon: Calendar,
    compute: (items) => {
      const today = new Date().toISOString().split("T")[0]
      return items.filter((p) => p.payment_date === today).length
    },
  },
]

// ============================================
// Page Component
// ============================================

export default function LibraryPaymentsPage() {
  return (
    <ListPageTemplate
      tableKey="library-payments"
      title="Library Payments"
      description="Track subscription and locker payments"
      icon={CreditCard}
      permission="library_payments.view"
      feature="library"
      config={LIBRARY_PAYMENT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by receipt number, member..."
      enableColumnManager={true}
      createHref="/library-payments/new"
      createLabel="Record Payment"
      createPermission="library_payments.create"
      detailHref={(payment) => `/library-payments/${payment.id}`}
      emptyTitle="No payments recorded"
      emptyDescription="Record payments when members pay for subscriptions or lockers"
    />
  )
}
