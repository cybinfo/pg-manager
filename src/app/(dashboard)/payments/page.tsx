/**
 * Payments List Page (Refactored)
 *
 * BEFORE: 435 lines of code
 * AFTER: ~140 lines of code (68% reduction)
 */

"use client"

import { CreditCard, IndianRupee, Receipt, Wallet, Banknote, Bell, Users, Link2 } from "lucide-react"
import Link from "next/link"
import { Column, TableBadge } from "@/components/ui/data-table"
import { currencyColumn, dateColumn, badgeColumn, phoneColumn } from "@/lib/columns"
import { Button } from "@/components/ui/button"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createSumMetric, createThisMonthSumMetric, createTopValueMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, PAYMENT_METHOD_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { PermissionGate } from "@/components/auth"
import { WhatsAppIconButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"
import { PAYMENT_METHODS } from "@/lib/status-config"
import { textFilterColumn, selectFilterColumn, numberFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import { NullDisplay } from "@/components/ui/null-display"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn, labelMapColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  reference_number: string | null
  receipt_number: string | null
  transaction_reference: string | null
  notes: string | null
  created_at: string
  tenant: { id: string; name: string; phone: string; email?: string }
  property: { id: string; name: string }
  bill: { id: string; bill_number: string } | null
  charge_type: { id: string; name: string } | null
  payment_month?: string
  payment_year?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Payment>[] = [
  {
    key: "tenant",
    header: "Tenant",
    width: "primary",
    sortable: true,
    sortKey: "tenant.name",
    canHide: false,
    render: (payment) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold shrink-0">
          ₹
        </div>
        <div className="min-w-0">
          <div><TenantLink id={payment.tenant.id} name={payment.tenant.name} /></div>
          {payment.property && (
            <div><PropertyLink id={payment.property.id} name={payment.property.name} size="sm" /></div>
          )}
        </div>
      </div>
    ),
  },
  currencyColumn("amount", "Amount", { color: "text-success", bold: true }),
  badgeColumn("payment_method", "Method", PAYMENT_METHODS, { hideOnMobile: true }),
  dateColumn("payment_date", "Date"),
  {
    key: "actions",
    header: "",
    width: "iconAction",
    canHide: false,
    render: (payment) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <WhatsAppIconButton
          phone={payment.tenant.phone}
          message={messageTemplates.simpleReceipt({
            tenantName: payment.tenant.name,
            amount: Number(payment.amount),
            receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
          })}
        />
      </div>
    ),
  },
  // Hidden by default columns
  {
    key: "receipt_number",
    header: "Receipt #",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.receipt_number || <NullDisplay />,
  },
  {
    key: "reference_number",
    header: "Reference #",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.reference_number || payment.transaction_reference || <NullDisplay />,
  },
  {
    key: "for_period",
    header: "For Period",
    width: "tertiary",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.for_period || <NullDisplay />,
  },
  {
    key: "bill",
    header: "Bill",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.bill ? (
      <span className="text-info">{payment.bill.bill_number}</span>
    ) : <NullDisplay />,
  },
  {
    key: "reconciliation_status",
    header: "Reconciled",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.bill ? (
      <TableBadge variant="success">Reconciled</TableBadge>
    ) : (
      <TableBadge variant="warning">Unreconciled</TableBadge>
    ),
  },
  {
    key: "charge_type",
    header: "Charge Type",
    width: "secondary",
    sortable: true,
    sortKey: "charge_type.name",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.charge_type?.name || <NullDisplay />,
  },
  phoneColumn("tenant.phone", "Phone", { defaultVisible: false }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (payment) => payment.notes ? (
      <span className="truncate max-w-[150px]" title={payment.notes}>{payment.notes}</span>
    ) : <NullDisplay />,
  },
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  PAYMENT_METHOD_FILTER,
  createDateRangeFilter("payment_date", "Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "payment_method", label: "Method" },
  { value: "for_period", label: "Period" },
  { value: "payment_month", label: "Month" },
  { value: "payment_year", label: "Year" },
  { value: "charge_type.name", label: "Charge Type" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  numberFilterColumn("amount", "Amount"),
  selectFilterColumn("payment_method", "Payment Method", PAYMENT_METHOD_FILTER.options!, ["eq", "neq", "in", "not_in"]),
  dateFilterColumn("payment_date", "Payment Date"),
  textFilterColumn("reference_number", "Reference Number"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createThisMonthSumMetric("amount", "payment_date", "This Month", IndianRupee),
  createSumMetric("amount", "all_time", "All Time", Wallet),
  createTotalMetric({ id: "transactions", label: "Transactions", icon: Receipt }),
  createTopValueMetric("payment_method", "top_method", "Top Method", Banknote, {
    labelMap: PAYMENT_METHODS,
  }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  nestedColumn("tenant_name", "Tenant Name", "tenant.name"),
  currencyExportColumn("amount", "Amount"),
  labelMapColumn("payment_method", "Method", PAYMENT_METHODS),
  dateExportColumn("payment_date", "Date"),
  nestedColumn("bill_number", "Bill Number", "bill.bill_number"),
  { key: "receipt_number" as keyof Record<string, unknown>, header: "Receipt #", format: (v) => String(v ?? "") },
]

// ============================================
// Page Component
// ============================================

export default function PaymentsPage() {
  return (
    <ListPageTemplate
      tableKey="payments"
      title="Payments"
      description="Track and manage all tenant payments"
      icon={CreditCard}
      permission="payments.view"
      config={PAYMENT_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by tenant, receipt #..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
exportColumns={exportColumns}
      exportFilename="payments"
      createHref="/payments/new"
      createLabel="Record Payment"
      createPermission="payments.create"
      detailHref={(payment) => `/payments/${payment.id}`}
      emptyTitle="No payments found"
      emptyDescription="Start recording payments from your tenants"
      headerActions={
        <div className="flex items-center gap-2">
          <PermissionGate permission="payments.edit" hide>
            <Link href="/payments/reconcile">
              <Button variant="outline" size="sm">
                <Link2 className="mr-2 h-4 w-4" />
                Reconcile
              </Button>
            </Link>
          </PermissionGate>
          <PermissionGate permission="payments.create" hide>
            <Link href="/payments/bulk">
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Bulk Payment
              </Button>
            </Link>
          </PermissionGate>
          <Link href="/payments/reminders">
            <Button variant="outline" size="sm">
              <Bell className="mr-2 h-4 w-4" />
              Reminders
            </Button>
          </Link>
        </div>
      }
    />
  )
}
