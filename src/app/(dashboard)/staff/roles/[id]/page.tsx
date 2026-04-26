"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  Shield,
  Check,
  Trash2,
  Users,
  Lock
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PERMISSION_GROUPS as permissionGroups } from "@/lib/auth/permission-groups"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
  permissions: string[]
  created_at: string
}

export default function EditRolePage() {
  const params = useParams()
  const router = useRouter()
  const { backHref } = useBackNavigation({ defaultHref: "/staff/roles" })
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error || !data) {
        console.error("Error fetching role:", error)
        showError("Role not found")
        router.push("/staff/roles")
        return
      }

      // Get user count
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role_id", data.id)

      setRole(data)
      setUserCount(count || 0)
      setFormData({
        name: data.name,
        description: data.description || "",
      })
      setSelectedPermissions(data.permissions || [])
      setLoading(false)
    }

    fetchRole()
  }, [params.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  const toggleGroupPermissions = (groupKey: string) => {
    const group = permissionGroups[groupKey]
    const groupPermissions = group.permissions.map((p) => p.key)
    const allSelected = groupPermissions.every((p) => selectedPermissions.includes(p))

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !groupPermissions.includes(p))
      )
    } else {
      setSelectedPermissions((prev) => [
        ...prev.filter((p) => !groupPermissions.includes(p)),
        ...groupPermissions,
      ])
    }
  }

  const selectAllPermissions = () => {
    const allPermissions = Object.values(permissionGroups).flatMap((g) =>
      g.permissions.map((p) => p.key)
    )
    setSelectedPermissions(allPermissions)
  }

  const clearAllPermissions = () => {
    setSelectedPermissions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!role) return

    if (role.is_system_role) {
      showError("Cannot modify system roles")
      return
    }

    if (!formData.name) {
      showError("Please enter a role name")
      return
    }

    if (selectedPermissions.length === 0) {
      showError("Please select at least one permission")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("roles")
        .update({
          name: formData.name,
          description: formData.description || null,
          permissions: selectedPermissions,
        })
        .eq("id", role.id)

      if (error) {
        console.error("Error updating role:", error)
        throw error
      }

      showSuccess("Role updated successfully!")
      router.push("/staff/roles")
    } catch (error) {
      handleClientError(error, "Updating role")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!role) return

    if (role.is_system_role) {
      showError("Cannot delete system roles")
      return
    }

    if (userCount > 0) {
      showError("Cannot delete role with assigned users")
      return
    }

    confirm({
      title: "Delete Role",
      description: `Are you sure you want to delete the "${role.name}" role? This action cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        setSaving(true)

        try {
          const supabase = createClient()

          const { error } = await supabase
            .from("roles")
            .delete()
            .eq("id", role.id)

          if (error) {
            throw error
          }

          showSuccess("Role deleted")
          router.push("/staff/roles")
        } catch (error) {
          handleClientError(error, "Deleting role")
        } finally {
          setSaving(false)
        }
      },
    })
  }

  const isGroupSelected = (groupKey: string) => {
    const group = permissionGroups[groupKey]
    return group.permissions.every((p) => selectedPermissions.includes(p.key))
  }

  const isGroupPartiallySelected = (groupKey: string) => {
    const group = permissionGroups[groupKey]
    const selectedCount = group.permissions.filter((p) =>
      selectedPermissions.includes(p.key)
    ).length
    return selectedCount > 0 && selectedCount < group.permissions.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!role) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const isSystemRole = role.is_system_role

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {ConfirmDialogElement}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSystemRole ? "bg-info/10" : "bg-purple-100"}`}>
              {isSystemRole ? (
                <Lock className={`h-5 w-5 text-info`} />
              ) : (
                <Shield className={`h-5 w-5 text-purple-600`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{role.name}</h1>
                {isSystemRole && (
                  <span className="px-2 py-0.5 bg-info/10 text-info rounded text-xs font-medium">
                    System Role
                  </span>
                )}
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {userCount} staff member{userCount !== 1 ? "s" : ""} assigned
              </p>
            </div>
          </div>
        </div>
        {!isSystemRole && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={saving || userCount > 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Role
          </Button>
        )}
      </div>

      {isSystemRole && (
        <Card className="border-info/30 bg-info/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-info" />
              <p className="text-sm text-info">
                System roles cannot be modified. They are managed by the application.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>Name and description for this role</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Receptionist, Accountant, Meter Reader"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={saving || isSystemRole}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Brief description of this role's responsibilities"
                value={formData.description}
                onChange={handleChange}
                disabled={saving || isSystemRole}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Check className="h-5 w-5 text-info" />
                </div>
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    {isSystemRole ? "Permissions for this role" : `Select what this role can do (${selectedPermissions.length} selected)`}
                  </CardDescription>
                </div>
              </div>
              {!isSystemRole && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPermissions}
                    disabled={saving}
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPermissions}
                    disabled={saving}
                  >
                    Select All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(permissionGroups).map(([groupKey, group]) => (
                <div key={groupKey} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {!isSystemRole && (
                      <button
                        type="button"
                        onClick={() => toggleGroupPermissions(groupKey)}
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          isGroupSelected(groupKey)
                            ? "bg-primary border-primary text-primary-foreground"
                            : isGroupPartiallySelected(groupKey)
                            ? "bg-primary/30 border-primary"
                            : "border-input"
                        }`}
                        disabled={saving}
                      >
                        {(isGroupSelected(groupKey) || isGroupPartiallySelected(groupKey)) && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <span className="font-medium">{group.label}</span>
                  </div>
                  <div className={`space-y-2 ${isSystemRole ? "" : "ml-7"}`}>
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className={`flex items-center gap-2 ${isSystemRole ? "" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => !isSystemRole && togglePermission(permission.key)}
                          disabled={saving || isSystemRole}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!isSystemRole && (
          <div className="flex justify-end gap-4">
            <Link href="/staff/roles">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving || selectedPermissions.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
