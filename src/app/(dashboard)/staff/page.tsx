"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import {
  Users,
  Plus,
  Loader2,
  Shield,
  Mail,
  Phone,
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
  const [filters, setFilters] = useState<Record<string, string>>({})

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

  const handleToggleStatus = async (e: React.MouseEvent, staffId: string, currentStatus: boolean) => {
    e.stopPropagation()
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

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      id: "role",
      label: "Role",
      type: "select",
      placeholder: "All Roles",
      options: roles.map(r => ({ value: r.id, label: r.name })),
    },
  ]

  const filteredStaff = staff.filter((member) => {
    if (filters.status && filters.status !== "all") {
      if (filters.status === "active" && !member.is_active) return false
      if (filters.status === "inactive" && member.is_active) return false
    }
    if (filters.role && filters.role !== "all") {
      const hasRole = member.roles?.some(r => r.role?.id === filters.role)
      if (!hasRole) return false
    }
    return true
  })

  // Stats
  const activeStaff = staff.filter((s) => s.is_active).length
  const inactiveStaff = staff.filter((s) => !s.is_active).length
  const totalRoles = roles.filter((r) => !r.is_system_role).length

  const metricsItems: MetricItem[] = [
    { label: "Total Staff", value: staff.length, icon: Users },
    { label: "Active", value: activeStaff, icon: CheckCircle },
    { label: "Inactive", value: inactiveStaff, icon: XCircle },
    { label: "Custom Roles", value: totalRoles, icon: Shield },
  ]

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Staff Member",
      width: "primary",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${row.is_active ? "bg-primary/10" : "bg-gray-100"}`}>
            <span className={`text-lg font-semibold ${row.is_active ? "text-primary" : "text-gray-500"}`}>
              {row.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={!row.is_active ? "opacity-60" : ""}>
            <div className="font-medium flex items-center gap-2">
              {row.name}
              {!row.is_active && (
                <TableBadge variant="muted">Inactive</TableBadge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      width: "tertiary",
      hideOnMobile: true,
      render: (row) => row.phone ? (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Phone className="h-3 w-3" />
          {row.phone}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      width: "secondary",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles && row.roles.length > 0 ? (
            row.roles.slice(0, 2).map((userRole) => (
              <TableBadge key={userRole.id} variant="default">
                {userRole.role?.name}
              </TableBadge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No roles</span>
          )}
          {row.roles && row.roles.length > 2 && (
            <TableBadge variant="muted">+{row.roles.length - 2}</TableBadge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (row) => (
        <StatusDot
          status={row.is_active ? "success" : "muted"}
          label={row.is_active ? "Active" : "Inactive"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: "actionsWide",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleToggleStatus(e, row.id, row.is_active)}
          >
            {row.is_active ? (
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
          <Link href={`/staff/${row.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm">
              <Settings className="mr-1 h-3 w-3" />
              Manage
            </Button>
          </Link>
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
    <PermissionGuard permission="staff.view">
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage staff members and their access"
        icon={UserCog}
        breadcrumbs={[{ label: "Staff" }]}
        actions={
          <>
            <Link href="/staff/roles">
              <Button variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
            </Link>
            <Link href="/staff/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </Link>
          </>
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
        data={filteredStaff}
        keyField="id"
        href={(row) => `/staff/${row.id}`}
        searchable
        searchPlaceholder="Search by name, email, or phone..."
        searchFields={["name", "email", "phone"] as (keyof StaffMember)[]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <UserCog className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {staff.length === 0
                ? "Add staff members to help manage your properties"
                : "No staff match your search criteria"}
            </p>
            {staff.length === 0 && (
              <Link href="/staff/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Staff Member
                </Button>
              </Link>
            )}
          </div>
        }
      />
    </div>
    </PermissionGuard>
  )
}
