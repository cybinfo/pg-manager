"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Trash2,
  Eye,
  FileImage,
  File
} from "lucide-react"
import { DocumentUploadDialog } from "@/components/tenant/document-upload-dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { PageLoader } from "@/components/ui/page-loader"
import { StatusBadge } from "@/components/ui/status-badge"
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

interface TenantDocument {
  id: string
  name: string
  document_type: string
  description: string | null
  file_url: string
  file_name: string
  mime_type: string | null
  status: "pending" | "approved" | "rejected"
  review_notes: string | null
  uploaded_at: string
  reviewed_at: string | null
}

interface TenantInfo {
  id: string
  workspace_id: string
  owner_id: string
}

const docStatusMap: Record<string, { variant: "warning" | "success" | "error"; label: string }> = {
  pending: { variant: "warning", label: "Pending Review" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
}

const documentTypeLabels: Record<string, string> = {
  id_proof: "ID Proof",
  address_proof: "Address Proof",
  income_proof: "Income Proof",
  agreement: "Agreement",
  receipt: "Receipt",
  other: "Other",
}

export default function TenantDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<TenantDocument | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDocuments = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get tenant info including owner_id
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, owner_id, property:properties(owner_id)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    if (!tenant) {
      setLoading(false)
      return
    }

    // Handle Supabase array join
    const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property
    const ownerId = property?.owner_id || tenant.owner_id

    // Get workspace_id from workspaces table via owner
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", ownerId)
      .single()

    setTenantInfo({
      id: tenant.id,
      workspace_id: workspace?.id || "",
      owner_id: ownerId,
    })

    // Fetch documents
    const { data: docs } = await supabase
      .from("tenant_documents")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("uploaded_at", { ascending: false })

    setDocuments(docs || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleDelete = async () => {
    if (!documentToDelete) return

    setDeleting(true)
    const supabase = createClient()

    // Delete from storage first
    try {
      const url = new URL(documentToDelete.file_url)
      const path = url.pathname.split("/storage/v1/object/public/tenant-documents/")[1]
      if (path) {
        await supabase.storage.from("tenant-documents").remove([path])
      }
    } catch (e) {
      console.error("Error deleting file from storage:", e)
    }

    // Delete from database
    const { error } = await supabase
      .from("tenant_documents")
      .delete()
      .eq("id", documentToDelete.id)

    setDeleting(false)
    setDeleteDialogOpen(false)
    setDocumentToDelete(null)

    if (error) {
      toast.error("Failed to delete document")
      return
    }

    toast.success("Document deleted")
    fetchDocuments()
  }

  const confirmDelete = (doc: TenantDocument) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }


  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/")
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Documents</h1>
          <p className="text-muted-foreground">Upload and manage your documents</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Document Verification</p>
              <p className="text-blue-700">
                Documents you upload will be reviewed by the property administrator.
                Once approved, you can reference them in any issue reports to avoid re-uploading.
                <span className="font-medium"> Approved documents cannot be deleted.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{documents.length}</p>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === "approved").length}
            </p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {documents.filter(d => d.status === "pending").length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const statusMapping = docStatusMap[doc.status]
            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Document Icon */}
                    <div className="p-3 bg-muted rounded-lg">
                      {isImage(doc.mime_type) ? (
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <File className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{doc.name}</h3>
                        <StatusBadge variant={statusMapping?.variant} label={statusMapping?.label} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Uploaded on {formatDate(doc.uploaded_at)}
                        {doc.reviewed_at && ` • Reviewed on ${formatDate(doc.reviewed_at)}`}
                      </p>
                      {doc.review_notes && doc.status === "rejected" && (
                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                          Rejection reason: {doc.review_notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </a>
                      {doc.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Dialog */}
      {tenantInfo && (
        <DocumentUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tenantId={tenantInfo.id}
          workspaceId={tenantInfo.workspace_id}
          ownerId={tenantInfo.owner_id}
          onSuccess={fetchDocuments}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
