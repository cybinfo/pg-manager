"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot } from "@/components/ui/data-table"
import { PermissionGuard } from "@/components/auth"
import {
  ClipboardCheck, Loader2, CheckCircle, XCircle, Clock,
  User, AlertTriangle, FileText, ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
  requester_tenant: {
    id: string
    name: string
    phone: string
  } | null
}

const TYPE_LABELS: Record<string, string> = {
  name_change: "Name Change",
  address_change: "Address Change",
  phone_change: "Phone Change",
  email_change: "Email Change",
  room_change: "Room Transfer",
  complaint: "Complaint",
  other: "Other Request",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
}

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("approvals")
      .select(`
        *,
        requester_tenant:tenants(id, name, phone)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching approvals:", error)
      toast.error("Failed to load approvals")
    } else {
      // Transform Supabase array joins
      const transformed = (data || []).map(a => ({
        ...a,
        requester_tenant: Array.isArray(a.requester_tenant)
          ? a.requester_tenant[0]
          : a.requester_tenant
      }))
      setApprovals(transformed)
    }

    setLoading(false)
  }

  const handleApprove = async () => {
    if (!selectedApproval) return
    setProcessing(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("approvals")
      .update({
        status: "approved",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        decision_notes: decisionNotes || null,
      })
      .eq("id", selectedApproval.id)

    if (error) {
      toast.error("Failed to approve request")
    } else {
      // Try to apply the change
      const { error: applyError } = await supabase.rpc("apply_approval_change", {
        p_approval_id: selectedApproval.id
      })

      if (applyError) {
        toast.success("Request approved (change needs manual application)")
      } else {
        toast.success("Request approved and change applied!")
      }

      fetchApprovals()
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

    const { error } = await supabase
      .from("approvals")
      .update({
        status: "rejected",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        decision_notes: decisionNotes,
      })
      .eq("id", selectedApproval.id)

    if (error) {
      toast.error("Failed to reject request")
    } else {
      toast.success("Request rejected")
      fetchApprovals()
    }

    setProcessing(false)
    setDialogOpen(false)
    setDecisionNotes("")
  }

  // Filter approvals
  const filteredApprovals = approvals.filter(a => {
    if (filter === "all") return true
    return a.status === filter
  })

  // Metrics
  const pendingCount = approvals.filter(a => a.status === "pending").length
  const approvedCount = approvals.filter(a => a.status === "approved").length
  const rejectedCount = approvals.filter(a => a.status === "rejected").length
  const urgentCount = approvals.filter(a => a.status === "pending" && a.priority === "urgent").length

  const metrics: MetricItem[] = [
    { label: "Pending", value: pendingCount, icon: Clock },
    { label: "Approved", value: approvedCount, icon: CheckCircle },
    { label: "Rejected", value: rejectedCount, icon: XCircle },
    { label: "Urgent", value: urgentCount, icon: AlertTriangle },
  ]

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
          {new Date(approval.created_at).toLocaleDateString()}
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
              setSelectedApproval(approval)
              setDialogOpen(true)
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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6">
        <PageHeader
          title="Approvals Hub"
          description="Review and manage tenant requests"
          icon={ClipboardCheck}
        />

        <MetricsBar items={metrics} />

        {/* Filter Tabs */}
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

        <DataTable
          columns={columns}
          data={filteredApprovals}
          keyField="id"
          searchable
          searchPlaceholder="Search requests..."
          searchFields={["title", "type"]}
          onRowClick={(approval) => {
            setSelectedApproval(approval)
            setDialogOpen(true)
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
                      <span>{new Date(selectedApproval.created_at).toLocaleString()}</span>
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
                        Decided on {new Date(selectedApproval.decided_at!).toLocaleString()}
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
  )
}
