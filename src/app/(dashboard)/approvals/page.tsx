"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot } from "@/components/ui/data-table"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ClipboardCheck, CheckCircle, XCircle, Clock, Loader2,
  User, AlertTriangle, FileText, ChevronRight, Paperclip, ExternalLink,
  Layers, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDate, formatDateTime } from "@/lib/format"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
// ARCH-001: Use centralized useListPage hook for data fetching
import { useListPage, ListPageConfig, GroupByOption, MetricConfig } from "@/lib/hooks/useListPage"

interface AttachedDocument {
  id: string
  name: string
  document_type: string
  file_url: string
}

interface Approval {
  id: string
  type: string
  title: string
  description: string | null
  payload: Record<string, string>
  status: string
  priority: string
  created_at: string
  decided_at: string | null
  decision_notes: string | null
  change_applied: boolean
  document_ids: string[] | null
  requester_tenant_id: string
  requester_tenant: {
    id: string
    name: string
    phone: string
    user_id: string | null
  } | null
  // Computed fields for grouping
  type_label?: string
  priority_label?: string
  created_month?: string
  created_year?: string
  has_docs_label?: string
}

const TYPE_LABELS: Record<string, string> = {
  name_change: "Name Change",
  address_change: "Address Change",
  phone_change: "Phone Change",
  email_change: "Email Change",
  room_change: "Room Transfer",
  complaint: "Complaint",
  other: "Other Request",
  bill_dispute: "Bill Dispute",
  payment_dispute: "Payment Dispute",
  tenancy_issue: "Tenancy Issue",
  room_issue: "Room Issue",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
}

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

// ARCH-001: Centralized config for approvals list
const APPROVAL_CONFIG: ListPageConfig<Approval> = {
  table: "approvals",
  select: `
    *,
    requester_tenant:tenants(id, name, phone, user_id)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "type"],
  joinFields: ["requester_tenant"],
  computedFields: (item: Record<string, unknown>) => {
    const date = new Date(item.created_at as string)
    return {
      type_label: TYPE_LABELS[item.type as keyof typeof TYPE_LABELS] || item.type,
      priority_label: (item.priority as string)?.charAt(0).toUpperCase() + (item.priority as string)?.slice(1),
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
      has_docs_label: (item.document_ids && (item.document_ids as string[]).length > 0) ? "With Documents" : "No Documents",
    }
  },
}

// ARCH-001: Metrics config for approvals
const approvalMetrics: MetricConfig<Approval>[] = [
  {
    id: "pending",
    label: "Pending",
    icon: Clock,
    compute: (items) => items.filter(a => a.status === "pending").length,
  },
  {
    id: "approved",
    label: "Approved",
    icon: CheckCircle,
    compute: (items) => items.filter(a => a.status === "approved").length,
  },
  {
    id: "rejected",
    label: "Rejected",
    icon: XCircle,
    compute: (items) => items.filter(a => a.status === "rejected").length,
  },
  {
    id: "urgent",
    label: "Urgent",
    icon: AlertTriangle,
    compute: (items) => items.filter(a => a.status === "pending" && a.priority === "urgent").length,
    highlight: (value) => Number(value) > 0,
  },
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
    config: APPROVAL_CONFIG,
    groupByOptions: approvalGroupByOptions,
    metrics: approvalMetrics,
  })

  // Local state for custom UI elements
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  const fetchAttachedDocuments = async (docIds: string[]) => {
    if (!docIds || docIds.length === 0) {
      setAttachedDocs([])
      return
    }

    setLoadingDocs(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("tenant_documents")
      .select("id, name, document_type, file_url")
      .in("id", docIds)

    setAttachedDocs(data || [])
    setLoadingDocs(false)
  }

  const openApprovalDialog = (approval: Approval) => {
    setSelectedApproval(approval)
    setDialogOpen(true)
    if (approval.document_ids && approval.document_ids.length > 0) {
      fetchAttachedDocuments(approval.document_ids)
    } else {
      setAttachedDocs([])
    }
  }

  const handleApprove = async () => {
    if (!selectedApproval) return
    setProcessing(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await (supabase
      .from("approvals") as ReturnType<typeof supabase.from>)
      .update({
        status: "approved",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        decision_notes: decisionNotes || null,
      } as Record<string, unknown>)
      .eq("id", selectedApproval.id)

    if (error) {
      toast.error("Failed to approve request")
    } else {
      // Try to apply the change (updates tenants + user_profiles)
      const { error: applyError } = await (supabase.rpc as Function)("apply_approval_change", {
        p_approval_id: selectedApproval.id
      })

      // For email changes, also update auth.users via API route
      if (selectedApproval.type === "email_change" && selectedApproval.requester_tenant?.user_id) {
        try {
          const response = await fetch("/api/admin/update-user-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: selectedApproval.requester_tenant.user_id,
              newEmail: selectedApproval.payload?.new_email,
              tenantId: selectedApproval.requester_tenant_id,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            console.error("Failed to update auth email:", data.error)
            toast.warning("Request approved but login email needs manual update in Supabase")
          } else {
            toast.success("Request approved and email updated everywhere!")
            // ARCH-001: Use centralized refetch
            refetch()
            setProcessing(false)
            setDialogOpen(false)
            setDecisionNotes("")
            return
          }
        } catch (err) {
          console.error("Error calling email update API:", err)
          toast.warning("Request approved but login email needs manual update")
        }
      }

      if (applyError) {
        toast.success("Request approved (change needs manual application)")
      } else {
        toast.success("Request approved and change applied!")
      }

      // ARCH-001: Use centralized refetch
      refetch()
    }

    setProcessing(false)
    setDialogOpen(false)
    setDecisionNotes("")
  }

  const handleReject = async () => {
    if (!selectedApproval) return
    if (!decisionNotes.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setProcessing(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await (supabase
      .from("approvals") as ReturnType<typeof supabase.from>)
      .update({
        status: "rejected",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        decision_notes: decisionNotes,
      } as Record<string, unknown>)
      .eq("id", selectedApproval.id)

    if (error) {
      toast.error("Failed to reject request")
    } else {
      toast.success("Request rejected")
      // ARCH-001: Use centralized refetch
      refetch()
    }

    setProcessing(false)
    setDialogOpen(false)
    setDecisionNotes("")
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending": return { status: "warning" as const, label: "Pending" }
      case "approved": return { status: "success" as const, label: "Approved" }
      case "rejected": return { status: "error" as const, label: "Rejected" }
      case "cancelled": return { status: "muted" as const, label: "Cancelled" }
      default: return { status: "muted" as const, label: status }
    }
  }

  const columns: Column<Approval>[] = [
    {
      key: "title",
      header: "Request",
      width: "primary",
      render: (approval) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            approval.status === "pending" ? "bg-amber-100" : "bg-muted"
          )}>
            <FileText className={cn(
              "h-4 w-4",
              approval.status === "pending" ? "text-amber-600" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <div className="font-medium">{approval.title}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{TYPE_LABELS[approval.type] || approval.type}</span>
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
        <Badge className={cn("text-xs", PRIORITY_COLORS[approval.priority])}>
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
        const info = getStatusInfo(approval.status)
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
    return <PageLoader />
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
              className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
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
                <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
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
                        className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Request</DialogTitle>
              <DialogDescription>
                {selectedApproval?.title}
              </DialogDescription>
            </DialogHeader>

            {selectedApproval && (
              <div className="space-y-4">
                {/* Request Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{TYPE_LABELS[selectedApproval.type]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requester:</span>
                      <span>{selectedApproval.requester_tenant?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span>{formatDateTime(selectedApproval.created_at)}</span>
                    </div>
                    {selectedApproval.description && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Description:</span>
                        <p className="mt-1">{selectedApproval.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payload Details */}
                {Object.keys(selectedApproval.payload).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Change Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {Object.entries(selectedApproval.payload).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Attached Documents */}
                {selectedApproval.document_ids && selectedApproval.document_ids.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attached Documents ({selectedApproval.document_ids.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {loadingDocs ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading documents...
                        </div>
                      ) : attachedDocs.length > 0 ? (
                        <div className="space-y-2">
                          {attachedDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{doc.name}</span>
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Unable to load documents</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Decision Notes */}
                {selectedApproval.status === "pending" && (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Decision Notes {selectedApproval.status === "pending" && "(required for rejection)"}</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about your decision..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                    />
                  </div>
                )}

                {/* Previous Decision */}
                {selectedApproval.status !== "pending" && selectedApproval.decision_notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Decision</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>{selectedApproval.decision_notes}</p>
                      <p className="text-muted-foreground mt-2">
                        Decided on {formatDateTime(selectedApproval.decided_at!)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedApproval?.status === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={processing}
                    className="text-rose-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
