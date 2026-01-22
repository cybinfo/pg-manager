"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import {
  Loader2,
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  X,
  Save,
  UserCog,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import { PermissionGate } from "@/components/auth"
import { formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"

interface StaffMember {
  id: string
  person_id: string | null
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  user_id: string | null
  person: { id: string; photo_url: string | null } | null
}

interface UserRole {
  id: string
  role_id: string
  property_id: string | null
  role: {
    id: string
    name: string
    description: string | null
  } | null
  property: {
    id: string
    name: string
  } | null
}

interface Role {
  id: string
  name: string
  description: string | null
}

interface Property {
  id: string
  name: string
}

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const [newRoleAssignment, setNewRoleAssignment] = useState({
    role_id: "",
    property_id: "",
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    const supabase = createClient()

    const [staffRes, rolesRes, allRolesRes, propertiesRes] = await Promise.all([
      supabase
        .from("staff_members")
        .select("*, person:people(id, photo_url)")
        .eq("id", params.id)
        .single(),
      supabase
        .from("user_roles")
        .select(`
          id,
          role_id,
          property_id,
          role:roles(id, name, description),
          property:properties(id, name)
        `)
        .eq("staff_member_id", params.id),
      supabase
        .from("roles")
        .select("id, name, description, is_system_role")
        .order("is_system_role", { ascending: false }) // System roles first
        .order("name"),
      supabase.from("properties").select("id, name").order("name"),
    ])

    if (staffRes.error || !staffRes.data) {
      console.error("Error fetching staff:", staffRes.error)
      toast.error("Staff member not found")
      router.push("/staff")
      return
    }

    setStaff(staffRes.data)
    setFormData({
      name: staffRes.data.name,
      email: staffRes.data.email,
      phone: staffRes.data.phone || "",
    })

    if (!rolesRes.error && rolesRes.data) {
      // Transform user roles - handle both array and object responses from Supabase joins
      const transformedRoles: UserRole[] = rolesRes.data.map((r: any) => ({
        ...r,
        role: transformJoin(r.role),
        property: transformJoin(r.property),
      }))
      setUserRoles(transformedRoles)
    }

    if (!allRolesRes.error) {
      setAllRoles(allRolesRes.data || [])
      if (allRolesRes.data && allRolesRes.data.length > 0) {
        setNewRoleAssignment((prev) => ({ ...prev, role_id: allRolesRes.data[0].id }))
      }
    }

    if (!propertiesRes.error) {
      setProperties(propertiesRes.data || [])
      // If there's only one property, pre-select it for convenience
      if (propertiesRes.data && propertiesRes.data.length === 1) {
        setNewRoleAssignment((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
      }
    }

    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSaveBasicInfo = async () => {
    if (!staff) return

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("staff_members")
      .update({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
      })
      .eq("id", staff.id)

    if (error) {
      toast.error("Failed to update staff member")
    } else {
      toast.success("Staff member updated")
      setStaff({ ...staff, ...formData, phone: formData.phone || null })
      setIsEditing(false)
    }

    setSaving(false)
  }

  const handleToggleStatus = async () => {
    if (!staff) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("staff_members")
      .update({ is_active: !staff.is_active })
      .eq("id", staff.id)

    if (error) {
      toast.error("Failed to update status")
    } else {
      toast.success(`Staff member ${staff.is_active ? "deactivated" : "activated"}`)
      setStaff({ ...staff, is_active: !staff.is_active })
    }

    setSaving(false)
  }

  const handleAddRole = async () => {
    if (!staff || !newRoleAssignment.role_id) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Session expired")
      setSaving(false)
      return
    }

    // Use the property_id directly - empty string should become null
    const propertyId = newRoleAssignment.property_id === "" ? null : newRoleAssignment.property_id

    const { error } = await supabase.from("user_roles").insert({
      owner_id: user.id,
      staff_member_id: staff.id,
      role_id: newRoleAssignment.role_id,
      property_id: propertyId,
    })

    if (error) {
      toast.error("Failed to add role")
    } else {
      toast.success("Role assigned")
      fetchData()
    }

    setSaving(false)
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm("Remove this role assignment?")) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId)

    if (error) {
      toast.error("Failed to remove role")
    } else {
      toast.success("Role removed")
      setUserRoles(userRoles.filter((r) => r.id !== roleId))
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!staff) return

    if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
      return
    }

    setSaving(true)
    const supabase = createClient()

    // Delete user roles first
    await supabase.from("user_roles").delete().eq("staff_member_id", staff.id)

    // Delete staff member
    const { error } = await supabase
      .from("staff_members")
      .delete()
      .eq("id", staff.id)

    if (error) {
      toast.error("Failed to delete staff member")
      setSaving(false)
    } else {
      toast.success("Staff member deleted")
      router.push("/staff")
    }
  }

  if (loading) {
    return <PageLoading message="Loading staff details..." />
  }

  if (!staff) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={staff.name}
        subtitle={staff.email}
        backHref="/staff"
        backLabel="All Staff"
        avatar={
          <Avatar
            name={staff.name}
            src={staff.person?.photo_url}
            size="lg"
            className={`h-14 w-14 text-2xl ${staff.is_active ? "" : "bg-gray-100 text-gray-500"}`}
            clickable
          />
        }
        status={
          <StatusBadge
            variant={staff.is_active ? "success" : "muted"}
            label={staff.is_active ? "Active" : "Inactive"}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {staff.person_id && (
              <Link href={`/people/${staff.person_id}`}>
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  View Person
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={saving}
            >
              {staff.is_active ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            <PermissionGate permission="staff.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <DetailSection
          title="Basic Information"
          description="Staff member details"
          icon={User}
          actions={
            !isEditing ? (
              <PermissionGate permission="staff.edit" hide>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </PermissionGate>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveBasicInfo} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            )
          }
        >
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Name" value={staff.name} icon={User} />
              <InfoRow label="Email" value={staff.email} icon={Mail} />
              <InfoRow label="Phone" value={staff.phone || "Not provided"} icon={Phone} />
              <InfoRow label="Added On" value={formatDate(staff.created_at)} icon={Calendar} />
              <InfoRow
                label="Status"
                value={
                  <StatusBadge
                    variant={staff.is_active ? "success" : "muted"}
                    label={staff.is_active ? "Active" : "Inactive"}
                  />
                }
              />
            </>
          )}
        </DetailSection>

        {/* Assigned Roles */}
        <DetailSection
          title="Assigned Roles"
          description="Permissions and access levels"
          icon={Shield}
        >
          {/* Current Roles */}
          {userRoles.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userRoles.map((userRole) => (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                      {userRole.role?.name}
                    </span>
                    {userRole.property ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {userRole.property.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">All Properties</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRole(userRole.id)}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Role */}
          {allRoles.length > 0 && (
            <div className="pt-4 border-t mt-4">
              <Label className="text-sm font-medium">Add New Role</Label>
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={newRoleAssignment.role_id}
                  onChange={(e) => setNewRoleAssignment((prev) => ({ ...prev, role_id: e.target.value }))}
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={saving}
                >
                  {allRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newRoleAssignment.property_id}
                  onChange={(e) => setNewRoleAssignment((prev) => ({ ...prev, property_id: e.target.value }))}
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={saving}
                >
                  <option value="">All Properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddRole}
                  disabled={saving || !newRoleAssignment.role_id}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {allRoles.length === 0 && (
            <div className="pt-4 border-t text-center mt-4">
              <Link href="/staff/roles/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Role
                </Button>
              </Link>
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  )
}
