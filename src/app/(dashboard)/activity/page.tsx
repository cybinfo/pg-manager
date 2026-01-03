"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth, useCurrentContext } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Activity,
  Loader2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  User,
  Building2,
  Users,
  Receipt,
  CreditCard,
  Clock
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"

interface AuditEvent {
  id: string
  occurred_at: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  workspace_id: string
}

const ACTION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Plus }> = {
  create: { label: "Created", variant: "default", icon: Plus },
  update: { label: "Updated", variant: "secondary", icon: Edit },
  delete: { label: "Deleted", variant: "destructive", icon: Trash2 },
  view: { label: "Viewed", variant: "outline", icon: Eye },
}

const ENTITY_CONFIG: Record<string, { label: string; icon: typeof User }> = {
  tenant: { label: "Tenant", icon: User },
  tenants: { label: "Tenant", icon: User },
  property: { label: "Property", icon: Building2 },
  properties: { label: "Property", icon: Building2 },
  room: { label: "Room", icon: Building2 },
  rooms: { label: "Room", icon: Building2 },
  bill: { label: "Bill", icon: Receipt },
  bills: { label: "Bill", icon: Receipt },
  payment: { label: "Payment", icon: CreditCard },
  payments: { label: "Payment", icon: CreditCard },
  staff: { label: "Staff", icon: Users },
  role: { label: "Role", icon: Users },
  roles: { label: "Role", icon: Users },
}

export default function ActivityLogPage() {
  const { user } = useAuth()
  const { context } = useCurrentContext()
  const workspaceId = context?.workspace_id
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    if (workspaceId) {
      fetchEvents()
    }
  }, [workspaceId])

  const fetchEvents = async () => {
    if (!workspaceId) return

    setRefreshing(true)
    const supabase = createClient()

    // Fetch audit events for current workspace
    const { data, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("occurred_at", { ascending: false })
      .limit(200)

    if (error) {
      console.error("Error fetching audit events:", error)
      toast.error("Failed to load activity log")
    } else {
      setEvents(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "action",
      label: "Action",
      type: "select",
      placeholder: "All Actions",
      options: [
        { value: "create", label: "Created" },
        { value: "update", label: "Updated" },
        { value: "delete", label: "Deleted" },
      ],
    },
    {
      id: "entity",
      label: "Entity Type",
      type: "select",
      placeholder: "All Types",
      options: [
        { value: "tenant", label: "Tenants" },
        { value: "property", label: "Properties" },
        { value: "room", label: "Rooms" },
        { value: "bill", label: "Bills" },
        { value: "payment", label: "Payments" },
        { value: "staff", label: "Staff" },
      ],
    },
    {
      id: "date",
      label: "Date",
      type: "date-range",
    },
  ]

  // Apply filters
  const filteredEvents = events.filter((event) => {
    if (filters.action && filters.action !== "all" && event.action !== filters.action) {
      return false
    }
    if (filters.entity && filters.entity !== "all") {
      const entityLower = event.entity_type.toLowerCase()
      if (!entityLower.includes(filters.entity)) {
        return false
      }
    }
    if (filters.date_from) {
      const eventDate = new Date(event.occurred_at)
      const fromDate = new Date(filters.date_from)
      if (eventDate < fromDate) return false
    }
    if (filters.date_to) {
      const eventDate = new Date(event.occurred_at)
      const toDate = new Date(filters.date_to)
      toDate.setHours(23, 59, 59, 999)
      if (eventDate > toDate) return false
    }
    return true
  })

  // Metrics
  const todayCount = events.filter(e => {
    const today = new Date()
    const eventDate = new Date(e.occurred_at)
    return eventDate.toDateString() === today.toDateString()
  }).length

  const createCount = events.filter(e => e.action === "create").length
  const updateCount = events.filter(e => e.action === "update").length
  const deleteCount = events.filter(e => e.action === "delete").length

  const metricsItems: MetricItem[] = [
    { label: "Today", value: todayCount, icon: Clock },
    { label: "Created", value: createCount, icon: Plus },
    { label: "Updated", value: updateCount, icon: Edit },
    { label: "Deleted", value: deleteCount, icon: Trash2 },
  ]

  const columns: Column<AuditEvent>[] = [
    {
      key: "occurred_at",
      header: "When",
      width: "tertiary",
      render: (event) => (
        <div className="text-sm">
          <div className="font-medium">
            {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(event.occurred_at), "MMM d, h:mm a")}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "badge",
      render: (event) => {
        const config = ACTION_CONFIG[event.action] || { label: event.action, variant: "outline" as const, icon: Activity }
        return (
          <TableBadge variant={
            config.variant === "default" ? "success" :
            config.variant === "destructive" ? "error" :
            config.variant === "secondary" ? "warning" : "default"
          }>
            {config.label}
          </TableBadge>
        )
      },
    },
    {
      key: "entity_type",
      header: "What",
      width: "primary",
      render: (event) => {
        const entityKey = event.entity_type.toLowerCase()
        const config = ENTITY_CONFIG[entityKey] || { label: event.entity_type, icon: Activity }
        const Icon = config.icon
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">{config.label}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {event.entity_id.slice(0, 8)}...
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: "actor",
      header: "Who",
      width: "secondary",
      hideOnMobile: true,
      render: (event) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-medium">
            {(event.actor_name || event.actor_email || "S")[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium">
              {event.actor_name || "System"}
            </div>
            {event.actor_email && (
              <div className="text-xs text-muted-foreground">
                {event.actor_email}
              </div>
            )}
          </div>
        </div>
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
    <FeatureGuard feature="activityLog">
      <div className="space-y-6">
        <PageHeader
          title="Activity Log"
          description="Track all changes and actions in your workspace"
          icon={Activity}
          breadcrumbs={[{ label: "Activity Log" }]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents()}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        <MetricsBar items={metricsItems} />

        <ListPageFilters
          filters={filterConfigs}
          values={filters}
          onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
          onClear={() => setFilters({})}
        />

        <DataTable
          columns={columns}
          data={filteredEvents}
          keyField="id"
          searchable
          searchPlaceholder="Search activity..."
          searchFields={["action", "entity_type", "actor_email", "actor_name"]}
          emptyState={
            <div className="flex flex-col items-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-muted-foreground text-center">
                {events.length === 0
                  ? "Activity will appear here as changes are made"
                  : "No activity matches your filters"}
              </p>
            </div>
          }
        />
      </div>
    </FeatureGuard>
  )
}
