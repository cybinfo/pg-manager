"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  MessageSquare,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  Eye,
  X,
  Send
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatTimeAgo } from "@/lib/format"

interface Complaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
}

interface TenantInfo {
  id: string
  property_id: string
  room_id: string
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  open: { label: "Open", color: "text-red-700", bgColor: "bg-red-100", icon: AlertCircle },
  acknowledged: { label: "Acknowledged", color: "text-blue-700", bgColor: "bg-blue-100", icon: Eye },
  in_progress: { label: "In Progress", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Wrench },
  resolved: { label: "Resolved", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
  closed: { label: "Closed", color: "text-gray-700", bgColor: "bg-gray-100", icon: CheckCircle },
}

const categories = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "furniture", label: "Furniture" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "appliances", label: "Appliances" },
  { value: "security", label: "Security" },
  { value: "noise", label: "Noise/Disturbance" },
  { value: "other", label: "Other" },
]

const categoryLabels: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.value, c.label])
)

export default function TenantComplaintsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: "other",
    title: "",
    description: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, property_id, room_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    if (!tenant) {
      setLoading(false)
      return
    }

    setTenantInfo(tenant)

    // Fetch complaints
    const { data: complaintsData } = await supabase
      .from("complaints")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })

    setComplaints(complaintsData || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tenantInfo || !formData.title) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Get owner_id from property
      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", tenantInfo.property_id)
        .single()

      if (!property) {
        toast.error("Property not found")
        return
      }

      const { data, error } = await supabase
        .from("complaints")
        .insert({
          owner_id: property.owner_id,
          tenant_id: tenantInfo.id,
          property_id: tenantInfo.property_id,
          room_id: tenantInfo.room_id,
          category: formData.category,
          title: formData.title,
          description: formData.description || null,
          status: "open",
          priority: "medium",
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      setComplaints([data, ...complaints])
      setFormData({ category: "other", title: "", description: "" })
      setShowForm(false)
      toast.success("Complaint submitted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to submit complaint")
    } finally {
      setSubmitting(false)
    }
  }


  const openComplaints = complaints.filter((c) =>
    c.status === "open" || c.status === "acknowledged" || c.status === "in_progress"
  )
  const resolvedComplaints = complaints.filter((c) =>
    c.status === "resolved" || c.status === "closed"
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Report issues and track their status</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        )}
      </div>

      {/* New Complaint Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Submit New Complaint</CardTitle>
                <CardDescription>Describe the issue you&apos;re facing</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Details</Label>
                <textarea
                  id="description"
                  placeholder="Provide more details about the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openComplaints.length}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedComplaints.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complaints List */}
      {complaints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No complaints</h3>
            <p className="text-muted-foreground text-center mb-4">
              You haven&apos;t submitted any complaints yet
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Submit First Complaint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open Complaints */}
          {openComplaints.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Open ({openComplaints.length})
              </h3>
              <div className="space-y-3">
                {openComplaints.map((complaint) => {
                  const StatusIcon = statusConfig[complaint.status]?.icon || AlertCircle
                  return (
                    <Card key={complaint.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig[complaint.status]?.bgColor} ${statusConfig[complaint.status]?.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[complaint.status]?.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {categoryLabels[complaint.category] || complaint.category}
                              </span>
                            </div>
                            <h4 className="font-medium">{complaint.title}</h4>
                            {complaint.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {complaint.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted {formatTimeAgo(complaint.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resolved Complaints */}
          {resolvedComplaints.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Resolved ({resolvedComplaints.length})
              </h3>
              <div className="space-y-3">
                {resolvedComplaints.map((complaint) => (
                  <Card key={complaint.id} className="opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {categoryLabels[complaint.category] || complaint.category}
                            </span>
                          </div>
                          <h4 className="font-medium">{complaint.title}</h4>
                          {complaint.resolution_notes && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                              <p className="text-xs text-green-700 font-medium mb-1">Resolution:</p>
                              <p className="text-green-800">{complaint.resolution_notes}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Resolved on {formatDate(complaint.resolved_at || complaint.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
