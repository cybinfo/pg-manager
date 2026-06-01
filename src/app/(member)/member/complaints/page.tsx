"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  X,
  Send,
  AlertCircle,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { formatDate, formatTimeAgo } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"
import { useMemberComplaints } from "@/lib/hooks/useMemberComplaints"
import { COMPLAINT_CATEGORIES, COMPLAINT_CATEGORY_OPTIONS } from "@/lib/status"

const categoryOptions = COMPLAINT_CATEGORY_OPTIONS
const categoryLabels = COMPLAINT_CATEGORIES

export default function MemberComplaintsPage() {
  const { member, user, loading: memberLoading } = useMemberPortalData()
  const { complaints, loading, setComplaints } = useMemberComplaints(member, user, memberLoading)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: "other",
    title: "",
    description: "",
  })


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member || !user || !formData.title.trim()) {
      showError("Please fill in the complaint title")
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      // Get owner_id from library
      const { data: library } = await supabase
        .from("entities")
        .select("owner_id").eq("type", "library")
        .eq("id", member.entity_id)
        .single()

      if (!library) {
        showError("Library not found")
        return
      }

      const { data, error } = await supabase
        .from("complaints")
        .insert(withCreatedBy({
          owner_id: library.owner_id,
          entity_id: member.entity_id,
          category: formData.category,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: "open",
          priority: "medium",
        }, user.id))
        .select("id, category, title, description, status, priority, resolution_notes, created_at, resolved_at")
        .single()

      if (error) throw error

      setComplaints([data, ...complaints])
      setFormData({ category: "other", title: "", description: "" })
      setShowForm(false)
      showSuccess("Complaint submitted successfully")
    } catch (error: unknown) {
      showError((error as Error).message || "Failed to submit complaint")
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

  if (memberLoading || loading) {
    return <PageSkeleton variant="list" />
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Report issues and track their resolution</p>
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
                <CardDescription>Describe the issue you&apos;re facing at the library</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close form</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Category" htmlFor="complaint-category">
                <Select
                  id="complaint-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={categoryOptions}
                />
              </FormField>

              <FormField label="Title" htmlFor="complaint-title" required>
                <Input
                  id="complaint-title"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </FormField>

              <FormField
                label="Details"
                htmlFor="complaint-description"
                hint="Provide as much detail as possible to help resolve the issue faster"
              >
                <Textarea
                  id="complaint-description"
                  placeholder="Describe the issue in more detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
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
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
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
