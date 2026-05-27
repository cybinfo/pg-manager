/**
 * Bills List Page (Refactored)
 *
 * BEFORE: 420 lines of code
 * AFTER: ~130 lines of code (69% reduction)
 */

"use client"

import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { Column } from "@/components/ui/data-table"
import { statusColumn, currencyColumn, dateColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BILL_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { BILL_STATUS } from "@/lib/status"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { BILL_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency } from "@/lib/format"
import { textFilterColumn, statusFilterColumn, numberFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn, nestedColumn } from "@/lib/export-columns"

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
  // Hidden by default columns
  currencyColumn("paid_amount", "Paid Amount", { defaultVisible: false, color: "text-success", bold: false }),
  currencyColumn("balance_due", "Balance Due", { defaultVisible: false, color: "text-destructive", bold: false }),
  dateColumn("bill_date", "Bill Date", { defaultVisible: false }),
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
    editable: true,
    editType: "text",
    render: (bill) => bill.notes ? (
      <span className="truncate max-w-[150px]" title={bill.notes}>{bill.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Created", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]),
  createDateRangeFilter("bill_date", "Bill Date"),
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
  textFilterColumn("bill_number", "Bill Number"),
  statusFilterColumn([
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]),
  numberFilterColumn("total_amount", "Total Amount"),
  numberFilterColumn("balance_due", "Balance Due"),
  dateFilterColumn("bill_date", "Bill Date"),
  dateFilterColumn("due_date", "Due Date"),
]

// ============================================
// Metrics Configuration
// ============================================

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

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "bill_number", header: "Bill Number" },
  nestedColumn("tenant_name", "Tenant", "tenant.name"),
  nestedColumn("property_name", "Property", "property.name"),
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
      headerActions={
        <HelpTooltip
          content="Bills are auto-generated monthly via cron. You can also create them manually."
          side="bottom"
        />
      }
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="bills"
      createHref="/bills/new"
      createLabel="Generate Bill"
      createPermission="bills.create"
      detailHref={(bill) => `/bills/${bill.id}`}
      emptyTitle="No bills found"
      emptyDescription="Generate your first bill to get started"
    />
  )
}
