/**
 * Approvals List Page (Refactored)
 *
 * BEFORE: ~346 lines with manual DataTable, MetricsBar, GroupBy, filter tabs
 * AFTER: ~160 lines using ListPageTemplate
 *
 * Uses the centralized ListPageTemplate pattern:
 * - APPROVALS_LIST_CONFIG for data fetching
 * - MetricConfig with compute functions
 * - FilterConfig for status/priority filtering
 * - GroupByOption for multi-level grouping
 * - ApprovalReviewDialog as modal action via onRowClick
 */

"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { APPROVALS_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { APPROVAL_STATUS_FILTER, APPROVAL_PRIORITY_FILTER, createDateRangeFilter } from "@/lib/filter-presets"
import { APPROVAL_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import {
  ClipboardCheck, CheckCircle, XCircle, Clock,
  User, AlertTriangle, FileText, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { APPROVAL_PRIORITY, APPROVAL_TYPE_LABELS, getStatusInfo as getApprovalStatusInfo } from "@/lib/status-config"
import { ApprovalReviewDialog } from "./_components/ApprovalReviewDialog"
import type { ApprovalData } from "./_components/ApprovalReviewDialog"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { statusFilterColumn, selectFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Approval extends ApprovalData {
  type_label?: string
  priority_label?: string
  created_month?: string
  created_year?: string
  has_docs_label?: string
}

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "type_label", label: "Type" },
  { value: "status", label: "Status" },
  { value: "priority_label", label: "Priority" },
  { value: "requester_tenant.name", label: "Tenant" },
  { value: "has_docs_label", label: "Has Documents" },
  { value: "created_month", label: "Month" },
  { value: "created_year", label: "Year" },
]

// ============================================
// Metrics Configuration
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const metrics: MetricConfig<any>[] = [
  createStatusMetric("pending", "Pending", Clock),
  createStatusMetric("approved", "Approved", CheckCircle),
  createStatusMetric("rejected", "Rejected", XCircle),
  createCountMetric("urgent", "Urgent", AlertTriangle,
    (item) => item.status === "pending" && item.priority === "urgent",
    { highlight: true }
  ),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  APPROVAL_STATUS_FILTER,
  APPROVAL_PRIORITY_FILTER,
  createDateRangeFilter("created_at", "Submitted"),
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  selectFilterColumn("type", "Request Type", [
    { value: "room_change", label: "Room Change" },
    { value: "maintenance", label: "Maintenance" },
    { value: "complaint", label: "Complaint" },
    { value: "notice", label: "Notice" },
    { value: "other", label: "Other" },
  ]),
  statusFilterColumn(APPROVAL_STATUS_OPTIONS.filter((o) => o.value !== "cancelled")),
  selectFilterColumn("priority", "Priority", APPROVAL_PRIORITY_FILTER.options!),
  dateFilterColumn("created_at", "Submitted On"),
]

// ============================================
// Column Definitions
// ============================================

const columns: Column<Approval>[] = [
  {
    key: "title",
    header: "Request",
    width: "primary",
    render: (approval) => (
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          approval.status === "pending" ? "bg-warning/10" : "bg-muted"
        )}>
          <FileText className={cn(
            "h-4 w-4",
            approval.status === "pending" ? "text-warning" : "text-muted-foreground"
          )} />
        </div>
        <div>
          <div className="font-medium">{approval.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{APPROVAL_TYPE_LABELS[approval.type] || approval.type}</span>
            {approval.requester_tenant && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {approval.requester_tenant.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    width: "badge",
    hideOnMobile: true,
    render: (approval) => (
      <Badge className={cn("text-xs", APPROVAL_PRIORITY[approval.priority] || "bg-muted text-foreground")}>
        {approval.priority}
      </Badge>
    ),
  },
  {
    key: "created_at",
    header: "Submitted",
    width: "date",
    hideOnMobile: true,
    render: (approval) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(approval.created_at)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    render: (approval) => {
      const info = getApprovalStatusInfo("approval", approval.status)
      return <StatusDot status={info.status} label={info.label} />
    },
  },
  {
    key: "actions",
    header: "",
    width: "actions",
    render: (approval) => (
      approval.status === "pending" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          Review
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ) : null
    ),
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "title", header: "Title", format: (v) => String(v ?? "") },
  { key: "type", header: "Request Type", format: (v) => APPROVAL_TYPE_LABELS[String(v)] || String(v ?? "") },
  { key: "priority", header: "Priority", format: (v) => String(v ?? "") },
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  nestedColumn("requester_tenant", "Tenant", "requester_tenant.name"),
  nestedColumn("property", "Property", "property.name"),
  nestedColumn("room", "Room", "room.room_number"),
  { key: "description", header: "Description", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Submitted On"),
  dateExportColumn("reviewed_at", "Reviewed On"),
]

// ============================================
// Page Component
// ============================================

export default function ApprovalsPage() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  // Increment key to force ListPageTemplate remount (refetch) after approval action
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRowClick = useCallback((approval: Approval) => {
    setSelectedApproval(approval)
    setDialogOpen(true)
  }, [])

  const handleActionComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <>
      <ListPageTemplate
        key={refreshKey}
        tableKey="approvals"
        title="Approvals Hub"
        description="Review and manage tenant requests"
        icon={ClipboardCheck}
        permission="tenants.view"
        feature="approvals"
        config={APPROVALS_LIST_CONFIG}
        columns={columns}
        filters={filters}
        groupByOptions={groupByOptions}
        metrics={metrics}
        searchPlaceholder="Search requests..."
        enableAdvancedFilters={true}
        advancedFilterColumns={advancedFilterColumns}
        enableInlineEdit={true}
        exportColumns={exportColumns}
        exportFilename="approvals"
        onRowClick={handleRowClick}
        emptyTitle="No requests found"
        emptyDescription="No approval requests to review"
      />

      <ApprovalReviewDialog
        approval={selectedApproval}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onActionComplete={handleActionComplete}
      />
    </>
  )
}
