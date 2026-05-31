/**
 * Library Members List Page
 *
 * Displays all library members with subscription and hours info.
 * Supports bulk import via CSV and bulk status updates.
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, Clock, CalendarClock, Upload, RefreshCw, Loader2, UserMinus } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { statusColumn, dateColumn, personNameWithAvatarColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { ListPageTemplate, BulkActionConfig } from "@/components/shared/ListPageTemplate"
import { LIBRARY_MEMBER_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { LIBRARY_FILTER, TIME_SLOT_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { LIBRARY_MEMBER_STATUS_CONFIG } from "@/types/library.types"
import { LIBRARY_MEMBER_STATUS_LABELS, LIBRARY_MEMBER_STATUS_OPTIONS } from "@/lib/status"
import { TIME_SLOT_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, statusFilterColumn, selectFilterColumn, dateFilterColumn, numberFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn, formatDecimalForExport } from "@/lib/export-columns"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/form-components"
import { PermissionGate, ModuleGuard } from "@/components/auth"
import { LIBRARY_MEMBER_STATUS_UPDATE_OPTIONS } from "@/lib/constants/form-options"
import { createClient } from "@/lib/supabase/client"
import { getNowISO } from "@/lib/date-helpers"
import { showSuccess, showError } from "@/lib/toast-helpers"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ============================================
// Types
// ============================================

interface LibraryMemberItem {
  id: string
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  status: string
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  join_date: string
  expiry_date: string | null
  created_at: string
  person?: { id: string; name?: string; photo_url?: string } | null
  library?: { id: string; name: string } | null
  assigned_seat?: { id: string; seat_number: string; section?: { id: string; name: string } } | null
  // Computed
  display_name?: string
  join_month?: string
  join_year?: string
  status_label?: string
  hours_display?: string
  overdue_days?: number
  days_until_expiry?: number
  overdue_status?: string
  missing_data_count?: number
}

// ============================================
// Helpers
// ============================================

function computeOverdueDays(expiryDate: string | null): number {
  if (!expiryDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<LibraryMemberItem>[] = [
  personNameWithAvatarColumn("Member", {
    subtitleField: ["member_code", "phone"],
  }) as Column<LibraryMemberItem>,
  {
    key: "library.name",
    header: "Library",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (member) => member.library?.name || "\u2014",
  },
  {
    key: "hours_balance",
    header: "Today's Hours",
    width: "secondary",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (member) => (
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className={member.hours_balance <= 0 ? "text-destructive font-medium" : ""}>
          {member.hours_balance?.toFixed(1) || 0}h left today
        </span>
      </div>
    ),
  },
  {
    key: "preferred_slot",
    header: "Slot",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (member) => member.preferred_slot ? (
      <TableBadge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
        {member.preferred_slot}
      </TableBadge>
    ) : "\u2014",
  },
  statusColumn(LIBRARY_MEMBER_STATUS_CONFIG as Record<string, { label: string; variant: string }>),
  // Hidden by default
  phoneColumn("phone", "Phone", { defaultVisible: false }),
  emailColumn("email", "Email", { defaultVisible: false }),
  {
    key: "assigned_seat",
    header: "Seat",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (member) => member.assigned_seat ? (
      <span className="text-xs">
        {member.assigned_seat.seat_number}
        {member.assigned_seat.section && ` (${member.assigned_seat.section.name})`}
      </span>
    ) : "\u2014",
  },
  {
    key: "hours_used",
    header: "Hours Used",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (member) => `${member.hours_used?.toFixed(1) || 0}h`,
  },
  dateColumn("join_date", "Joined", { defaultVisible: false }),
  dateColumn("expiry_date", "Expiry", { defaultVisible: false }),
  dateColumn("left_date", "Left Date", { defaultVisible: false }),
  {
    key: "overdue_status",
    header: "Overdue Status",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (member) => {
      if (!member.expiry_date) return "\u2014"
      // positive = overdue, negative = days until expiry
      const overdueDays = computeOverdueDays(member.expiry_date)
      if (overdueDays > 30) return <TableBadge variant="error">Severely Overdue</TableBadge>
      if (overdueDays > 0) return <TableBadge variant="warning">Overdue</TableBadge>
      if (overdueDays >= -7) return <TableBadge variant="warning">Expiring Soon</TableBadge>
      return <TableBadge variant="success">Current</TableBadge>
    },
  },
  {
    key: "overdue_days",
    header: "Overdue Days",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (member) => {
      if (!member.expiry_date) return "\u2014"
      const overdueDays = computeOverdueDays(member.expiry_date)
      if (overdueDays <= 0) return "\u2014"
      return <span className="text-destructive font-medium">{overdueDays}d</span>
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  LIBRARY_FILTER,
  createStatusFilter(LIBRARY_MEMBER_STATUS_OPTIONS),
  TIME_SLOT_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "library.name", label: "Library" },
  { value: "status", label: "Status" },
  { value: "preferred_slot", label: "Time Slot" },
  { value: "join_month", label: "Join Month" },
  { value: "overdue_status", label: "Overdue Status" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Member Name", ["contains", "eq", "neq", "starts", "ends"]),
  textFilterColumn("phone", "Phone"),
  textFilterColumn("email", "Email", ["contains", "eq", "neq", "starts", "is_null", "is_not_null"]),
  textFilterColumn("member_code", "Member Code"),
  statusFilterColumn(LIBRARY_MEMBER_STATUS_OPTIONS),
  numberFilterColumn("hours_balance", "Hours Balance"),
  numberFilterColumn("hours_used", "Hours Used"),
  selectFilterColumn("preferred_slot", "Preferred Slot", TIME_SLOT_OPTIONS),
  dateFilterColumn("join_date", "Join Date"),
  dateFilterColumn("expiry_date", "Expiry Date", ["is_null", "is_not_null"]),
  dateFilterColumn("left_date", "Left Date", ["is_null", "is_not_null"]),
  dateFilterColumn("created_at", "Added On"),
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Members", icon: Users }),
  createStatusMetric("active", "Active", Users),
  createStatusMetric("expired", "Expired", Users),
  createCountMetric("low_hours", "Low Today (<2h)", Clock,
    (item) => (Number(item.hours_balance) || 0) < 2 && item.status === "active"
  ),
  createStatusMetric("suspended", "Suspended", UserMinus),
  createCountMetric("expiring_soon", "Expiring Soon", CalendarClock,
    (item) => {
      if (!item.expiry_date || item.status !== "active") return false
      const overdueDays = computeOverdueDays(item.expiry_date as string)
      // overdueDays <= 0 means not yet expired; -overdueDays is days until expiry
      return overdueDays <= 0 && overdueDays >= -7
    }
  ),
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
  { key: "email" as keyof Record<string, unknown>, header: "Email", format: (v) => String(v ?? "") },
  { key: "status" as keyof Record<string, unknown>, header: "Status", format: (v) => String(v ?? "") },
  { key: "preferred_slot" as keyof Record<string, unknown>, header: "Slot", format: (v) => String(v ?? "") },
  { key: "hours_balance" as keyof Record<string, unknown>, header: "Hours Left Today", format: (v) => v ? formatDecimalForExport(v) : "0" },
  dateExportColumn("expiry_date", "Expiry Date"),
  { key: "member_code" as keyof Record<string, unknown>, header: "Member Code", format: (v) => String(v ?? "") },
]

// ============================================
// Bulk Status Update Component
// ============================================

function BulkStatusActions({
  selectedIds,
  clearSelection,
  refetch,
}: {
  selectedIds: string[]
  clearSelection: () => void
  refetch: () => void
}) {
  const [targetStatus, setTargetStatus] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleBulkUpdate = async () => {
    if (!targetStatus || selectedIds.length === 0) return

    setUpdating(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("library_members")
        .update({
          status: targetStatus,
          updated_at: getNowISO(),
        })
        .in("id", selectedIds)

      if (error) {
        showError("Failed to update members", error.message)
      } else {
        showSuccess(
          `Updated ${selectedIds.length} member${selectedIds.length !== 1 ? "s" : ""} to ${targetStatus}`
        )
        clearSelection()
        refetch()
      }
    } catch {
      showError("Failed to update members")
    } finally {
      setUpdating(false)
      setConfirmOpen(false)
      setTargetStatus("")
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value)}
          disabled={updating}
          options={LIBRARY_MEMBER_STATUS_UPDATE_OPTIONS}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!targetStatus || updating}
          onClick={() => setConfirmOpen(true)}
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Apply
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Status Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update {selectedIds.length} member{selectedIds.length !== 1 ? "s" : ""}{" "}
              to <strong>{LIBRARY_MEMBER_STATUS_LABELS[targetStatus] || targetStatus}</strong>? This action will be applied immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkUpdate() }} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedIds.length} Member${selectedIds.length !== 1 ? "s" : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================
// Bulk Actions Config
// ============================================

const bulkActions: BulkActionConfig = {
  permission: "library_members.edit",
  renderActions: (selectedIds, clearSelection, refetch) => (
    <BulkStatusActions
      selectedIds={selectedIds}
      clearSelection={clearSelection}
      refetch={refetch}
    />
  ),
}

// ============================================
// Page Component
// ============================================

export default function LibraryMembersPage() {
  return (
    <ModuleGuard module="members">
    <ListPageTemplate
      tableKey="library-members"
      title="Library Members"
      description="Manage member subscriptions and hours"
      icon={Users}
      permission="library_members.view"
      module="members"
      config={LIBRARY_MEMBER_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, member code..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="library-members"
      createHref="/library-members/new"
      createLabel="Add Member"
      createPermission="library_members.create"
      headerActions={
        <PermissionGate permission="library_members.create" hide>
          <Link href="/library-members/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </Link>
        </PermissionGate>
      }
      detailHref={(member) => `/library-members/${member.id}`}
      emptyTitle="No members found"
      emptyDescription="Add your first member to start tracking subscriptions"
      bulkActions={bulkActions}
    />
    </ModuleGuard>
  )
}
