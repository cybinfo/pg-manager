/**
 * Library Subscriptions List Page
 *
 * Centralized view of ALL library memberships (subscriptions) across all members.
 * Shows plan details, time slots, amounts, hours, and status.
 */

"use client"

import { CreditCard, Users, AlertTriangle, Clock, Receipt } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { statusColumn, dateColumn, currencyColumn, badgeColumn, personNameWithAvatarColumn, countColumn } from "@/lib/column-builders"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_MEMBERSHIP_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter } from "@/lib/filter-presets"
import { LIBRARY_MEMBERSHIP_STATUS_CONFIG } from "@/types/library.types"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn, numberFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface SubscriptionItem {
  id: string
  plan_name: string
  amount: number
  discount_amount: number
  final_amount: number
  time_slot: string | null
  start_date: string
  end_date: string
  hours_included: number | null
  hours_used: number
  hours_remaining: number | null
  status: string
  created_at: string
  member?: {
    id: string
    name: string
    member_code: string | null
    person?: { id: string; name?: string; photo_url?: string } | null
  } | null
  plan?: {
    id: string
    name: string
    hours_included: number | null
  } | null
  // Computed
  start_month?: string
  status_label?: string
  hours_display?: string
  display_amount?: string
}

// ============================================
// Column Definitions
// ============================================

const TIME_SLOT_BADGE_CONFIG: Record<string, { label: string; variant: string }> = {
  Morning: { label: "Morning", variant: "warning" },
  Evening: { label: "Evening", variant: "default" },
  Night: { label: "Night", variant: "muted" },
  "24 Hours": { label: "24 Hours", variant: "success" },
}

const columns: Column<SubscriptionItem>[] = [
  personNameWithAvatarColumn("Member", {
    key: "member",
    nameField: "member.name",
    personNameField: "member.person.name",
    photoField: "member.person.photo_url",
    subtitleField: "member.member_code",
    sortable: false,
  }),
  {
    key: "plan_name",
    header: "Plan",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (sub) => (
      <span className="font-medium">{sub.plan_name}</span>
    ),
  },
  badgeColumn("time_slot", "Slot", TIME_SLOT_BADGE_CONFIG, { defaultVisible: true }),
  dateColumn("start_date", "Start Date"),
  dateColumn("end_date", "End Date"),
  currencyColumn("final_amount", "Amount", { color: "text-success", prefix: "" }),
  countColumn("hours_included", "Hours", { suffix: "h", defaultVisible: true }),
  statusColumn(LIBRARY_MEMBERSHIP_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  // Hidden by default
  currencyColumn("discount_amount", "Discount", { defaultVisible: false }),
  countColumn("hours_used", "Used", { suffix: "h", defaultVisible: false }),
  countColumn("hours_remaining", "Remaining", { suffix: "h", defaultVisible: false }),
  dateColumn("created_at", "Recorded On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const TIME_SLOT_SUBSCRIPTION_FILTER: FilterConfig = {
  id: "time_slot",
  label: "Slot",
  type: "select",
  placeholder: "All Slots",
  options: [
    { value: "Morning", label: "Morning" },
    { value: "Evening", label: "Evening" },
    { value: "Night", label: "Night" },
    { value: "24 Hours", label: "24 Hours" },
  ],
}

const filters: FilterConfig[] = [
  createStatusFilter([
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "cancelled", label: "Cancelled" },
    { value: "upgraded", label: "Upgraded" },
  ]),
  TIME_SLOT_SUBSCRIPTION_FILTER,
  {
    id: "start_date",
    label: "Start Date",
    type: "date",
    placeholder: "Filter by start date",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "status", label: "Status" },
  { value: "plan_name", label: "Plan" },
  { value: "time_slot", label: "Time Slot" },
  { value: "start_month", label: "Start Month" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("plan_name", "Plan Name"),
  numberFilterColumn("final_amount", "Amount"),
  numberFilterColumn("hours_included", "Hours Included"),
  dateFilterColumn("start_date", "Start Date"),
  dateFilterColumn("end_date", "End Date"),
  statusFilterColumn([
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "cancelled", label: "Cancelled" },
    { value: "upgraded", label: "Upgraded" },
  ]),
  selectFilterColumn("time_slot", "Time Slot", [
    { value: "Morning", label: "Morning" },
    { value: "Evening", label: "Evening" },
    { value: "Night", label: "Night" },
    { value: "24 Hours", label: "24 Hours" },
  ]),
  numberFilterColumn("hours_used", "Hours Used"),
  numberFilterColumn("hours_remaining", "Hours Remaining"),
  numberFilterColumn("discount_amount", "Discount"),
  dateFilterColumn("created_at", "Recorded On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Subscriptions", icon: Receipt }),
  createStatusMetric("active", "Active", Users),
  createStatusMetric("expired", "Expired", AlertTriangle),
  createSumMetric("final_amount", "total_revenue", "Total Revenue", CreditCard),
]

// ============================================
// Export Columns
// ============================================

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  upgraded: "Upgraded",
}

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  nestedColumn("member_name", "Member Name", "member.person.name", (val, row) => {
    return String(val || (row.member as Record<string, unknown>)?.name || "")
  }),
  { key: "plan_name" as keyof Record<string, unknown>, header: "Plan", format: (v) => String(v ?? "") },
  { key: "time_slot" as keyof Record<string, unknown>, header: "Time Slot", format: (v) => String(v ?? "") },
  dateExportColumn("start_date", "Start Date"),
  dateExportColumn("end_date", "End Date"),
  currencyExportColumn("final_amount", "Amount"),
  { key: "hours_included" as keyof Record<string, unknown>, header: "Hours Included", format: (v) => v != null ? String(v) : "Unlimited" },
  { key: "hours_used" as keyof Record<string, unknown>, header: "Hours Used", format: (v) => String(v ?? "0") },
  { key: "hours_remaining" as keyof Record<string, unknown>, header: "Hours Remaining", format: (v) => v != null ? String(v) : "Unlimited" },
  currencyExportColumn("discount_amount", "Discount"),
  { key: "status" as keyof Record<string, unknown>, header: "Status", format: (v) => MEMBERSHIP_STATUS_LABELS[String(v)] || String(v ?? "") },
]

// ============================================
// Page Component
// ============================================

export default function LibrarySubscriptionsPage() {
  return (
    <ListPageTemplate
      tableKey="library-subscriptions"
      title="Subscriptions"
      description="All library memberships and subscription periods"
      icon={Clock}
      permission="library_members.view"
      feature="library"
      config={LIBRARY_MEMBERSHIP_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by plan, member name, member code..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="library-subscriptions"
      detailHref={(sub) => `/library-subscriptions/${sub.id}`}
      emptyTitle="No subscriptions found"
      emptyDescription="Subscriptions are created when members enroll in a library plan"
    />
  )
}
