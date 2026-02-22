"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot } from "@/components/ui/data-table"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { PageSkeleton } from "@/components/ui/loading"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ClipboardCheck, CheckCircle, XCircle, Clock,
  User, AlertTriangle, FileText, ChevronRight,
  Layers, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
// ARCH-001: Use centralized useListPage hook for data fetching
import { useListPage, GroupByOption, APPROVALS_LIST_CONFIG } from "@/lib/hooks/useListPage"
import { createStatusMetric, createCountMetric, MetricConfig } from "@/lib/metric-factories"
import { APPROVAL_STATUS, APPROVAL_PRIORITY, APPROVAL_TYPE_LABELS, getStatusInfo as getApprovalStatusInfo } from "@/lib/status-config"
import { ApprovalReviewDialog } from "./_components/ApprovalReviewDialog"
import type { ApprovalData } from "./_components/ApprovalReviewDialog"

interface Approval extends ApprovalData {
  // Computed fields for grouping
  type_label?: string
  priority_label?: string
  created_month?: string
  created_year?: string
  has_docs_label?: string
}

// Uses APPROVAL_TYPE_LABELS and APPROVAL_PRIORITY from status-config

// ARCH-001: Group by options for approvals (using useListPage pattern)
const approvalGroupByOptions: GroupByOption[] = [
  { value: "type_label", label: "Type" },
  { value: "status", label: "Status" },
  { value: "priority_label", label: "Priority" },
  { value: "requester_tenant.name", label: "Tenant" },
  { value: "has_docs_label", label: "Has Documents" },
  { value: "created_month", label: "Month" },
  { value: "created_year", label: "Year" },
]

// ARCH-001: Metrics config for approvals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const approvalMetrics: MetricConfig<any>[] = [
  createStatusMetric("pending", "Pending", Clock),
  createStatusMetric("approved", "Approved", CheckCircle),
  createStatusMetric("rejected", "Rejected", XCircle),
  createCountMetric("urgent", "Urgent", AlertTriangle,
    (item) => item.status === "pending" && item.priority === "urgent",
    { highlight: true }
  ),
]

export default function ApprovalsPage() {
  // ARCH-001: Use centralized hook for data fetching
  const {
    data: approvals,
    loading,
    selectedGroups,
    setSelectedGroups,
    metricsData,
    refetch,
  } = useListPage<Approval>({
    config: APPROVALS_LIST_CONFIG as unknown as import("@/lib/hooks/list-page/types").ListPageConfig<Approval>,
    groupByOptions: approvalGroupByOptions,
    metrics: approvalMetrics,
  })

  // Local state for custom UI elements
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  const openApprovalDialog = (approval: Approval) => {
    setSelectedApproval(approval)
    setDialogOpen(true)
  }

  // ARCH-001: Filter approvals using memoized computation
  const filteredApprovals = useMemo(() => {
    if (filter === "all") return approvals
    return approvals.filter(a => a.status === filter)
  }, [approvals, filter])

  // ARCH-001: Derive pending count for filter badge
  const pendingCount = useMemo(() => {
    return approvals.filter(a => a.status === "pending").length
  }, [approvals])

  // ARCH-001: Transform metricsData to MetricItem format for MetricsBar
  const metrics: MetricItem[] = useMemo(() => {
    return metricsData.map(m => ({
      label: m.label,
      value: m.value,
      icon: m.icon as MetricItem["icon"],
      highlight: m.highlight,
    }))
  }, [metricsData])

  // Uses centralized getStatusInfo from status-config

  const columns: Column<Approval>[] = [
    {
      key: "title",
      header: "Request",
      width: "primary",
      render: (approval) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            approval.status === "pending" ? "bg-amber-100 dark:bg-amber-900" : "bg-muted"
          )}>
            <FileText className={cn(
              "h-4 w-4",
              approval.status === "pending" ? "text-amber-600" : "text-muted-foreground"
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
              openApprovalDialog(approval)
            }}
          >
            Review
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : null
      ),
    },
  ]

  if (loading) {
    return <PageSkeleton variant="list" />
  }

  return (
    <FeatureGuard feature="approvals">
      <PermissionGuard permission="tenants.view">
        <div className="space-y-6">
        <PageHeader
          title="Approvals Hub"
          description="Review and manage tenant requests"
          icon={ClipboardCheck}
          breadcrumbs={[{ label: "Approvals" }]}
        />

        <MetricsBar items={metrics} />

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pendingCount > 0 && (
                  <Badge className="ml-2 bg-amber-500">{pendingCount}</Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Group By Multi-Select */}
          <div className="relative">
            <button
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-muted"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedGroups.length === 0
                  ? "Group by..."
                  : selectedGroups.length === 1
                    ? approvalGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                    : `${selectedGroups.length} levels`}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {groupDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setGroupDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-20 py-1">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Group by (select order)
                    </p>
                  </div>
                  {approvalGroupByOptions.map((opt) => {
                    const isSelected = selectedGroups.includes(opt.value)
                    const orderIndex = selectedGroups.indexOf(opt.value)

                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGroups([...selectedGroups, opt.value])
                            } else {
                              setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                            }
                          }}
                        />
                        <span className="text-sm flex-1">{opt.label}</span>
                        {isSelected && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {orderIndex + 1}
                          </span>
                        )}
                      </label>
                    )
                  })}
                  {selectedGroups.length > 0 && (
                    <div className="border-t mt-1 pt-1 px-3 py-2">
                      <button
                        onClick={() => {
                          setSelectedGroups([])
                          setGroupDropdownOpen(false)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear grouping
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredApprovals}
          keyField="id"
          searchable
          searchPlaceholder="Search requests..."
          searchFields={["title", "type"]}
          groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
            key,
            label: approvalGroupByOptions.find(o => o.value === key)?.label
          })) : undefined}
          onRowClick={(approval) => {
            openApprovalDialog(approval)
          }}
          emptyState={
            <div className="flex flex-col items-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No requests found</h3>
              <p className="text-muted-foreground">
                {filter === "pending"
                  ? "No pending requests to review"
                  : "No requests match your filter"}
              </p>
            </div>
          }
        />

        {/* Review Dialog */}
        <ApprovalReviewDialog
          approval={selectedApproval}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActionComplete={refetch}
        />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
