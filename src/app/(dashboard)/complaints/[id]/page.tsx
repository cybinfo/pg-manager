"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  Wrench,
  Eye,
  Building2,
  User,
  Phone,
  Calendar,
  MessageSquare,
  Edit2,
  Save,
  X
} from "lucide-react"
import { PropertyLink, RoomLink, TenantLink } from "@/components/ui/entity-link"
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
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
    return <PageLoader />
  }

  if (!complaint) {
    return null
  }

    const currentStatusIndex = statusFlow.indexOf(complaint.status)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/complaints">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge priority={complaint.priority as "low" | "medium" | "high" | "urgent"} />
              <span className="text-sm text-muted-foreground">
                {categoryLabels[complaint.category] || complaint.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{complaint.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <PermissionGate permission="complaints.edit" hide>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </PermissionGate>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={updating}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updating}>
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <StatusBadge status={complaint.status as "open" | "acknowledged" | "in_progress" | "resolved" | "closed"} size="lg" />
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
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {complaint.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Resolution Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolution Notes</CardTitle>
              <CardDescription>Notes about how this complaint was resolved</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                {editing ? (
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <PriorityBadge priority={complaint.priority as "low" | "medium" | "high" | "urgent"} />
                )}
              </div>

              {/* Assigned To */}
              <div>
                <Label className="text-xs text-muted-foreground">Assigned To</Label>
                {editing ? (
                  <Input
                    value={editData.assigned_to}
                    onChange={(e) => setEditData((prev) => ({ ...prev, assigned_to: e.target.value }))}
                    placeholder="Staff name"
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium">{complaint.assigned_to || "Unassigned"}</p>
                )}
              </div>

              {/* Dates */}
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDateTime(complaint.created_at)}
                </p>
              </div>

              {complaint.resolved_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Resolved</Label>
                  <p className="font-medium flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {formatDateTime(complaint.resolved_at)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complaint.property && (
                <Link href={`/properties/${complaint.property.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{complaint.property.name}</p>
                    {complaint.property.address && (
                      <p className="text-xs text-muted-foreground">
                        {complaint.property.address}, {complaint.property.city}
                      </p>
                    )}
                  </div>
                </Link>
              )}
              {complaint.room && (
                <RoomLink id={complaint.room.id} roomNumber={complaint.room.room_number} />
              )}
            </CardContent>
          </Card>

          {/* Reported By */}
          {complaint.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reported By</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{complaint.tenant.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${complaint.tenant.phone}`} className="text-primary hover:underline">
                    {complaint.tenant.phone}
                  </a>
                </div>
                <Link href={`/tenants/${complaint.tenant.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Tenant Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
