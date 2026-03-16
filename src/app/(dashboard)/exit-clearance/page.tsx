/**
 * Exit Clearance List Page (Refactored)
 *
 * BEFORE: 567 lines of code
 * AFTER: ~200 lines of code (65% reduction)
 *
 * Note: This page has custom "Tenants on Notice" alert that requires
 * additional data fetching beyond the template.
 */

"use client"

import { LogOut, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { dateColumn, currencyColumn, personNameWithAvatarColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { EXIT_CLEARANCE_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, EXIT_CLEARANCE_STATUS_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { EXIT_CLEARANCE_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { formatCurrency } from "@/lib/format"
import { EXIT_CLEARANCE_STATUS } from "@/lib/status-config"
import { TenantsOnNoticeAlert } from "./_components/TenantsOnNoticeAlert"
import { brandGradient } from "@/lib/design-tokens"

// ============================================
// Types
// ============================================

interface ExitClearance {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  key_returned: boolean
  created_at: string
  tenant: { id: string; name: string; phone: string; photo_url: string | null; profile_photo: string | null }
  property: { id: string; name: string }
  room: { id: string; room_number: string }
  exit_month?: string
  exit_year?: string
  inspection_label?: string
  key_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<ExitClearance>[] = [
  personNameWithAvatarColumn("Tenant", {
    key: "tenant",
    nameField: "tenant.name",
    personNameField: "tenant.name",
    photoField: "tenant.profile_photo",
    subtitleField: "tenant.phone",
    sortKey: "tenant.name",
    avatarClassName: `${brandGradient.solid} text-white shrink-0`,
  }),
  {
    key: "property",
    header: "Property",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    render: (clearance) => (
      <div className="min-w-0 space-y-0.5">
        {clearance.property && (
          <PropertyLink id={clearance.property.id} name={clearance.property.name} size="sm" />
        )}
        {clearance.room && (
          <div>
            <RoomLink id={clearance.room.id} roomNumber={clearance.room.room_number} size="sm" />
          </div>
        )}
      </div>
    ),
  },
  dateColumn("expected_exit_date", "Exit Date"),
  {
    key: "final_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (clearance) => {
      const isRefund = clearance.final_amount < 0
      return (
        <div className="text-right">
          <span className={`font-medium ${isRefund ? "text-success" : "text-destructive"}`}>
            {isRefund ? "-" : "+"}
            {formatCurrency(Math.abs(clearance.final_amount))}
          </span>
          <div className="text-xs text-muted-foreground">{isRefund ? "Refund" : "Due"}</div>
        </div>
      )
    },
  },
  {
    key: "settlement_status",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "select",
    editOptions: [
      { value: "pending", label: "Pending" },
      { value: "partial", label: "Partial" },
      { value: "completed", label: "Completed" },
    ],
    render: (clearance) => {
      const status = EXIT_CLEARANCE_STATUS[clearance.settlement_status] || {
        variant: "muted" as const,
        label: clearance.settlement_status,
      }
      return (
        <div className="space-y-1">
          <TableBadge variant={status.variant}>{status.label}</TableBadge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {clearance.room_inspection_done && (
              <span title="Room Inspected">
                <CheckCircle className="h-3 w-3 text-success" />
              </span>
            )}
            {clearance.key_returned && (
              <span title="Key Returned">
                <CheckCircle className="h-3 w-3 text-success" />
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  // Hidden by default columns
  dateColumn("notice_given_date", "Notice Date", { defaultVisible: false }),
  dateColumn("actual_exit_date", "Actual Exit", { defaultVisible: false }),
  currencyColumn("total_dues", "Total Dues", { defaultVisible: false, color: "text-destructive" }),
  currencyColumn("total_refundable", "Refundable", { defaultVisible: false, color: "text-success" }),
  {
    key: "room_inspection_done",
    header: "Inspection",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (clearance) => (
      <StatusDot
        status={clearance.room_inspection_done ? "success" : "muted"}
        label={clearance.room_inspection_done ? "Done" : "Pending"}
      />
    ),
  },
  {
    key: "key_returned",
    header: "Key",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (clearance) => (
      <StatusDot
        status={clearance.key_returned ? "success" : "muted"}
        label={clearance.key_returned ? "Returned" : "Pending"}
      />
    ),
  },
  dateColumn("created_at", "Initiated On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  EXIT_CLEARANCE_STATUS_FILTER,
  createDateRangeFilter("expected_exit_date", "Exit Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "room.room_number", label: "Room" },
  { value: "settlement_status", label: "Status" },
  { value: "inspection_label", label: "Inspection" },
  { value: "key_label", label: "Key Status" },
  { value: "exit_month", label: "Exit Month" },
  { value: "exit_year", label: "Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "settlement_status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in"],
    filterOptions: EXIT_CLEARANCE_STATUS_OPTIONS,
  },
  {
    key: "final_amount",
    header: "Final Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "expected_exit_date",
    header: "Exit Date",
    filterType: "date",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "room_inspection_done",
    header: "Room Inspection",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Done" },
      { value: "false", label: "Pending" },
    ],
  },
  {
    key: "key_returned",
    header: "Key Returned",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ icon: LogOut }),
  createStatusMetric("initiated", "Initiated", Clock, { column: "settlement_status" }),
  createStatusMetric("pending_payment", "Pending Payment", AlertCircle, { id: "pending", column: "settlement_status", highlight: true }),
  createStatusMetric("cleared", "Cleared", CheckCircle, { column: "settlement_status" }),
]

// ============================================
// Page Component
// ============================================

export default function ExitClearancePage() {
  return (
    <>
      <TenantsOnNoticeAlert />
      <ListPageTemplate
        tableKey="exit-clearance"
        title="Exit Clearance"
        description="Manage tenant checkouts and settlements"
        icon={LogOut}
        permission="exit_clearance.initiate"
        feature="exitClearance"
        config={EXIT_CLEARANCE_LIST_CONFIG}
        filters={filters}
        groupByOptions={groupByOptions}
        metrics={metrics}
        columns={columns}
        searchPlaceholder="Search by tenant or property..."
        enableColumnManager={true}
        enableAdvancedFilters={true}
        advancedFilterColumns={advancedFilterColumns}
        enableInlineEdit={true}
        createHref="/exit-clearance/new"
        createLabel="Initiate Checkout"
        createPermission="exit_clearance.initiate"
        detailHref={(clearance) => `/exit-clearance/${clearance.id}`}
        emptyTitle="No exit clearances"
        emptyDescription="No checkout processes have been initiated"
      />
    </>
  )
}
