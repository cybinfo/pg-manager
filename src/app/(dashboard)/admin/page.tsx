"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column } from "@/components/ui/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Shield,
  Building2,
  Users,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Home,
  Receipt,
  CreditCard,
  Activity,
  X
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
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

interface WorkspaceDetails {
  properties: { id: string; name: string; address: string; total_rooms: number }[]
  tenants: { id: string; name: string; phone: string; status: string }[]
  recentActivity: { id: string; action: string; entity_type: string; occurred_at: string }[]
  stats: {
    total_bills: number
    total_payments: number
    total_collected: number
    occupancy_rate: number
  }
}

export default function AdminExplorerPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Explore dialog state
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [workspaceDetails, setWorkspaceDetails] = useState<WorkspaceDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

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
    await fetchWorkspaces()
  }

  const fetchWorkspaces = async () => {
    setRefreshing(true)
    const supabase = createClient()

    // Fetch all workspaces using SECURITY DEFINER function (bypasses RLS)
    const { data: workspacesData, error: wsError } = await (supabase.rpc as Function)("get_all_workspaces_admin")

    if (wsError) {
      console.error("Error fetching workspaces:", wsError)
    }

    if (workspacesData) {
      type WorkspaceData = {
        id: string
        name: string
        created_at: string
        owner_user_id: string
        owner_name: string
        owner_email: string
        total_properties?: number
        total_rooms?: number
        total_tenants?: number
      }
      const enrichedWorkspaces = (workspacesData as WorkspaceData[]).map((ws) => ({
        ...ws,
        total_properties: ws.total_properties || 0,
        total_rooms: ws.total_rooms || 0,
        total_tenants: ws.total_tenants || 0
      }))
      setWorkspaces(enrichedWorkspaces)
    }

    setLoading(false)
    setRefreshing(false)
  }

  const handleExplore = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    setLoadingDetails(true)
    setWorkspaceDetails(null)

    const supabase = createClient()

    try {
      // Fetch workspace details using admin function
      const { data: details, error } = await (supabase.rpc as Function)("get_workspace_details_admin", { p_workspace_id: workspace.id })

      if (error) {
        console.error("Error fetching workspace details:", error)
        // Set empty details on error
        setWorkspaceDetails({
          properties: [],
          tenants: [],
          recentActivity: [],
          stats: { total_bills: 0, total_payments: 0, total_collected: 0, occupancy_rate: 0 }
        })
      } else if (details) {
        setWorkspaceDetails(details as WorkspaceDetails)
      }
    } catch (err) {
      console.error("Error:", err)
      setWorkspaceDetails({
        properties: [],
        tenants: [],
        recentActivity: [],
        stats: { total_bills: 0, total_payments: 0, total_collected: 0, occupancy_rate: 0 }
      })
    }

    setLoadingDetails(false)
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

  const workspaceColumns: Column<Workspace>[] = [
    {
      key: "name",
      header: "Workspace",
      width: "primary",
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
      width: "secondary",
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
      width: "tertiary",
      hideOnMobile: true,
      render: (ws) => (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1" title="Properties">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {ws.total_properties}
          </span>
          <span className="flex items-center gap-1" title="Rooms">
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
            {ws.total_rooms}
          </span>
          <span className="flex items-center gap-1" title="Tenants">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {ws.total_tenants}
          </span>
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      width: "actions",
      render: (ws) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleExplore(ws)
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Explore
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admin"
        description="Browse and explore all workspaces"
        icon={Shield}
        breadcrumbs={[{ label: "Admin" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchWorkspaces()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{workspaces.length}</span> workspaces
        <span>•</span>
        <span className="font-medium text-foreground">{workspaces.reduce((sum, ws) => sum + ws.total_properties, 0)}</span> properties
        <span>•</span>
        <span className="font-medium text-foreground">{workspaces.reduce((sum, ws) => sum + ws.total_tenants, 0)}</span> tenants
      </div>

      {/* Workspaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Workspaces</CardTitle>
          <CardDescription>
            Click Explore to view workspace details
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
            emptyState={
              <div className="flex flex-col items-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No workspaces found</h3>
                <p className="text-muted-foreground">No workspaces have been created yet</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Workspace Details Dialog */}
      <Dialog open={!!selectedWorkspace} onOpenChange={(open) => !open && setSelectedWorkspace(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedWorkspace?.name}
            </DialogTitle>
            <DialogDescription>
              Owner: {selectedWorkspace?.owner_name} ({selectedWorkspace?.owner_email})
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workspaceDetails ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs">Properties</span>
                  </div>
                  <div className="text-2xl font-bold">{workspaceDetails.properties.length}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Tenants</span>
                  </div>
                  <div className="text-2xl font-bold">{workspaceDetails.tenants.length}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs">Bills</span>
                  </div>
                  <div className="text-2xl font-bold">{workspaceDetails.stats.total_bills}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs">Collected</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(workspaceDetails.stats.total_collected)}</div>
                </div>
              </div>

              {/* Properties List */}
              {workspaceDetails.properties.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Properties ({workspaceDetails.properties.length})
                  </h4>
                  <div className="space-y-2">
                    {workspaceDetails.properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div>
                          <div className="font-medium">{property.name}</div>
                          <div className="text-xs text-muted-foreground">{property.address}</div>
                        </div>
                        <Badge variant="secondary">{property.total_rooms} rooms</Badge>
                      </div>
                    ))}
                    {workspaceDetails.properties.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{workspaceDetails.properties.length - 5} more properties
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Active Tenants */}
              {workspaceDetails.tenants.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Tenants ({workspaceDetails.tenants.length})
                  </h4>
                  <div className="space-y-2">
                    {workspaceDetails.tenants.slice(0, 5).map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                            {tenant.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">{tenant.phone}</div>
                          </div>
                        </div>
                        <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                          {tenant.status}
                        </Badge>
                      </div>
                    ))}
                    {workspaceDetails.tenants.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{workspaceDetails.tenants.length - 5} more tenants
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {workspaceDetails.recentActivity.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </h4>
                  <div className="space-y-2">
                    {workspaceDetails.recentActivity.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            event.action === "create" ? "default" :
                            event.action === "delete" ? "destructive" : "secondary"
                          }>
                            {event.action}
                          </Badge>
                          <span className="text-sm capitalize">{event.entity_type}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state if no data */}
              {workspaceDetails.properties.length === 0 &&
               workspaceDetails.tenants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>This workspace has no properties or tenants yet</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
