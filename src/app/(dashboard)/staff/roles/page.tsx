"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Shield,
  Plus,
  Loader2,
  ArrowLeft,
  Users,
  Trash2,
  Edit,
  Lock
} from "lucide-react"
import { toast } from "sonner"

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
  permissions: string[]
  created_at: string
  _count?: {
    users: number
  }
}

// Available permissions grouped by module
const permissionGroups = {
  "Properties": ["properties.view", "properties.create", "properties.edit", "properties.delete"],
  "Rooms": ["rooms.view", "rooms.create", "rooms.edit", "rooms.delete"],
  "Tenants": ["tenants.view", "tenants.create", "tenants.edit", "tenants.delete"],
  "Payments": ["payments.view", "payments.create", "payments.edit", "payments.delete"],
  "Meter Readings": ["meter_readings.view", "meter_readings.create", "meter_readings.edit"],
  "Complaints": ["complaints.view", "complaints.create", "complaints.edit", "complaints.resolve"],
  "Notices": ["notices.view", "notices.create", "notices.edit", "notices.delete"],
  "Visitors": ["visitors.view", "visitors.create"],
  "Reports": ["reports.view", "reports.export"],
  "Exit Clearance": ["exit_clearance.initiate", "exit_clearance.process", "exit_clearance.approve"],
  "Staff": ["staff.view", "staff.create", "staff.edit", "staff.delete"],
  "Settings": ["settings.view", "settings.edit"],
}

export default function RolesPage() {
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("is_system_role", { ascending: false })
      .order("name")

    if (error) {
      console.error("Error fetching roles:", error)
      toast.error("Failed to load roles")
    } else {
      // Get user count for each role
      const rolesWithCount = await Promise.all(
        (data || []).map(async (role) => {
          const { count } = await supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role_id", role.id)

          return {
            ...role,
            _count: { users: count || 0 },
          }
        })
      )

      setRoles(rolesWithCount)
    }

    setLoading(false)
  }

  const handleDelete = async (role: Role) => {
    if (role.is_system_role) {
      toast.error("Cannot delete system roles")
      return
    }

    if (role._count && role._count.users > 0) {
      toast.error("Cannot delete role with assigned users")
      return
    }

    if (!confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      return
    }

    setDeleting(role.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", role.id)

    if (error) {
      toast.error("Failed to delete role")
    } else {
      toast.success("Role deleted")
      setRoles(roles.filter((r) => r.id !== role.id))
    }

    setDeleting(null)
  }

  const countPermissions = (permissions: string[] | null) => {
    if (!permissions) return 0
    return permissions.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const systemRoles = roles.filter((r) => r.is_system_role)
  const customRoles = roles.filter((r) => !r.is_system_role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">Manage access levels for your staff</p>
          </div>
        </div>
        <Link href="/staff/roles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-xs text-muted-foreground">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Lock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemRoles.length}</p>
                <p className="text-xs text-muted-foreground">System Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customRoles.length}</p>
                <p className="text-xs text-muted-foreground">Custom Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Roles */}
      {systemRoles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            System Roles
          </h2>
          <div className="grid gap-3">
            {systemRoles.map((role) => (
              <Card key={role.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Lock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{role.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {role.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{countPermissions(role.permissions)} permissions</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Users className="h-3 w-3" />
                          {role._count?.users || 0} users
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        System
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Roles */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Custom Roles
        </h2>
        {customRoles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No custom roles yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create custom roles to define specific permissions for your staff
              </p>
              <Link href="/staff/roles/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Role
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customRoles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{role.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {role.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{countPermissions(role.permissions)} permissions</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Users className="h-3 w-3" />
                          {role._count?.users || 0} users
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/staff/roles/${role.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(role)}
                          disabled={deleting === role.id || (role._count?.users || 0) > 0}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleting === role.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Permission Reference */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Available Permissions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            {Object.entries(permissionGroups).map(([group, permissions]) => (
              <div key={group}>
                <p className="font-medium text-muted-foreground mb-1">{group}</p>
                <ul className="space-y-0.5">
                  {permissions.map((perm) => (
                    <li key={perm} className="text-xs text-muted-foreground">
                      {perm.split(".")[1]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
