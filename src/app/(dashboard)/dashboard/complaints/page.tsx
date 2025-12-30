"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import {
  MessageSquare,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  Wrench,
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

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "error" | "muted" }> = {
  open: { label: "Open", variant: "error" },
  acknowledged: { label: "Acknowledged", variant: "warning" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
}

const priorityConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "muted" }> = {
  low: { label: "Low", variant: "muted" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "error" },
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

interface Property {
  id: string
  name: string
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchComplaints = async () => {
      const supabase = createClient()

      // Fetch properties for filter
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")
      setProperties(propertiesData || [])

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

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "open", label: "Open" },
        { value: "acknowledged", label: "Acknowledged" },
        { value: "in_progress", label: "In Progress" },
        { value: "resolved", label: "Resolved" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      placeholder: "All Priority",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      placeholder: "All Categories",
      options: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    },
  ]

  const filteredComplaints = complaints.filter((complaint) => {
    if (filters.property && filters.property !== "all" && complaint.property?.id !== filters.property) {
      return false
    }
    if (filters.status && filters.status !== "all" && complaint.status !== filters.status) {
      return false
    }
    if (filters.priority && filters.priority !== "all" && complaint.priority !== filters.priority) {
      return false
    }
    if (filters.category && filters.category !== "all" && complaint.category !== filters.category) {
      return false
    }
    return true
  })

  // Stats
  const openCount = complaints.filter((c) => c.status === "open").length
  const inProgressCount = complaints.filter((c) => c.status === "in_progress" || c.status === "acknowledged").length
  const resolvedCount = complaints.filter((c) => c.status === "resolved" || c.status === "closed").length
  const urgentCount = complaints.filter((c) => c.priority === "urgent" && c.status !== "resolved" && c.status !== "closed").length

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

  const metricsItems: MetricItem[] = [
    { label: "Open", value: openCount, icon: AlertCircle, highlight: openCount > 0 },
    { label: "In Progress", value: inProgressCount, icon: Wrench },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle },
    { label: "Urgent", value: urgentCount, icon: Clock, highlight: urgentCount > 0 },
  ]

  const columns: Column<Complaint>[] = [
    {
      key: "title",
      header: "Complaint",
      width: "primary",
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TableBadge variant={priorityConfig[row.priority]?.variant || "default"}>
              {priorityConfig[row.priority]?.label || row.priority}
            </TableBadge>
            <span className="text-xs text-muted-foreground">
              {categoryLabels[row.category] || row.category}
            </span>
          </div>
          <div className="font-medium truncate">{row.title}</div>
          {row.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      width: "secondary",
      render: (row) => (
        <div className="text-sm">
          {row.tenant && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              {row.tenant.name}
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" />
            {row.property?.name}
            {row.room && `, ${row.room.room_number}`}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (row) => (
        <StatusDot
          status={statusConfig[row.status]?.variant || "muted"}
          label={statusConfig[row.status]?.label || row.status}
        />
      ),
    },
    {
      key: "created_at",
      header: "Created",
      width: "date",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {getTimeAgo(row.created_at)}
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        description="Manage tenant complaints and issues"
        icon={MessageSquare}
        actions={
          <Link href="/dashboard/complaints/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              New Complaint
            </Button>
          </Link>
        }
      />

      <MetricsBar items={metricsItems} />

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredComplaints}
        keyField="id"
        href={(row) => `/dashboard/complaints/${row.id}`}
        searchable
        searchPlaceholder="Search by title, tenant, or property..."
        searchFields={["title", "description"] as (keyof Complaint)[]}
        emptyState={
          <div className="flex flex-col items-center py-8">
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
          </div>
        }
      />
    </div>
  )
}
