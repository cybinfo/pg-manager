"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Users,
  Plus,
  Search,
  Loader2,
  Shield,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  Settings,
  UserCog
} from "lucide-react"
import { toast } from "sonner"

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  user_id: string | null
  roles: {
    id: string
    role: {
      id: string
      name: string
      description: string | null
    } | null
    property: {
      id: string
      name: string
    } | null
  }[]
}

interface RawStaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  user_id: string | null
  roles: {
    id: string
    role: {
      id: string
      name: string
      description: string | null
    }[] | null
    property: {
      id: string
      name: string
    }[] | null
  }[] | null
}

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
}

export default function StaffPage() {
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [staffRes, rolesRes] = await Promise.all([
      supabase
        .from("staff_members")
        .select(`
          *,
          roles:user_roles(
            id,
            role:roles(id, name, description),
            property:properties(id, name)
          )
        `)
        .order("name"),
      supabase
        .from("roles")
        .select("id, name, description, is_system_role")
        .order("name"),
    ])

    if (staffRes.error) {
      console.error("Error fetching staff:", staffRes.error)
      toast.error("Failed to load staff members")
    } else {
      // Transform the data from arrays to single objects
      const transformedData = ((staffRes.data as RawStaffMember[]) || []).map((member) => ({
        ...member,
        roles: (member.roles || []).map((userRole) => ({
          ...userRole,
          role: userRole.role && userRole.role.length > 0 ? userRole.role[0] : null,
          property: userRole.property && userRole.property.length > 0 ? userRole.property[0] : null,
        })),
      }))
      setStaff(transformedData)
    }

    if (!rolesRes.error) {
      setRoles(rolesRes.data || [])
    }

    setLoading(false)
  }

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("staff_members")
      .update({ is_active: !currentStatus })
      .eq("id", staffId)

    if (error) {
      toast.error("Failed to update staff status")
    } else {
      toast.success(`Staff member ${currentStatus ? "deactivated" : "activated"}`)
      fetchData()
    }
  }

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.phone && member.phone.includes(searchQuery))

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && member.is_active) ||
      (statusFilter === "inactive" && !member.is_active)

    return matchesSearch && matchesStatus
  })

  // Stats
  const activeStaff = staff.filter((s) => s.is_active).length
  const inactiveStaff = staff.filter((s) => !s.is_active).length
  const totalRoles = roles.filter((r) => !r.is_system_role).length

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
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and their access</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/staff/roles">
            <Button variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Manage Roles
            </Button>
          </Link>
          <Link href="/dashboard/staff/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
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
                <p className="text-2xl font-bold">{activeStaff}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveStaff}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRoles}</p>
                <p className="text-xs text-muted-foreground">Custom Roles</p>
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
                placeholder="Search by name, email, or phone..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {staff.length === 0
                ? "Add staff members to help manage your properties"
                : "No staff match your search criteria"}
            </p>
            {staff.length === 0 && (
              <Link href="/dashboard/staff/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Staff Member
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => (
            <Card key={member.id} className={!member.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Staff Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${member.is_active ? "bg-primary/10" : "bg-gray-100"}`}>
                      <span className={`text-lg font-semibold ${member.is_active ? "text-primary" : "text-gray-500"}`}>
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{member.name}</h3>
                        {!member.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-2">
                    {member.roles && member.roles.length > 0 ? (
                      member.roles.map((userRole) => (
                        <div key={userRole.id} className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            {userRole.role?.name}
                          </span>
                          {userRole.property && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {userRole.property.name}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles assigned</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(member.id, member.is_active)}
                    >
                      {member.is_active ? (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Link href={`/dashboard/staff/${member.id}`}>
                      <Button size="sm">
                        <Settings className="mr-1 h-3 w-3" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
