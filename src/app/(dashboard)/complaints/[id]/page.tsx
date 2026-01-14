"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
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
import { toast } from "sonner"
import { formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge"

interface Complaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  tenant: {
    id: string
    name: string
    phone: string
  } | null
  property: {
    id: string
    name: string
    address: string | null
    city: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

interface RawComplaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  tenant: {
    id: string
    name: string
    phone: string
  }[] | null
  property: {
    id: string
    name: string
    address: string | null
    city: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
}

// Status labels for toast messages and dropdown options
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
  const router = useRouter()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)

  const [editData, setEditData] = useState({
    status: "",
    priority: "",
    assigned_to: "",
    resolution_notes: "",
  })

  useEffect(() => {
    const fetchComplaint = async () => {
      const complaintId = params.id as string
      if (!complaintId) {
        router.push("/complaints")
        return
      }

      const supabase = createClient()

      const { data, error } = await supabase
        .from("complaints")
        .select(`
          *,
          tenant:tenants(id, name, phone),
          property:properties(id, name, address, city),
          room:rooms(id, room_number)
        `)
        .eq("id", complaintId)
        .single()

      if (error || !data) {
        console.error("Error fetching complaint:", error)
        toast.error("Complaint not found")
        router.push("/complaints")
        return
      }

      // Transform the data from arrays to single objects
      const rawData = data as unknown as RawComplaint
      const transformedData: Complaint = {
        ...rawData,
        tenant: transformJoin(rawData.tenant),
        property: transformJoin(rawData.property),
        room: transformJoin(rawData.room),
      }
      setComplaint(transformedData)
      setEditData({
        status: rawData.status,
        priority: rawData.priority,
        assigned_to: rawData.assigned_to || "",
        resolution_notes: rawData.resolution_notes || "",
      })
      setLoading(false)
    }

    fetchComplaint()
  }, [params.id, router])

  const handleStatusChange = async (newStatus: string) => {
    if (!complaint) return

    setUpdating(true)

    try {
      const supabase = createClient()

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      // Set resolved_at when status changes to resolved
      if (newStatus === "resolved" && complaint.status !== "resolved") {
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await (supabase
        .from("complaints") as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq("id", complaint.id)

      if (error) {
        toast.error("Failed to update status")
        return
      }

      setComplaint({ ...complaint, ...updateData })
      toast.success(`Status updated to ${statusLabels[newStatus] || newStatus}`)
    } catch (error) {
      toast.error("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleSave = async () => {
    if (!complaint) return

    setUpdating(true)

    try {
      const supabase = createClient()

      const updateData: any = {
        status: editData.status,
        priority: editData.priority,
        assigned_to: editData.assigned_to || null,
        resolution_notes: editData.resolution_notes || null,
        updated_at: new Date().toISOString(),
      }

      // Set resolved_at when status changes to resolved
      if (editData.status === "resolved" && complaint.status !== "resolved") {
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await (supabase
        .from("complaints") as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq("id", complaint.id)

      if (error) {
        toast.error("Failed to update complaint")
        return
      }

      setComplaint({ ...complaint, ...updateData })
      setEditing(false)
      toast.success("Complaint updated successfully")
    } catch (error) {
      toast.error("Failed to update complaint")
    } finally {
      setUpdating(false)
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
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={updating}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updating}>
                {updating ? (
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
                      disabled={updating}
                    >
                      {updating ? (
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
              <InfoRow
                label="Phone"
                value={
                  <a href={`tel:${complaint.tenant.phone}`} className="text-primary hover:underline flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {complaint.tenant.phone}
                  </a>
                }
              />
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
