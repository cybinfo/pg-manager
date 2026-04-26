"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-components"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, AlertCircle, FileText } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"

interface TenantDocument {
  id: string
  name: string
  document_type: string
}

export type ApprovalType =
  | "name_change"
  | "address_change"
  | "phone_change"
  | "email_change"
  | "room_change"
  | "complaint"
  | "other"
  // New types for expanded reporting
  | "bill_dispute"
  | "payment_dispute"
  | "tenancy_issue"
  | "room_issue"

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldLabel: string
  currentValue: string
  approvalType: ApprovalType
  tenantId: string
  workspaceId: string
  ownerId: string
  onSuccess?: () => void
}

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  name_change: "Name Change",
  address_change: "Address Change",
  phone_change: "Phone Number Change",
  email_change: "Email Change",
  room_change: "Room Change",
  complaint: "Complaint",
  other: "Other",
  // New types
  bill_dispute: "Bill Dispute",
  payment_dispute: "Payment Dispute",
  tenancy_issue: "Tenancy Issue",
  room_issue: "Room Issue",
}

// Types that use textarea for description instead of input for new value
const DESCRIPTION_TYPES: ApprovalType[] = [
  "complaint", "other", "bill_dispute", "payment_dispute"
]

export function ReportIssueDialog({
  open,
  onOpenChange,
  fieldLabel,
  currentValue,
  approvalType,
  tenantId,
  workspaceId,
  ownerId,
  onSuccess,
}: ReportIssueDialogProps) {
  const [loading, setLoading] = useState(false)
  const [requestedValue, setRequestedValue] = useState("")
  const [reason, setReason] = useState("")
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [_loadingDocs, setLoadingDocs] = useState(false)

  // Fetch approved documents when dialog opens
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!open || !tenantId) return

      setLoadingDocs(true)
      const supabase = createClient()

      const { data } = await supabase
        .from("tenant_documents")
        .select("id, name, document_type")
        .eq("tenant_id", tenantId)
        .eq("status", "approved")
        .order("name")

      setDocuments(data || [])
      setLoadingDocs(false)
    }

    fetchDocuments()
  }, [open, tenantId])

  const toggleDocument = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requestedValue.trim() && approvalType !== "complaint" && approvalType !== "other") {
      showError("Please enter the requested change")
      return
    }

    if (!reason.trim()) {
      showError("Please provide a reason for your request")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Build payload based on approval type
    const payload: Record<string, unknown> = {
      current_value: currentValue,
      field_label: fieldLabel,
    }

    // Add type-specific payload fields for auto-apply function
    if (approvalType === "name_change") {
      payload.new_name = requestedValue.trim()
    } else if (approvalType === "phone_change") {
      payload.new_phone = requestedValue.trim()
    } else if (approvalType === "email_change") {
      payload.new_email = requestedValue.trim()
    } else {
      payload.requested_value = requestedValue.trim()
    }

    // Generate title
    const typeLabel = APPROVAL_TYPE_LABELS[approvalType]
    const title = `${typeLabel} Request: ${fieldLabel}`

    const { error } = await supabase.from("approvals").insert(
      withCreatedBy({
        requester_tenant_id: tenantId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        type: approvalType,
        title,
        description: reason.trim(),
        payload,
        status: "pending",
        document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
      }, user?.id || tenantId)
    )

    setLoading(false)

    if (error) {
      console.error("Error submitting request:", error)
      showError("Failed to submit request. Please try again.")
      return
    }

    showSuccess("Request submitted successfully! You'll be notified once it's reviewed.")
    setRequestedValue("")
    setReason("")
    setSelectedDocIds([])
    onOpenChange(false)
    onSuccess?.()
  }

  const handleClose = () => {
    if (!loading) {
      setRequestedValue("")
      setReason("")
      setSelectedDocIds([])
      onOpenChange(false)
    }
  }

  const isChangeRequest = !DESCRIPTION_TYPES.includes(approvalType)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Report Issue: {fieldLabel}
          </DialogTitle>
          <DialogDescription>
            Submit a request to update your {fieldLabel.toLowerCase()}. Your property administrator will review and process it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Value */}
          <FormField label="Current Value" htmlFor="current-value">
            <div className="p-3 bg-muted rounded-md text-sm font-medium">
              {currentValue || <span className="text-muted-foreground italic">Not provided</span>}
            </div>
          </FormField>

          {/* Requested Change */}
          <FormField
            label={isChangeRequest ? "Requested Change" : "Details"}
            htmlFor="requested-value"
            required
          >
            {isChangeRequest ? (
              <Input
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder={`Enter new ${fieldLabel.toLowerCase()}`}
                disabled={loading}
              />
            ) : (
              <Textarea
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="Describe the issue or requested change"
                rows={3}
                disabled={loading}
              />
            )}
          </FormField>

          {/* Reason */}
          <FormField
            label="Reason for Request"
            htmlFor="reason"
            required
          >
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this change?"
              rows={3}
              disabled={loading}
            />
          </FormField>

          {/* Document Attachment */}
          {documents.length > 0 && (
            <FormField
              label="Attach Supporting Documents"
              htmlFor="doc-attachment"
              hint={
                selectedDocIds.length > 0
                  ? `${selectedDocIds.length} document(s) selected`
                  : "Select approved documents to attach to this request"
              }
            >
              <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`doc-${doc.id}`}
                      checked={selectedDocIds.includes(doc.id)}
                      onCheckedChange={() => toggleDocument(doc.id)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={`doc-${doc.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.name}
                    </label>
                  </div>
                ))}
              </div>
            </FormField>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
