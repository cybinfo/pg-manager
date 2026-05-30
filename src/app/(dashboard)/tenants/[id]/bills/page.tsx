"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Receipt, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BILL_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { statusColumn, currencyColumn, dateColumn } from "@/lib/columns"
import { BILL_STATUS } from "@/lib/status"
import { createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { BILL_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, numberFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import { Column } from "@/components/ui/data-table"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink } from "@/components/ui/entity-link"
import { formatCurrency } from "@/lib/format"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"
import { transformJoin } from "@/lib/supabase/transforms"
import { logger } from "@/lib/logger"

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
  tenant: { id: string; name: string; phone: string } | null
  bill_month?: string
  bill_year?: string
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

const columns: Column<Bill>[] = [
  {
    key: "bill_number",
    header: "Bill",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (bill) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-info" />
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
          <div className="text-xs text-destructive">Due: {formatCurrency(bill.balance_due)}</div>
        )}
      </div>
    ),
  },
  dateColumn("due_date", "Due", { hideOnMobile: true }),
  statusColumn(BILL_STATUS, {
    editable: true,
    editType: "select",
    editOptions: BILL_STATUS_OPTIONS,
  }),
  currencyColumn("paid_amount", "Paid Amount", { defaultVisible: false, color: "text-success", bold: false }),
  currencyColumn("balance_due", "Balance Due", { defaultVisible: false, color: "text-destructive", bold: false }),
  dateColumn("bill_date", "Bill Date", { defaultVisible: false }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (bill) => bill.notes ? (
      <span className="truncate max-w-[150px]" title={bill.notes}>{bill.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Created", { defaultVisible: false }),
]

const filters: FilterConfig[] = [
  createStatusFilter(BILL_STATUS_OPTIONS),
  createDateRangeFilter("bill_date", "Bill Date"),
]

const groupByOptions: GroupByOption[] = [
  { value: "status", label: "Status" },
  { value: "for_month", label: "Period" },
  { value: "bill_month", label: "Bill Month" },
]

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("bill_number", "Bill Number"),
  statusFilterColumn(BILL_STATUS_OPTIONS),
  numberFilterColumn("total_amount", "Total Amount"),
  numberFilterColumn("balance_due", "Balance Due"),
  dateFilterColumn("bill_date", "Bill Date"),
  dateFilterColumn("due_date", "Due Date"),
]

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createSumMetric("total_amount", "total", "Total Billed", FileText),
  createSumMetric("paid_amount", "collected", "Collected", CheckCircle),
  createSumMetric("balance_due", "pending", "Pending", Clock, {
    filter: { column: "status", operator: "in", value: ["pending", "partial"] },
    highlight: true,
  }),
  createSumMetric("balance_due", "overdue", "Overdue", AlertCircle, {
    filter: { column: "status", operator: "eq", value: "overdue" },
    highlight: true,
  }),
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "bill_number", header: "Bill Number" },
  { key: "for_month", header: "Period", format: (v) => String(v ?? "") },
  currencyExportColumn("total_amount", "Total Amount"),
  currencyExportColumn("paid_amount", "Paid Amount"),
  currencyExportColumn("balance_due", "Balance Due"),
  dateExportColumn("due_date", "Due Date"),
  dateExportColumn("bill_date", "Bill Date"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Created On"),
]

// ============================================
// Config Factory
// ============================================

// Static parts of BILL_LIST_CONFIG are inherited; only fixedFilters varies per tenantId
const buildBillConfig = (tenantId: string) => ({
  ...BILL_LIST_CONFIG,
  fixedFilters: [{ column: "tenant_id", operator: "eq" as const, value: tenantId }],
})

// ============================================
// Page Component
// ============================================

export default function TenantBillsPage() {
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
        .select(`id, name, property:properties(name), room:rooms(room_number)`)
        .eq("id", tenantId)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        logger.error("[TenantBillsPage] Failed to fetch tenant", { tenantId, error: String(error) })
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

  const config = buildBillConfig(tenantId)

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )
  }

  // Wait for parent context before rendering the template so breadcrumbs/title are correct
  if (parentLoading) return null

  const tenantName = tenant?.name ?? "..."
  const contextLine = [tenant?.property?.name, tenant?.room ? `Room ${tenant.room.room_number}` : null]
    .filter(Boolean)
    .join(" • ")

  return (
    <ListPageTemplate
      tableKey={`tenant-${tenantId}-bills`}
      title={`Bills for ${tenantName}`}
      description={contextLine || "Tenant billing history"}
      icon={Receipt}
      permission="bills.view"
      breadcrumbs={[
        { label: "Tenants", href: "/tenants" },
        { label: tenantName, href: `/tenants/${tenantId}` },
        { label: "Bills" },
      ]}
      config={config}
      columns={columns}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableColumnManager={true}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename={`bills-tenant-${tenantId}`}
      createHref={`/bills/new?tenant_id=${tenantId}`}
      createLabel="Generate Bill"
      createPermission="bills.create"
      detailHref={(bill) => `/bills/${bill.id}`}
      headerActions={
        <Link href={`/tenants/${tenantId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenant
          </Button>
        </Link>
      }
      emptyTitle="No bills yet"
      emptyDescription={`No bills have been generated for ${tenantName}.`}
    />
  )
}
