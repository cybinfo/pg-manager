/**
 * Edit Role Page
 *
 * Form to edit role name, description, and permissions.
 * Uses useFormEditPage pattern for consistency.
 */

"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getNowISO } from "@/lib/date-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { ArrowLeft, Shield, Check, Loader2 } from "lucide-react"
import { requiredField } from "@/lib/validation"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { PERMISSION_GROUPS as permissionGroups } from "@/lib/auth/permission-groups"

export default function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="staff.edit">
      <EditRoleContent params={params} />
    </PermissionGuard>
  )
}

function EditRoleContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/staff" })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [isSystemRole, setIsSystemRole] = useState(false)

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
    validateField,
  } = useFormEditPage({
    table: "roles",
    id,
    initialData: {
      name: "",
      description: "",
    },
    redirectTo: `/staff/roles/${id}`,
    successMessage: "Role updated successfully!",
    errorMessage: "Failed to update role",
    validationSchema: {
      name: requiredField("Role name"),
    },
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      description: (rec.description as string) || "",
    }),
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      description: data.description || null,
      permissions: selectedPermissions,
      updated_at: getNowISO(),
    }),
    validate: () => {
      if (selectedPermissions.length === 0) {
        return "Please select at least one permission"
      }
      return null
    },
  })

  // Initialize permissions and system role flag when record loads
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (record) {
      setSelectedPermissions((record.permissions as string[]) || [])
      setIsSystemRole(!!record.is_system_role)
    }
  }, [record])
  /* eslint-enable react-hooks/set-state-in-effect */

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
    return <PageLoading message="Loading role..." />
  }

  const roleName = (record?.name as string) || "Role"

  if (isSystemRole) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Cannot Edit</h1>
            <p className="text-muted-foreground">System roles cannot be modified.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/staff/roles/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">
            Staff &rsaquo; Roles &rsaquo; {roleName} &rsaquo; Edit
          </p>
          <h1 className="text-3xl font-bold">Edit Role</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>
                  Name and description for this role
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Role Name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Receptionist, Accountant"
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of this role's responsibilities"
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
                className="min-h-[80px]"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Check className="h-5 w-5 text-info" />
                </div>
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Select what this role can do ({selectedPermissions.length} selected)
                  </CardDescription>
                </div>
              </div>
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(permissionGroups).map(([groupKey, group]) => (
                <div key={groupKey} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
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
                    <span className="font-medium">{group.label}</span>
                  </div>
                  <div className="space-y-2 ml-7">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => togglePermission(permission.key)}
                          disabled={saving}
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

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/staff/roles/${id}`}>
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
      </form>
    </div>
  )
}
