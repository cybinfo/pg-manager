"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, COMPLAINT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Complaint } from "@/types/complaints.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
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
  MapPin,
  FileText,
  ClipboardList,
  Wrench,
} from "lucide-react"
import { RoomLink, TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge"

const statusLabels: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
}

const categoryLabels: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture",
  cleanliness: "Cleanliness",
  appliances: "Appliances",
  security: "Security",
  noise: "Noise/Disturbance",
  other: "Other",
}

const statusFlow = ["open", "acknowledged", "in_progress", "resolved", "closed"]

export default function ComplaintDetailPage() {
  const params = useParams()
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

  // Initialize edit data when complaint loads
  if (complaint && !editData.status) {
    setEditData({
      status: complaint.status,
      priority: complaint.priority,
      assigned_to: complaint.assigned_to || "",
      resolution_notes: complaint.resolution_notes || "",
    })
  }

  const handleStatusChange = async (newStatus: string) => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (newStatus === "resolved" && complaint?.status !== "resolved") {
      updateData.resolved_at = new Date().toISOString()
    }

    await updateFields(updateData)
  }

  const handleSave = async () => {
    const updateData: Record<string, unknown> = {
      status: editData.status,
      priority: editData.priority,
      assigned_to: editData.assigned_to || null,
      resolution_notes: editData.resolution_notes || null,
    }

    if (editData.status === "resolved" && complaint?.status !== "resolved") {
      updateData.resolved_at = new Date().toISOString()
    }

    const success = await updateFields(updateData)
    if (success) {
      setEditing(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading complaint details..." />
  }

  if (!complaint) {
    return null
  }

  const currentStatusIndex = statusFlow.indexOf(complaint.status)

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={complaint.title}
        subtitle={categoryLabels[complaint.category] || complaint.category}
        backHref="/complaints"
        backLabel="All Complaints"
        avatar={
          <div className="p-3 bg-amber-100 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
        }
        status={
          <div className="flex items-center gap-2">
            <PriorityBadge priority={complaint.priority as "low" | "medium" | "high" | "urgent"} />
            <StatusBadge status={complaint.status as "open" | "acknowledged" | "in_progress" | "resolved" | "closed"} />
          </div>
        }
        actions={
          !editing ? (
            <PermissionGate permission="complaints.edit" hide>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </PermissionGate>
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
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
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {statusFlow.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status] || status}
                      </option>
                    ))}
                  </select>
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
          <DetailSection
            title="Resolution Notes"
            description="Notes about how this complaint was resolved"
            icon={FileText}
          >
            {editing ? (
              <textarea
                value={editData.resolution_notes}
                onChange={(e) => setEditData((prev) => ({ ...prev, resolution_notes: e.target.value }))}
                placeholder="Add resolution notes..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            ) : complaint.resolution_notes ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{complaint.resolution_notes}</p>
            ) : (
              <p className="text-muted-foreground italic">No resolution notes yet</p>
            )}
          </DetailSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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
                value={<span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />{formatDateTime(complaint.resolved_at)}</span>}
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
        </div>
      </div>
    </div>
  )
}
