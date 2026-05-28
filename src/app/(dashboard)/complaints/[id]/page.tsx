"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import Link from "next/link"
import { useDetailPage, COMPLAINT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Complaint } from "@/types/complaints.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import {
  DetailHero,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { Textarea } from "@/components/ui/textarea"
import { PageLoading } from "@/components/ui/loading"
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Building2,
  User,
  Phone,
  Calendar,
  MessageSquare,
  Edit2,
  Save,
  X,
  Trash2,
  MapPin,
  FileText,
  ClipboardList,
  Wrench,
  Clock,
} from "lucide-react"
import { RoomLink, TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatDateTime } from "@/lib/format"
import { getNowISO } from "@/lib/date-helpers"
import { PermissionGate, FeatureGuard } from "@/components/auth"
import { useFeatures } from "@/lib/features/use-features"
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { COMPLAINT_STATUS, COMPLAINT_CATEGORIES } from "@/lib/status"
import { COMPLAINT_PRIORITY_OPTIONS } from "@/lib/constants/form-options"

const statusLabels: Record<string, string> = Object.fromEntries(
  Object.entries(COMPLAINT_STATUS).map(([k, v]) => [k, v.label])
)

const categoryLabels = COMPLAINT_CATEGORIES

const statusFlow = ["open", "acknowledged", "in_progress", "resolved", "closed"]

export default function ComplaintDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const { isFeatureEnabled } = useFeatures()
  const [editing, setEditing] = useState(false)

  const [editData, setEditData] = useState({
    status: "",
    priority: "",
    assigned_to: "",
    resolution_notes: "",
  })

  const {
    data: complaint,
    loading,
    updateFields,
    isSaving,
  } = useDetailPage<Complaint>({
    config: COMPLAINT_DETAIL_CONFIG,
    id: params.id as string,
  })
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/complaints", defaultLabel: "All Complaints" })

  // Initialize edit data when complaint loads
  if (complaint && !editData.status) {
    setEditData({
      status: complaint.status,
      priority: complaint.priority,
      assigned_to: complaint.assigned_to || "",
      resolution_notes: complaint.resolution_notes || "",
    })
  }

  const sendResolvedEmail = async (complaintData: Complaint) => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("email, person:people(email)")
        .eq("id", complaintData.tenant_id)
        .single()

      const email = tenantData?.person?.email || tenantData?.email
      if (!email) return

      const { sendComplaintResolvedEmail } = await import("@/lib/email")
      const categoryLabel = categoryLabels[complaintData.category] || complaintData.category

      sendComplaintResolvedEmail({
        to: email,
        recipientName: complaintData.tenant?.name || "Tenant",
        complaintTitle: complaintData.title,
        category: categoryLabel,
        resolutionNotes: complaintData.resolution_notes,
        resolvedDate: new Date(),
        propertyName: complaintData.property?.name,
      }).catch(() => {}) // non-blocking
    } catch {
      // Non-blocking
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (newStatus === "resolved" && complaint?.status !== "resolved") {
      updateData.resolved_at = getNowISO()
    }

    const success = await updateFields(updateData)

    // Send email when status changes to resolved
    if (success && newStatus === "resolved" && complaint?.status !== "resolved" && complaint) {
      if (isFeatureEnabled("complaints", "resolutionEmail")) {
        sendResolvedEmail(complaint)
      }
    }
  }

  const handleSave = async () => {
    const updateData: Record<string, unknown> = {
      status: editData.status,
      priority: editData.priority,
      assigned_to: editData.assigned_to || null,
      resolution_notes: editData.resolution_notes || null,
    }

    if (editData.status === "resolved" && complaint?.status !== "resolved") {
      updateData.resolved_at = getNowISO()
    }

    const success = await updateFields(updateData)
    if (success) {
      setEditing(false)

      // Send email when status changes to resolved via edit
      if (editData.status === "resolved" && complaint?.status !== "resolved" && complaint) {
        if (isFeatureEnabled("complaints", "resolutionEmail")) {
          sendResolvedEmail({
            ...complaint,
            resolution_notes: editData.resolution_notes || null,
          })
        }
      }
    }
  }

  if (loading) {
    return <PageLoading message="Loading complaint details..." />
  }

  if (!complaint) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const currentStatusIndex = statusFlow.indexOf(complaint.status)

  const isUnresolved = !["resolved", "closed"].includes(complaint.status)
  const daysOpen = Math.floor((Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const isEscalated = isUnresolved && daysOpen >= 3

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={complaint.title}
        subtitle={categoryLabels[complaint.category] || complaint.category}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: complaint.title || "Details" },
        ]}
        avatar={
          <div className="p-3 bg-warning/10 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
        }
        status={
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={complaint.priority as "low" | "medium" | "high" | "urgent"} />
            <StatusBadge status={complaint.status as "open" | "acknowledged" | "in_progress" | "resolved" | "closed"} />
            <FeatureGuard module="complaints" feature="complaintEscalation">
              {isEscalated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  <Clock className="h-3 w-3" />
                  {daysOpen}d open
                </span>
              )}
            </FeatureGuard>
          </div>
        }
        actions={
          !editing ? (
            <div className="flex items-center gap-2">
              <PermissionGate permission="complaints.edit" hide>
                <Link href={`/complaints/${params.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission="complaints.delete" hide>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (!user?.id) return
                    confirm({
                      title: "Delete Complaint",
                      description: "Are you sure you want to delete this complaint? This action cannot be undone.",
                      destructive: true,
                      onConfirm: async () => {
                        try {
                          const result = await softDelete("complaints", params.id as string, user.id)
                          if (!result.error) {
                            showSuccess("Complaint deleted successfully")
                            router.push("/complaints")
                          } else {
                            showError(result.error.message || "Failed to delete complaint")
                          }
                        } catch {
                          showError("Failed to delete complaint")
                        }
                      },
                    })
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          )
        }
      />

      <DetailPageTemplate layoutKey="complaint-detail" entityType="complaint" record={complaint}>
        <FeatureGuard module="complaints" feature="complaintEscalation">
          {isEscalated && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">Escalation Required</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  This complaint has been open for <strong>{daysOpen} days</strong> without resolution.
                </p>
              </div>
            </div>
          )}
        </FeatureGuard>

        {/* Main Content - Status Section */}
          {/* Status Actions */}
          <DetailSection
            title="Status"
            description="Current status and workflow"
            icon={ClipboardList}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={complaint.status as "open" | "acknowledged" | "in_progress" | "resolved" | "closed"}
                  size="lg"
                />
              </div>

              {/* Status Flow Buttons */}
              {!editing && complaint.status !== "closed" && (
                <div className="flex flex-wrap gap-2">
                  {statusFlow.slice(currentStatusIndex + 1).map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : null}
                      Mark as {statusLabels[status] || status}
                    </Button>
                  ))}
                </div>
              )}

              {editing && (
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <Select
                    value={editData.status}
                    onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                    options={statusFlow.map((status) => ({
                      value: status,
                      label: statusLabels[status] || status,
                    }))}
                  />
                </div>
              )}
            </div>
          </DetailSection>

          {/* Description */}
          <DetailSection
            title="Description"
            description="Details about the complaint"
            icon={MessageSquare}
          >
            {complaint.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description provided</p>
            )}
          </DetailSection>

          {/* Resolution Notes */}
          <FeatureGuard module="complaints" feature="complaintResolution">
          <DetailSection
            title="Resolution Notes"
            description="Notes about how this complaint was resolved"
            icon={FileText}
          >
            {editing ? (
              <Textarea
                value={editData.resolution_notes}
                onChange={(e) => setEditData((prev) => ({ ...prev, resolution_notes: e.target.value }))}
                placeholder="Add resolution notes..."
                rows={4}
                className="resize-none"
              />
            ) : complaint.resolution_notes ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{complaint.resolution_notes}</p>
            ) : (
              <p className="text-muted-foreground italic">No resolution notes yet</p>
            )}
          </DetailSection>
          </FeatureGuard>

        {/* Details */}
        <DetailSection
            title="Details"
            description="Complaint information"
            icon={Wrench}
          >
            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              {editing ? (
                <Select
                  value={editData.priority}
                  onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                  options={COMPLAINT_PRIORITY_OPTIONS}
                />
              ) : (
                <div className="pt-1">
                  <PriorityBadge priority={complaint.priority as "low" | "medium" | "high" | "urgent"} />
                </div>
              )}
            </div>

            {/* Assigned To */}
            <div className="space-y-1 mt-4">
              <Label className="text-xs text-muted-foreground">Assigned To</Label>
              {editing ? (
                <Input
                  value={editData.assigned_to}
                  onChange={(e) => setEditData((prev) => ({ ...prev, assigned_to: e.target.value }))}
                  placeholder="Staff name"
                />
              ) : (
                <p className="font-medium pt-1">{complaint.assigned_to || "Unassigned"}</p>
              )}
            </div>

            {/* Dates */}
            <InfoRow
              label="Created"
              value={formatDateTime(complaint.created_at)}
              icon={Calendar}
            />

            {complaint.resolved_at && (
              <InfoRow
                label="Resolved"
                value={<span className="text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" />{formatDateTime(complaint.resolved_at)}</span>}
              />
            )}
          </DetailSection>

          {/* Location */}
          <DetailSection
            title="Location"
            description="Property and room"
            icon={MapPin}
          >
            {complaint.property && (
              <InfoRow
                label="Property"
                value={<PropertyLink id={complaint.property.id} name={complaint.property.name} />}
                icon={Building2}
              />
            )}
            {complaint.property?.address && (
              <InfoRow
                label="Address"
                value={`${complaint.property.address}, ${complaint.property.city}`}
              />
            )}
            {complaint.room && (
              <InfoRow
                label="Room"
                value={<RoomLink id={complaint.room.id} roomNumber={complaint.room.room_number} />}
              />
            )}
          </DetailSection>

          {/* Reported By */}
          {complaint.tenant && (
            <DetailSection
              title="Reported By"
              description="Tenant who filed the complaint"
              icon={User}
            >
              <InfoRow
                label="Name"
                value={<TenantLink id={complaint.tenant.id} name={complaint.tenant.name} />}
              />
              {complaint.tenant.phone && (
                <InfoRow
                  label="Phone"
                  value={
                    <a href={`tel:${complaint.tenant.phone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {complaint.tenant.phone}
                    </a>
                  }
                />
              )}
              <Link href={`/tenants/${complaint.tenant.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Tenant Profile
                </Button>
              </Link>
            </DetailSection>
          )}

      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
