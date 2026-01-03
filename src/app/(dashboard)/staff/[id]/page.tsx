"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
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
  Save
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { formatDate } from "@/lib/format"
import { PageLoader } from "@/components/ui/page-loader"
import { Avatar } from "@/components/ui/avatar"

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  user_id: string | null
}

interface UserRoleRaw {
  id: string
  role_id: string
  property_id: string | null
  role: { id: string; name: string; description: string | null }[] | null
  property: { id: string; name: string }[] | null
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
        .select("*")
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
    return <PageLoader />
  }

  if (!staff) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar
              name={staff.name}
              size="lg"
              className={`h-14 w-14 text-2xl ${staff.is_active ? "" : "bg-gray-100 text-gray-500"}`}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{staff.name}</h1>
                {!staff.is_active && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">{staff.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
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
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Staff member details</CardDescription>
                </div>
              </div>
              {!isEditing ? (
                <PermissionGate permission="staff.edit" hide>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </PermissionGate>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveBasicInfo} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
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
              </>
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Name
                  </span>
                  <span className="font-medium">{staff.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <span className="font-medium">{staff.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </span>
                  <span className="font-medium">{staff.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Added On
                  </span>
                  <span className="font-medium">{formatDate(staff.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${staff.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assigned Roles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Assigned Roles</CardTitle>
                <CardDescription>Permissions and access levels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="pt-4 border-t">
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
              <div className="pt-4 border-t text-center">
                <Link href="/staff/roles/new">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Role
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
