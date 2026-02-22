/**
 * ApprovalReviewDialog
 *
 * Extracted from approvals/page.tsx to reduce page complexity.
 * Handles review, approve, and reject actions for tenant approval requests.
 */

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle, XCircle, Loader2,
  FileText, Paperclip, ExternalLink,
} from "lucide-react"
import { showSuccess, showError, showWarning } from "@/lib/toast-helpers"
import { formatDateTime } from "@/lib/format"
import { APPROVAL_TYPE_LABELS } from "@/lib/status-config"
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

// ============================================
// Types
// ============================================

interface AttachedDocument {
  id: string
  name: string
  document_type: string
  file_url: string
}

export interface ApprovalData {
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
}

export interface ApprovalReviewDialogProps {
  approval: ApprovalData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

// ============================================
// Component
// ============================================

export function ApprovalReviewDialog({
  approval,
  open,
  onOpenChange,
  onActionComplete,
}: ApprovalReviewDialogProps) {
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState("")

  // Fetch documents when approval changes
  useEffect(() => {
    if (!open || !approval) {
      setAttachedDocs([])
      setDecisionNotes("")
      return
    }

    if (approval.document_ids && approval.document_ids.length > 0) {
      fetchAttachedDocuments(approval.document_ids)
    } else {
      setAttachedDocs([])
    }
  }, [open, approval])

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

  const handleApprove = async () => {
    if (!approval) return
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
      .eq("id", approval.id)

    if (error) {
      showError("Failed to approve request")
    } else {
      // Try to apply the change (updates tenants + user_profiles)
      const { error: applyError } = await (supabase.rpc as Function)("apply_approval_change", {
        p_approval_id: approval.id
      })

      // For email changes, also update auth.users via API route
      if (approval.type === "email_change" && approval.requester_tenant?.user_id) {
        try {
          const response = await fetch("/api/admin/update-user-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: approval.requester_tenant.user_id,
              newEmail: approval.payload?.new_email,
              tenantId: approval.requester_tenant_id,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            console.error("Failed to update auth email:", data.error)
            showWarning("Request approved but login email needs manual update in Supabase")
          } else {
            showSuccess("Request approved and email updated everywhere!")
            onActionComplete()
            setProcessing(false)
            onOpenChange(false)
            setDecisionNotes("")
            return
          }
        } catch (err) {
          console.error("Error calling email update API:", err)
          showWarning("Request approved but login email needs manual update")
        }
      }

      if (applyError) {
        showSuccess("Request approved (change needs manual application)")
      } else {
        showSuccess("Request approved and change applied!")
      }

      onActionComplete()
    }

    setProcessing(false)
    onOpenChange(false)
    setDecisionNotes("")
  }

  const handleReject = async () => {
    if (!approval) return
    if (!decisionNotes.trim()) {
      showError("Please provide a reason for rejection")
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
      .eq("id", approval.id)

    if (error) {
      showError("Failed to reject request")
    } else {
      showSuccess("Request rejected")
      onActionComplete()
    }

    setProcessing(false)
    onOpenChange(false)
    setDecisionNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Request</DialogTitle>
          <DialogDescription>
            {approval?.title}
          </DialogDescription>
        </DialogHeader>

        {approval && (
          <div className="space-y-4">
            {/* Request Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{APPROVAL_TYPE_LABELS[approval.type] || approval.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requester:</span>
                  <span>{approval.requester_tenant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>{formatDateTime(approval.created_at)}</span>
                </div>
                {approval.description && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="mt-1">{approval.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payload Details */}
            {Object.keys(approval.payload).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Change Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {Object.entries(approval.payload).map(([key, value]) => (
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
            {approval.document_ids && approval.document_ids.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attached Documents ({approval.document_ids.length})
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
            {approval.status === "pending" && (
              <div className="space-y-2">
                <Label htmlFor="notes">Decision Notes {approval.status === "pending" && "(required for rejection)"}</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about your decision..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </div>
            )}

            {/* Previous Decision */}
            {approval.status !== "pending" && approval.decision_notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Decision</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{approval.decision_notes}</p>
                  <p className="text-muted-foreground mt-2">
                    Decided on {formatDateTime(approval.decided_at!)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {approval?.status === "pending" ? (
            <>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={processing}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
