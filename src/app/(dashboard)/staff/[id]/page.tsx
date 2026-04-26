"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, STAFF_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { StaffMember, UserRole, Role } from "@/types/staff.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
} from "@/components/ui"
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
  Edit,
  MessageCircle,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate } from "@/components/auth"
import { formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

interface Property {
  id: string
  name: string
}

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/staff", defaultLabel: "All Staff" })

  // Use the centralized hook for main data fetching
  const {
    data: staff,
    related,
    loading,
    refetch,
    updateFields,
    deleteRecord,
    isDeleting,
    isSaving,
  } = useDetailPage<StaffMember>({
    config: STAFF_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  // Additional state for role management and form editing
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const [newRoleAssignment, setNewRoleAssignment] = useState({
    role_id: "",
    property_id: "",
  })

  // Get user roles from related data
  const userRoles = (related.userRoles || []) as UserRole[]

  // Fetch roles and properties (needed for role assignment)
  useEffect(() => {
    const fetchRolesAndProperties = async () => {
      const supabase = createClient()

      const [allRolesRes, propertiesRes] = await Promise.all([
        supabase
          .from("roles")
          .select("id, name, description, is_system_role")
          .order("is_system_role", { ascending: false })
          .order("name"),
        supabase.from("properties").select("id, name").order("name"),
      ])

      if (!allRolesRes.error) {
        setAllRoles(allRolesRes.data || [])
        if (allRolesRes.data && allRolesRes.data.length > 0) {
          setNewRoleAssignment((prev) => ({ ...prev, role_id: allRolesRes.data[0].id }))
        }
      }

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length === 1) {
          setNewRoleAssignment((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }
    }

    fetchRolesAndProperties()
  }, [])

  // Sync form data when staff data loads
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        email: staff.email,
        phone: staff.phone || "",
      })
    }
  }, [staff])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSaveBasicInfo = async () => {
    if (!staff) return

    if (!formData.name || !formData.email) {
      showError("Name and email are required")
      return
    }

    const success = await updateFields({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
    })

    if (success) {
      setIsEditing(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!staff) return
    await updateFields({ is_active: !staff.is_active })
  }

  const handleAddRole = async () => {
    if (!staff || !newRoleAssignment.role_id) return

    setRoleLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      showError("Session expired")
      setRoleLoading(false)
      return
    }

    const propertyId = newRoleAssignment.property_id === "" ? null : newRoleAssignment.property_id

    const { error } = await supabase.from("user_roles").insert({
      owner_id: user.id,
      staff_member_id: staff.id,
      role_id: newRoleAssignment.role_id,
      property_id: propertyId,
    })

    if (error) {
      showError("Failed to add role")
    } else {
      showSuccess("Role assigned")
      refetch()
    }

    setRoleLoading(false)
  }

  const handleRemoveRole = (roleId: string) => {
    confirm({
      title: "Remove Role",
      description: "Remove this role assignment?",
      destructive: true,
      onConfirm: async () => {
        setRoleLoading(true)
        const supabase = createClient()

        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", roleId)

        if (error) {
          showError("Failed to remove role")
        } else {
          showSuccess("Role removed")
          refetch()
        }

        setRoleLoading(false)
      },
    })
  }

  const handleDelete = async () => {
    await deleteRecord({
      confirm: true,
      cascadeDeletes: [{ table: "user_roles", foreignKey: "staff_member_id" }],
    })
  }

  if (loading) {
    return <PageLoading message="Loading staff details..." />
  }

  if (!staff) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const saving = isSaving || roleLoading

  return (
    <div className="space-y-6">
      {ConfirmDialogElement}
      {/* Hero Header */}
      <DetailHero
        title={staff.name}
        subtitle={staff.email}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Staff", href: "/staff" },
          { label: staff.name || "Details" },
        ]}
        avatar={
          <Avatar
            name={staff.name}
            src={staff.person?.photo_url}
            size="lg"
            className={`h-14 w-14 text-2xl ${staff.is_active ? "" : "bg-muted text-muted-foreground"}`}
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
            {/* Quick Actions: Call, WhatsApp, Email */}
            {staff.phone && (
              <a href={`tel:${staff.phone}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Call">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
            {staff.phone && (
              <a href={`https://wa.me/91${staff.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="h-9 w-9 text-green-600 hover:text-green-700" title="WhatsApp">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            )}
            {staff.email && (
              <a href={`mailto:${staff.email}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Email">
                  <Mail className="h-4 w-4" />
                </Button>
              </a>
            )}
            <PermissionGate permission="staff.edit" hide>
              <Link href={`/staff/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
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
                disabled={saving || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <DetailPageTemplate layoutKey="staff-detail" entityType="staff" record={staff}>
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
                <Select
                  value={newRoleAssignment.role_id}
                  onChange={(e) => setNewRoleAssignment((prev) => ({ ...prev, role_id: e.target.value }))}
                  className="flex-1"
                  disabled={saving}
                  options={allRoles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />
                <Select
                  value={newRoleAssignment.property_id}
                  onChange={(e) => setNewRoleAssignment((prev) => ({ ...prev, property_id: e.target.value }))}
                  className="flex-1"
                  disabled={saving}
                  placeholder="All Properties"
                  options={properties.map((property) => ({
                    value: property.id,
                    label: property.name,
                  }))}
                />
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

      </DetailPageTemplate>
    </div>
  )
}
