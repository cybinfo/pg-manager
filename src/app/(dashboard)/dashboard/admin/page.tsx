"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column } from "@/components/ui/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Building2,
  Users,
  Activity,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Database,
  Clock
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { formatCurrency } from "@/lib/format"

interface Workspace {
  id: string
  name: string
  created_at: string
  owner_user_id: string
  owner_name?: string
  owner_email?: string
  total_properties: number
  total_tenants: number
  total_rooms: number
}

interface AuditEvent {
  id: string
  occurred_at: string
  action: string
  entity_type: string
  entity_id: string
  actor_email?: string
  workspace_name?: string
}

interface PlatformStats {
  total_workspaces: number
  total_owners: number
  total_tenants: number
  total_properties: number
  total_rooms: number
  total_bills: number
  total_payments: number
  active_tenants: number
}

export default function AdminExplorerPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [activeTab, setActiveTab] = useState("workspaces")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    checkAdminAndFetchData()
  }, [user])

  const checkAdminAndFetchData = async () => {
    if (!user) return

    const supabase = createClient()

    // Check if user is platform admin
    const { data: adminCheck } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single()

    if (!adminCheck) {
      setIsPlatformAdmin(false)
      setLoading(false)
      return
    }

    setIsPlatformAdmin(true)
    await fetchData()
  }

  const fetchData = async () => {
    setRefreshing(true)
    const supabase = createClient()

    // Fetch all workspaces using SECURITY DEFINER function (bypasses RLS)
    const { data: workspacesData, error: wsError } = await supabase
      .rpc("get_all_workspaces_admin")

    if (wsError) {
      console.error("Error fetching workspaces:", wsError)
    }

    if (workspacesData) {
      // Map to expected format - function now returns stats
      const enrichedWorkspaces = workspacesData.map((ws: {
        id: string
        name: string
        created_at: string
        owner_user_id: string
        owner_name: string
        owner_email: string
        total_properties?: number
        total_rooms?: number
        total_tenants?: number
      }) => ({
        ...ws,
        total_properties: ws.total_properties || 0,
        total_rooms: ws.total_rooms || 0,
        total_tenants: ws.total_tenants || 0
      }))
      setWorkspaces(enrichedWorkspaces)
    }

    // Fetch platform stats using SECURITY DEFINER function
    const { data: statsData, error: statsError } = await supabase
      .rpc("get_platform_stats_admin")

    if (statsError) {
      console.error("Error fetching stats:", statsError)
    }

    if (statsData) {
      setStats(statsData as PlatformStats)
    }

    // Fetch audit events using SECURITY DEFINER function
    const { data: auditData, error: auditError } = await supabase
      .rpc("get_audit_events_admin", { p_limit: 50 })

    if (auditError) {
      console.error("Error fetching audit events:", auditError)
    }

    if (auditData && Array.isArray(auditData)) {
      setAuditEvents(auditData as AuditEvent[])
    } else {
      setAuditEvents([])
    }

    setLoading(false)
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You do not have platform administrator privileges.
        </p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const metricsItems: MetricItem[] = stats ? [
    { label: "Workspaces", value: stats.total_workspaces, icon: Database },
    { label: "Owners", value: stats.total_owners, icon: Users },
    { label: "Properties", value: stats.total_properties, icon: Building2 },
    { label: "Active Tenants", value: stats.active_tenants, icon: Users },
  ] : []

  const workspaceColumns: Column<Workspace>[] = [
    {
      key: "name",
      header: "Workspace",
      render: (ws) => (
        <div>
          <div className="font-medium">{ws.name}</div>
          <div className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(ws.created_at), { addSuffix: true })}
          </div>
        </div>
      )
    },
    {
      key: "owner",
      header: "Owner",
      render: (ws) => (
        <div>
          <div className="font-medium">{ws.owner_name}</div>
          <div className="text-xs text-muted-foreground">{ws.owner_email}</div>
        </div>
      )
    },
    {
      key: "stats",
      header: "Stats",
      render: (ws) => (
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {ws.total_properties}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {ws.total_tenants}
          </span>
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      render: (ws) => (
        <Button variant="ghost" size="sm" className="gap-1">
          <ExternalLink className="h-3.5 w-3.5" />
          Explore
        </Button>
      )
    }
  ]

  const auditColumns: Column<AuditEvent>[] = [
    {
      key: "occurred_at",
      header: "Time",
      render: (event) => (
        <div className="text-sm">
          {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
        </div>
      )
    },
    {
      key: "action",
      header: "Action",
      render: (event) => (
        <Badge variant={
          event.action === "create" ? "default" :
          event.action === "update" ? "secondary" :
          event.action === "delete" ? "destructive" : "outline"
        }>
          {event.action}
        </Badge>
      )
    },
    {
      key: "entity",
      header: "Entity",
      render: (event) => (
        <div>
          <div className="font-medium capitalize">{event.entity_type}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {event.entity_id.slice(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: "workspace",
      header: "Workspace",
      render: (event) => (
        <span className="text-sm">{event.workspace_name}</span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admin"
        description="Cross-workspace explorer and audit tools"
        icon={Shield}
        breadcrumbs={[{ label: "Admin" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {stats && <MetricsBar items={metricsItems} />}

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total_rooms || 0}</div>
            <p className="text-xs text-muted-foreground">Total Rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total_tenants || 0}</div>
            <p className="text-xs text-muted-foreground">Total Tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total_bills || 0}</div>
            <p className="text-xs text-muted-foreground">Total Bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total_payments || 0}</div>
            <p className="text-xs text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workspaces" className="gap-2">
            <Database className="h-4 w-4" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Activity className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspaces" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Workspaces</CardTitle>
              <CardDescription>
                Browse and explore all workspaces on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={workspaces}
                columns={workspaceColumns}
                keyField="id"
                searchable
                searchFields={["name", "owner_name", "owner_email"]}
                searchPlaceholder="Search workspaces..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Platform-wide audit log of all changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={auditEvents}
                columns={auditColumns}
                keyField="id"
                searchable
                searchFields={["action", "entity_type", "workspace_name"]}
                searchPlaceholder="Search audit events..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
