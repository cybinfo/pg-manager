"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
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
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { formatDate, formatTimeAgo } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { useTenantPortalData } from "@/lib/hooks/useTenantPortalData"
import { COMPLAINT_CATEGORIES } from "@/lib/status"

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

const categoryOptions = Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => ({ value, label }))
const categoryLabels = COMPLAINT_CATEGORIES

export default function TenantComplaintsPage() {
  const { tenant, tenantContext, user, loading: tenantLoading } = useTenantPortalData()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: "other",
    title: "",
    description: "",
  })

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant || !tenantContext) {
      setLoading(false)
      return
    }

    const fetchComplaints = async () => {
      const supabase = createClient()

      // Fetch complaints
      const { data: complaintsData } = await supabase
        .from("complaints")
        .select("*")
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      setComplaints(complaintsData || [])
      setLoading(false)
    }

    fetchComplaints()
  }, [tenant, tenantContext, tenantLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tenantContext || !formData.title) {
      showError("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      // Get owner_id from property
      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", tenantContext.property_id)
        .single()

      if (!property) {
        showError("Property not found")
        return
      }

      const { data, error } = await supabase
        .from("complaints")
        .insert(withCreatedBy({
          owner_id: property.owner_id,
          tenant_id: tenantContext.id,
          property_id: tenantContext.property_id,
          room_id: tenantContext.room_id,
          category: formData.category,
          title: formData.title,
          description: formData.description || null,
          status: "open",
          priority: "medium",
        }, user?.id ?? ""))
        .select()
        .single()

      if (error) throw error

      setComplaints([data, ...complaints])
      setFormData({ category: "other", title: "", description: "" })
      setShowForm(false)
      showSuccess("Complaint submitted successfully")
    } catch (error: any) {
      showError(error.message || "Failed to submit complaint")
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

  if (tenantLoading || loading) {
    return <PageSkeleton variant="list" />
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
              <FormField label="Category" htmlFor="category">
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={categoryOptions}
                />
              </FormField>

              <FormField label="Title" htmlFor="title" required>
                <Input
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Details" htmlFor="description" hint="Provide as much detail as possible to help resolve the issue faster">
                <textarea
                  placeholder="Provide more details about the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </FormField>

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
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
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
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
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
                {openComplaints.map((complaint) => (
                  <Card key={complaint.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={complaint.status as "open" | "acknowledged" | "in_progress" | "resolved" | "closed"} />
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
                ))}
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
                            <StatusBadge status={complaint.status as "resolved" | "closed"} />
                            <span className="text-xs text-muted-foreground">
                              {categoryLabels[complaint.category] || complaint.category}
                            </span>
                          </div>
                          <h4 className="font-medium">{complaint.title}</h4>
                          {complaint.resolution_notes && (
                            <div className="mt-2 p-2 bg-success/10 rounded text-sm">
                              <p className="text-xs text-success font-medium mb-1">Resolution:</p>
                              <p className="text-success">{complaint.resolution_notes}</p>
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
