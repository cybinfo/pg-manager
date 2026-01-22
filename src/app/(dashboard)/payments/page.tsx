/**
 * Payments List Page (Refactored)
 *
 * BEFORE: 435 lines of code
 * AFTER: ~140 lines of code (68% reduction)
 */

"use client"

import { CreditCard, IndianRupee, Receipt, Wallet, Banknote, Bell } from "lucide-react"
import Link from "next/link"
import { Column, TableBadge } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PAYMENT_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { WhatsAppIconButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"
import { formatCurrency, formatDate } from "@/lib/format"

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
  notes: string | null
  created_at: string
  tenant: { id: string; name: string; phone: string }
  property: { id: string; name: string }
  charge_type: { id: string; name: string } | null
  payment_month?: string
  payment_year?: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  cheque: "Cheque",
  card: "Card",
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
    render: (payment) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">
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
  {
    key: "amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (payment) => (
      <span className="font-semibold text-emerald-600 tabular-nums">
        {formatCurrency(Number(payment.amount))}
      </span>
    ),
  },
  {
    key: "payment_method",
    header: "Method",
    width: "badge",
    hideOnMobile: true,
    sortable: true,
    render: (payment) => (
      <TableBadge variant="default">
        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
      </TableBadge>
    ),
  },
  {
    key: "payment_date",
    header: "Date",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (payment) => formatDate(payment.payment_date),
  },
  {
    key: "actions",
    header: "",
    width: "iconAction",
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
    id: "payment_method",
    label: "Method",
    type: "select",
    placeholder: "All Methods",
    options: [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "cheque", label: "Cheque" },
      { value: "card", label: "Card" },
    ],
  },
  {
    id: "payment_date",
    label: "Date",
    type: "date-range",
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Payment>[] = [
  {
    id: "this_month",
    label: "This Month",
    icon: IndianRupee,
    compute: (items) => {
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthPayments = items.filter((p) => new Date(p.payment_date) >= firstOfMonth)
      return formatCurrency(thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0))
    },
  },
  {
    id: "all_time",
    label: "All Time",
    icon: Wallet,
    compute: (items) => formatCurrency(items.reduce((sum, p) => sum + Number(p.amount), 0)),
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "top_method",
    label: "Top Method",
    icon: Banknote,
    compute: (items) => {
      const methodCounts = items.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]
      return topMethod ? paymentMethodLabels[topMethod[0]] || topMethod[0] : "—"
    },
  },
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
      createHref="/payments/new"
      createLabel="Record Payment"
      createPermission="payments.create"
      detailHref={(payment) => `/payments/${payment.id}`}
      emptyTitle="No payments found"
      emptyDescription="Start recording payments from your tenants"
      headerActions={
        <Link href="/payments/reminders">
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Reminders
          </Button>
        </Link>
      }
    />
  )
}
