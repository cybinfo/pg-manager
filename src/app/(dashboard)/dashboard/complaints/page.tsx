"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  Wrench,
  Eye,
  Building2,
  User
} from "lucide-react"

interface Complaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  created_at: string
  resolved_at: string | null
  tenant: {
    id: string
    name: string
  } | null
  property: {
    id: string
    name: string
  } | null
  room: {
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
  created_at: string
  resolved_at: string | null
  tenant: {
    id: string
    name: string
  }[] | null
  property: {
    id: string
    name: string
  }[] | null
  room: {
    room_number: string
  }[] | null
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-red-100 text-red-700", icon: AlertCircle },
  acknowledged: { label: "Acknowledged", color: "bg-blue-100 text-blue-700", icon: Eye },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Wrench },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700", icon: CheckCircle },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
}

const categoryLabels: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture",
  cleanliness: "Cleanliness",
  appliances: "Appliances",
  security: "Security",
  noise: "Noise",
  other: "Other",
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  useEffect(() => {
    const fetchComplaints = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("complaints")
        .select(`
          *,
          tenant:tenants(id, name),
          property:properties(id, name),
          room:rooms(room_number)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching complaints:", error)
      } else {
        // Transform the data from arrays to single objects
        const transformedData = ((data as RawComplaint[]) || []).map((complaint) => ({
          ...complaint,
          tenant: complaint.tenant && complaint.tenant.length > 0 ? complaint.tenant[0] : null,
          property: complaint.property && complaint.property.length > 0 ? complaint.property[0] : null,
          room: complaint.room && complaint.room.length > 0 ? complaint.room[0] : null,
        }))
        setComplaints(transformedData)
      }
      setLoading(false)
    }

    fetchComplaints()
  }, [])

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.property?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter
    const matchesPriority = priorityFilter === "all" || complaint.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Stats
  const openCount = complaints.filter((c) => c.status === "open").length
  const inProgressCount = complaints.filter((c) => c.status === "in_progress" || c.status === "acknowledged").length
  const resolvedCount = complaints.filter((c) => c.status === "resolved" || c.status === "closed").length
  const urgentCount = complaints.filter((c) => c.priority === "urgent" && c.status !== "resolved" && c.status !== "closed").length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return "Just now"
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Manage tenant complaints and issues</p>
        </div>
        <Link href="/dashboard/complaints/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Wrench className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
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
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentCount}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, tenant, or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No complaints found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {complaints.length === 0
                ? "No complaints have been reported yet"
                : "No complaints match your search criteria"}
            </p>
            {complaints.length === 0 && (
              <Link href="/dashboard/complaints/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log First Complaint
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((complaint) => {
            const StatusIcon = statusConfig[complaint.status]?.icon || AlertCircle
            return (
              <Link key={complaint.id} href={`/dashboard/complaints/${complaint.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[complaint.priority]?.color || "bg-gray-100"}`}>
                            {priorityConfig[complaint.priority]?.label || complaint.priority}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {categoryLabels[complaint.category] || complaint.category}
                          </span>
                        </div>
                        <h3 className="font-semibold truncate">{complaint.title}</h3>
                        {complaint.description && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {complaint.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {complaint.tenant && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {complaint.tenant.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {complaint.property?.name}
                            {complaint.room && `, Room ${complaint.room.room_number}`}
                          </span>
                        </div>
                      </div>

                      {/* Status & Time */}
                      <div className="flex items-center gap-4 md:flex-col md:items-end">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig[complaint.status]?.color || "bg-gray-100"}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[complaint.status]?.label || complaint.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(complaint.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
