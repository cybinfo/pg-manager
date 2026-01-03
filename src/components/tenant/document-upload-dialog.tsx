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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/ui/file-upload"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

export type DocumentType = "id_proof" | "address_proof" | "income_proof" | "agreement" | "receipt" | "other"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  workspaceId: string
  ownerId: string
  onSuccess?: () => void
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "id_proof", label: "ID Proof (Aadhaar, PAN, Passport)" },
  { value: "address_proof", label: "Address Proof" },
  { value: "income_proof", label: "Income Proof" },
  { value: "agreement", label: "Agreement / Contract" },
  { value: "receipt", label: "Receipt / Invoice" },
  { value: "other", label: "Other Document" },
]

export function DocumentUploadDialog({
  open,
  onOpenChange,
  tenantId,
  workspaceId,
  ownerId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [documentType, setDocumentType] = useState<DocumentType>("id_proof")
  const [description, setDescription] = useState("")
  const [fileUrl, setFileUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Please enter a document name")
      return
    }

    if (!fileUrl) {
      toast.error("Please upload a file")
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

    const { error } = await supabase.from("tenant_documents").insert({
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
    })

    setLoading(false)

    if (error) {
      console.error("Error uploading document:", error)
      toast.error("Failed to save document. Please try again.")
      return
    }

    toast.success("Document uploaded successfully! It will be reviewed by the administrator.")
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
          <div className="space-y-2">
            <Label htmlFor="doc-name">
              Document Name
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aadhaar Card, Rent Agreement"
              disabled={loading}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="doc-type">
              Document Type
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              disabled={loading}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (Optional)</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this document"
              rows={2}
              disabled={loading}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>
              File
              <span className="text-red-500 ml-1">*</span>
            </Label>
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
          </div>

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
