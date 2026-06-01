"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CreditCard, IndianRupee, Wallet, Receipt, Banknote, ArrowLeft } from "lucide-react"
import { NotFoundState } from "@/components/ui"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PAYMENT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createSumMetric, createTotalMetric, createThisMonthSumMetric, createTopValueMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PAYMENT_METHOD_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { currencyColumn, dateColumn, badgeColumn } from "@/lib/columns"
import { PAYMENT_METHODS } from "@/lib/status-config"
import { numberFilterColumn, selectFilterColumn, dateFilterColumn, textFilterColumn } from "@/lib/advanced-filter-builders"
import { NullDisplay } from "@/components/ui/null-display"
import { WhatsAppIconButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn, labelMapColumn, nestedColumn } from "@/lib/export-columns"
import { transformJoin } from "@/lib/supabase/transforms"
import { logger } from "@/lib/logger"
import { formatCurrency } from "@/lib/format"

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

interface Tenant {
  id: string
  name: string
  property: { name: string } | null
  room: { room_number: string } | null
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Payment>[] = [
  {
    key: "amount",
    header: "Amount",
    width: "primary",
    sortable: true,
    sortType: "number",
    canHide: false,
    render: (payment) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold shrink-0">
          ₹
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-success tabular-nums">
            {formatCurrency(payment.amount)}
          </div>
          {payment.for_period && (
            <div className="text-xs text-muted-foreground">{payment.for_period}</div>
          )}
        </div>
      </div>
    ),
  },
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
          phone={payment.tenant?.phone}
          message={messageTemplates.simpleReceipt({
            tenantName: payment.tenant?.name,
            amount: Number(payment.amount),
            receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
          })}
        />
      </div>
    ),
  },
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
  PAYMENT_METHOD_FILTER,
  createDateRangeFilter("payment_date", "Date"),
]

const groupByOptions: GroupByOption[] = [
  { value: "payment_method", label: "Method" },
  { value: "for_period", label: "Period" },
  { value: "payment_month", label: "Month" },
  { value: "payment_year", label: "Year" },
]

const advancedFilterColumns: FilterableColumn[] = [
  numberFilterColumn("amount", "Amount"),
  selectFilterColumn("payment_method", "Payment Method", PAYMENT_METHOD_FILTER.options!, ["eq", "neq", "in", "not_in"]),
  dateFilterColumn("payment_date", "Payment Date"),
  textFilterColumn("reference_number", "Reference Number"),
]

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createThisMonthSumMetric("amount", "payment_date", "This Month", IndianRupee),
  createSumMetric("amount", "all_time", "All Time", Wallet),
  createTotalMetric({ id: "transactions", label: "Transactions", icon: Receipt }),
  createTopValueMetric("payment_method", "top_method", "Top Method", Banknote, {
    labelMap: PAYMENT_METHODS,
  }),
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  currencyExportColumn("amount", "Amount"),
  labelMapColumn("payment_method", "Method", PAYMENT_METHODS),
  dateExportColumn("payment_date", "Date"),
  nestedColumn("bill_number", "Bill Number", "bill.bill_number"),
  { key: "receipt_number" as keyof Record<string, unknown>, header: "Receipt #", format: (v) => String(v ?? "") },
]

// ============================================
// Config Factory
// ============================================

// Static parts of PAYMENT_LIST_CONFIG are inherited; only fixedFilters varies per tenantId
const buildPaymentConfig = (tenantId: string) => ({
  ...PAYMENT_LIST_CONFIG,
  fixedFilters: [{ column: "tenant_id", operator: "eq" as const, value: tenantId }],
})

// ============================================
// Page Component
// ============================================

export default function TenantPaymentsPage() {
  const params = useParams()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [parentLoading, setParentLoading] = useState(true)

  useEffect(() => {
    const fetchTenant = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("tenants")
        .select(`id, name, property:entities(name), room:rooms(room_number)`)
        .eq("id", tenantId)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        logger.error("[TenantPaymentsPage] Failed to fetch tenant", { tenantId, error: String(error) })
        setNotFound(true)
      } else {
        const t = data as {
          id: string; name: string;
          property: { name: string }[] | null;
          room: { room_number: string }[] | null
        }
        setTenant({
          id: t.id,
          name: t.name,
          property: transformJoin(t.property),
          room: transformJoin(t.room),
        })
      }
      setParentLoading(false)
    }
    fetchTenant()
  }, [tenantId])

  const config = buildPaymentConfig(tenantId)

  if (notFound) {
    return <NotFoundState title="Tenant not found" backHref="/tenants" backLabel="All Tenants" />
  }

  if (parentLoading) return null

  const tenantName = tenant?.name ?? "..."
  const contextLine = [tenant?.property?.name, tenant?.room ? `Room ${tenant.room.room_number}` : null]
    .filter(Boolean)
    .join(" • ")

  return (
    <ListPageTemplate
      tableKey={`tenant-${tenantId}-payments`}
      title={`Payments from ${tenantName}`}
      description={contextLine || "Tenant payment history"}
      icon={CreditCard}
      permission="payments.view"
      breadcrumbs={[
        { label: "Tenants", href: "/tenants" },
        { label: tenantName, href: `/tenants/${tenantId}` },
        { label: "Payments" },
      ]}
      config={config}
      columns={columns}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableColumnManager={true}
exportColumns={exportColumns}
      exportFilename={`payments-tenant-${tenantId}`}
      createHref={`/payments/new?tenant_id=${tenantId}`}
      createLabel="Record Payment"
      createPermission="payments.create"
      detailHref={(payment) => `/payments/${payment.id}`}
      headerActions={
        <Link href={`/tenants/${tenantId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenant
          </Button>
        </Link>
      }
      emptyTitle="No payments yet"
      emptyDescription={`No payments have been recorded for ${tenantName}.`}
    />
  )
}
