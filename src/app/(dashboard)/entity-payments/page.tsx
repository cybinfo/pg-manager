/**
 * Library Payments List Page
 *
 * Displays all library payments with member info.
 */

"use client"

import { CreditCard, Users, Calendar, Receipt } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { statusColumn, dateColumn, personNameWithAvatarColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, createTodayCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_PAYMENT_METHOD_FILTER, LIBRARY_PAYMENT_TYPE_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { formatDate, formatCurrency } from "@/lib/format"
import { getTodayISO } from "@/lib/date-helpers"
import { Currency } from "@/components/ui/currency"
import { LIBRARY_PAYMENT_TYPE_CONFIG, LIBRARY_PAYMENT_METHOD_CONFIG, LIBRARY_PAYMENT_STATUS_CONFIG } from "@/types/library.types"
import { LIBRARY_PAYMENT_STATUS_OPTIONS } from "@/lib/status"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn, numberFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn } from "@/lib/export-columns"

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
  personNameWithAvatarColumn("Member", {
    key: "member",
    nameField: "member.name",
    personNameField: "member.person.name",
    photoField: "member.person.photo_url",
    subtitleField: "member.member_code",
    sortable: false,
  }),
  {
    key: "receipt_number",
    header: "Receipt",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
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
    defaultVisible: false,
    render: (payment) => {
      const config = LIBRARY_PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof LIBRARY_PAYMENT_TYPE_CONFIG]
      return (
        <TableBadge
          variant={
            payment.payment_type === "subscription" ? "info" :
            payment.payment_type === "locker_deposit" ? "warning" :
            payment.payment_type === "locker_rent" ? "default" : "muted"
          }
          className={payment.payment_type === "locker_rent" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : undefined}
        >
          {config?.label || payment.payment_type}
        </TableBadge>
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
  dateColumn("payment_date", "Payment Date"),
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
  LIBRARY_PAYMENT_TYPE_FILTER,
  LIBRARY_PAYMENT_METHOD_FILTER,
  createStatusFilter(LIBRARY_PAYMENT_STATUS_OPTIONS),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("member.name", "Member Name"),
  textFilterColumn("member.phone", "Member Phone"),
  textFilterColumn("member.member_code", "Member Code"),
  numberFilterColumn("amount", "Amount"),
  selectFilterColumn("payment_method", "Payment Method", LIBRARY_PAYMENT_METHOD_FILTER.options!),
  selectFilterColumn("payment_type", "Payment Type", LIBRARY_PAYMENT_TYPE_FILTER.options!),
  statusFilterColumn(LIBRARY_PAYMENT_STATUS_OPTIONS),
  dateFilterColumn("payment_date", "Payment Date"),
  textFilterColumn("receipt_number", "Receipt Number"),
  textFilterColumn("payment_reference", "Reference", ["contains", "eq", "is_null", "is_not_null"]),
  dateFilterColumn("created_at", "Recorded On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Payments", icon: Receipt }),
  createSumMetric("amount", "total_amount", "Total Amount", CreditCard),
  createStatusMetric("subscription", "Subscriptions", Users, { id: "subscriptions", column: "payment_type" }),
  createTodayCountMetric("payment_date", "Today", Calendar),
  {
    id: "today_amount",
    label: "Today's Collection",
    icon: CreditCard,
    compute: (items) => {
      const today = getTodayISO()
      const sum = items
        .filter((p) => p.payment_date === today && p.status === "completed")
        .reduce((sum: number, p) => sum + (Number(p.amount) || 0), 0)
      return formatCurrency(sum)
    },
  },
]

// ============================================
// Export Columns
// ============================================

const PAYMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(LIBRARY_PAYMENT_TYPE_CONFIG).map(([k, v]) => [k, v.label])
)
const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(LIBRARY_PAYMENT_METHOD_CONFIG).map(([k, v]) => [k, v.label])
)

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  nestedColumn("member_name", "Member Name", "member.person.name", (val, row) => {
    return String(val || (row.member as Record<string, unknown>)?.name || "")
  }),
  currencyExportColumn("amount", "Amount"),
  { key: "payment_method" as keyof Record<string, unknown>, header: "Method", format: (v) => PAYMENT_METHOD_LABELS[String(v)] || String(v ?? "") },
  { key: "payment_type" as keyof Record<string, unknown>, header: "Type", format: (v) => PAYMENT_TYPE_LABELS[String(v)] || String(v ?? "") },
  dateExportColumn("payment_date", "Date"),
  { key: "receipt_number" as keyof Record<string, unknown>, header: "Receipt Number", format: (v) => String(v ?? "") },
  { key: "status" as keyof Record<string, unknown>, header: "Status", format: (v) => String(v ?? "") },
]

// ============================================
// Page Component
// ============================================

export default function LibraryPaymentsPage() {
  return (
    <ListPageTemplate
      tableKey="entity-payments"
      title="Library Payments"
      description="Track subscription and locker payments"
      icon={CreditCard}
      permission="entity_payments.view"
      module="payments"
      config={LIBRARY_PAYMENT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by receipt number, member..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
exportColumns={exportColumns}
      exportFilename="entity-payments"
      createHref="/entity-payments/new"
      createLabel="Record Payment"
      createPermission="entity_payments.create"
      detailHref={(payment) => `/entity-payments/${payment.id}`}
      emptyTitle="No payments recorded"
      emptyDescription="Record payments when members pay for subscriptions or lockers"
    />
  )
}
