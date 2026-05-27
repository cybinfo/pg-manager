"use client"

import { useState } from "react"
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
import { FormField, Select } from "@/components/ui/form-components"
import { FileUpload } from "@/components/ui/file-upload"
import { Loader2, Upload } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { useAuth } from "@/lib/auth"
import { TENANT_DOCUMENT_TYPE_OPTIONS } from "@/lib/constants/form-options"

export type DocumentType = "id_proof" | "address_proof" | "income_proof" | "agreement" | "receipt" | "other"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  workspaceId: string
  ownerId: string
  onSuccess?: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  tenantId,
  workspaceId,
  ownerId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [documentType, setDocumentType] = useState<DocumentType>("id_proof")
  const [description, setDescription] = useState("")
  const [fileUrl, setFileUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      showError("Please enter a document name")
      return
    }

    if (!fileUrl) {
      showError("Please upload a file")
      return
    }

    if (!user) {
      showError("Session expired. Please log in again.")
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Extract filename and mime type from URL
    const fileName = fileUrl.split("/").pop() || "document"
    const ext = fileName.split(".").pop()?.toLowerCase()
    const mimeTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    }
    const mimeType = mimeTypeMap[ext || ""] || "application/octet-stream"

    const { error } = await supabase.from("tenant_documents").insert(
      withCreatedBy({
        tenant_id: tenantId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        name: name.trim(),
        document_type: documentType,
        description: description.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
        mime_type: mimeType,
        status: "pending",
      }, user?.id || tenantId)
    )

    setLoading(false)

    if (error) {
      logger.error("Error uploading document:", { detail: error })
      showError("Failed to save document. Please try again.")
      return
    }

    showSuccess("Document uploaded successfully! It will be reviewed by the administrator.")
    resetForm()
    onOpenChange(false)
    onSuccess?.()
  }

  const resetForm = () => {
    setName("")
    setDocumentType("id_proof")
    setDescription("")
    setFileUrl("")
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a document for verification. Once approved, you can reference it in your issue reports.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Name */}
          <FormField label="Document Name" htmlFor="doc-name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aadhaar Card, Rent Agreement"
              disabled={loading}
            />
          </FormField>

          {/* Document Type */}
          <FormField label="Document Type" htmlFor="doc-type" required>
            <Select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              options={TENANT_DOCUMENT_TYPE_OPTIONS}
              disabled={loading}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description" htmlFor="doc-description" hint="Optional notes about this document">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this document"
              rows={2}
              disabled={loading}
            />
          </FormField>

          {/* File Upload */}
          <FormField label="File" htmlFor="doc-file" required>
            <FileUpload
              bucket="tenant-documents"
              folder={`${workspaceId}/${tenantId}`}
              accept="image/*,.pdf"
              maxSize={10}
              value={fileUrl}
              onChange={(url) => setFileUrl(url as string)}
              description="PDF, JPG, PNG up to 10MB"
              disabled={loading}
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !fileUrl}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Upload Document"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
