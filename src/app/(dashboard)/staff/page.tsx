"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Plus,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Settings,
  UserCog,
  Layers,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"

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
  // Computed fields for grouping
  status_label?: string
  primary_role?: string
  account_status?: string
  joined_month?: string
  joined_year?: string
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

// Group by options for staff
const staffGroupByOptions = [
  { value: "status_label", label: "Status" },
  { value: "primary_role", label: "Role" },
  { value: "account_status", label: "Account" },
  { value: "joined_month", label: "Joined Month" },
  { value: "joined_year", label: "Joined Year" },
]

export default function StaffPage() {
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

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
      const transformedData = ((staffRes.data as RawStaffMember[]) || []).map((member) => {
        const date = new Date(member.created_at)
        const transformedRoles = (member.roles || []).map((userRole) => ({
          ...userRole,
          role: transformJoin(userRole.role),
          property: transformJoin(userRole.property),
        }))
        return {
          ...member,
          roles: transformedRoles,
          status_label: member.is_active ? "Active" : "Inactive",
          primary_role: transformedRoles[0]?.role?.name || "No Role",
          account_status: member.user_id ? "Has Login" : "Pending Invite",
          joined_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          joined_year: date.getFullYear().toString(),
        }
      })
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
          <Avatar
            name={row.name}
            size="md"
            className={row.is_active ? "" : "bg-gray-100 text-gray-500"}
          />
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
    return <PageLoader />
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedGroups.length === 0
                ? "Group by..."
                : selectedGroups.length === 1
                  ? staffGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGroupDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Group by (select order)
                  </p>
                </div>
                {staffGroupByOptions.map((opt) => {
                  const isSelected = selectedGroups.includes(opt.value)
                  const orderIndex = selectedGroups.indexOf(opt.value)

                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, opt.value])
                          } else {
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  )
                })}
                {selectedGroups.length > 0 && (
                  <div className="border-t mt-1 pt-1 px-3 py-2">
                    <button
                      onClick={() => {
                        setSelectedGroups([])
                        setGroupDropdownOpen(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear grouping
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredStaff}
        keyField="id"
        href={(row) => `/staff/${row.id}`}
        searchable
        searchPlaceholder="Search by name, email, or phone..."
        searchFields={["name", "email", "phone"] as (keyof StaffMember)[]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: staffGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
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
