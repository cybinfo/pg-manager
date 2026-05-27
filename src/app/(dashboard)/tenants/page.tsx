/**
 * Tenants List Page (Refactored)
 *
 * BEFORE: 400 lines of code
 * AFTER: ~120 lines of code (70% reduction)
 *
 * This demonstrates how to use the centralized architecture:
 * - ListPageTemplate for UI
 * - useListPage hook for data
 * - Pre-built configs for common patterns
 */

"use client"

import { Users, UserCheck, UserMinus, Clock } from "lucide-react"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { statusColumn, currencyColumn, dateColumn, personNameWithAvatarColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { TENANT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { PROPERTY_FILTER, createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { TENANT_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { POLICE_VERIFICATION_STATUS_OPTIONS } from "@/lib/status"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { getStatusInfo as getTenantStatusInfo } from "@/lib/status-config"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn, numberFilterColumn, booleanFilterColumn } from "@/lib/advanced-filter-builders"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
  check_in_date: string
  check_out_date: string | null
  expected_exit_date: string | null
  notice_date: string | null
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  created_at: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  person: { id: string; name: string; photo_url: string | null } | null
  checkin_month?: string
  checkin_year?: string
}

// Status helper uses centralized TENANT_STATUS from status-config

// ============================================
// Column Definitions
// ============================================

// Extended column type with metadata for advanced features
interface ExtendedColumn<T> extends Column<T> {
  canHide?: boolean
  defaultVisible?: boolean
  groupable?: boolean
  groupKey?: string
  groupLabel?: string
}

const columns: ExtendedColumn<Tenant>[] = [
  personNameWithAvatarColumn("Tenant", {
    avatarClassName: `${brandGradient.solid} text-white shrink-0`,
  }) as ExtendedColumn<Tenant>,
  {
    key: "property",
    header: "Property / Room",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    canHide: true,
    defaultVisible: true,
    groupable: true,
    groupKey: "property.name",
    groupLabel: "Property",
    render: (tenant) => (
      <div className="text-sm min-w-0">
        <div className="truncate">{tenant.property?.name || "—"}</div>
        <div className="text-muted-foreground text-xs">
          Room {tenant.room?.room_number || "—"}
        </div>
      </div>
    ),
  },
  currencyColumn("monthly_rent", "Rent", {
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
  }),
  dateColumn("check_in_date", "Since", { hideOnMobile: true }),
  {
    ...statusColumn((status) => getTenantStatusInfo("tenant", status), {
      editable: true,
      editType: "select",
      editOptions: TENANT_STATUS_OPTIONS,
    }),
    groupable: true,
    groupKey: "status",
    groupLabel: "Status",
  } as ExtendedColumn<Tenant>,
  // Additional columns - hidden by default, user can toggle them on
  emailColumn("email", "Email", { defaultVisible: false }),
  phoneColumn("phone", "Phone", { defaultVisible: false }),
  currencyColumn("security_deposit", "Security Deposit", {
    defaultVisible: false,
    bold: false,
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
  }),
  {
    key: "police_verification_status",
    header: "Police Verification",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    groupable: true,
    editable: true,
    editType: "select",
    editOptions: POLICE_VERIFICATION_STATUS_OPTIONS,
    render: (tenant) => {
      const statusMap: Record<string, { label: string; className: string }> = {
        pending: { label: "Pending", className: "text-warning bg-warning/10" },
        submitted: { label: "Submitted", className: "text-info bg-info/10" },
        verified: { label: "Verified", className: "text-success bg-success/10" },
        rejected: { label: "Rejected", className: "text-destructive bg-destructive/10" },
        not_required: { label: "Not Required", className: "text-muted-foreground bg-muted" },
      }
      const status = statusMap[tenant.police_verification_status] || statusMap.pending
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      )
    },
  },
  {
    key: "agreement_signed",
    header: "Agreement",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "boolean",
    render: (tenant) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        tenant.agreement_signed
          ? "text-success bg-success/10"
          : "text-warning bg-warning/10"
      }`}>
        {tenant.agreement_signed ? "Signed" : "Pending"}
      </span>
    ),
  },
  dateColumn("check_out_date", "Check-out Date", { defaultVisible: false }),
  dateColumn("expected_exit_date", "Expected Exit", { defaultVisible: false }),
  dateColumn("notice_date", "Notice Date", { defaultVisible: false }),
  dateColumn("created_at", "Added On", { defaultVisible: false }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (tenant) => tenant.notes ? (
      <span className="truncate max-w-[150px]" title={tenant.notes}>{tenant.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  PROPERTY_FILTER,
  createStatusFilter([
    { value: "active", label: "Active" },
    { value: "notice_period", label: "Notice Period" },
    { value: "checked_out", label: "Moved Out" },
  ]),
  createDateRangeFilter("check_in_date", "Check-in Date"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "room.room_number", label: "Room" },
  { value: "status", label: "Status" },
  { value: "checkin_month", label: "Check-in Month" },
  { value: "checkin_year", label: "Check-in Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Tenant Name", ["contains", "eq", "neq", "starts", "ends"]),
  textFilterColumn("email", "Email", ["contains", "eq", "neq", "starts", "is_null", "is_not_null"]),
  textFilterColumn("phone", "Phone"),
  statusFilterColumn([
    { value: "active", label: "Active" },
    { value: "notice_period", label: "Notice Period" },
    { value: "checked_out", label: "Moved Out" },
  ]),
  numberFilterColumn("monthly_rent", "Monthly Rent"),
  numberFilterColumn("security_deposit", "Security Deposit"),
  dateFilterColumn("check_in_date", "Check-in Date"),
  dateFilterColumn("check_out_date", "Check-out Date", ["is_null", "is_not_null"]),
  dateFilterColumn("notice_date", "Notice Date", ["is_null", "is_not_null"]),
  selectFilterColumn("police_verification_status", "Police Verification", [
    { value: "pending", label: "Pending" },
    { value: "submitted", label: "Submitted" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "not_required", label: "Not Required" },
  ]),
  booleanFilterColumn("agreement_signed", "Agreement Signed"),
  dateFilterColumn("created_at", "Added On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total", icon: Users }),
  createStatusMetric("active", "Active", UserCheck),
  createStatusMetric("notice_period", "Notice Period", Clock, { id: "notice", highlight: true }),
  createStatusMetric("checked_out", "Moved Out", UserMinus, { id: "moved_out" }),
  createSumMetric("monthly_rent", "rent", "Monthly Rent", Users, {
    filter: { column: "status", operator: "eq", value: "active" },
  }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  {
    key: "name" as keyof Record<string, unknown>,
    header: "Name",
    format: (_, row) => {
      const person = row.person as Record<string, unknown> | null
      return String(person?.name || row.name || "")
    },
  },
  { key: "phone" as keyof Record<string, unknown>, header: "Phone", format: (v) => String(v ?? "") },
  nestedColumn("room", "Room", "room.room_number"),
  nestedColumn("property", "Property", "property.name"),
  currencyExportColumn("monthly_rent", "Rent"),
  { key: "status" as keyof Record<string, unknown>, header: "Status", format: (v) => String(v ?? "") },
  dateExportColumn("check_in_date", "Join Date"),
]

// ============================================
// Page Component
// ============================================

export default function TenantsPage() {
  return (
    <ListPageTemplate
      tableKey="tenants"
      // Page info
      title="Tenants"
      description="Manage all your tenants across properties"
      icon={Users}
      permission="tenants.view"
      // Data config
      config={TENANT_LIST_CONFIG}
      // UI config
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, property..."
      // Advanced Table Features
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="tenants"
      // Contextual help
      headerActions={
        <HelpTooltip
          content="Tenants are linked to rooms. Add a property and rooms first before adding tenants."
          side="bottom"
        />
      }
      // Actions
      createHref="/tenants/new"
      createLabel="Add Tenant"
      createPermission="tenants.create"
      // Navigation
      detailHref={(tenant) => `/tenants/${tenant.id}`}
      // Empty state
      emptyTitle="No tenants yet"
      emptyDescription="Add your first tenant to start managing your PG"
    />
  )
}
