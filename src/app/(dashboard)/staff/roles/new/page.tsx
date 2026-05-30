"use client"

import { useState } from "react"
import Link from "next/link"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-components"
import {
  Shield,
  Check
} from "lucide-react"
import { PERMISSION_GROUPS as permissionGroups } from "@/lib/auth/permission-groups"
import { PermissionGuard } from "@/components/auth"
import { DetailHero, DetailSection } from "@/components/ui"

export default function NewRolePage() {
  return (
    <PermissionGuard permission="staff.create">
      <NewRoleContent />
    </PermissionGuard>
  )
}

function NewRoleContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/staff" })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const {
    formData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    validateField,
  } = useFormPage({
    table: "roles",
    initialData: {
      name: "",
      description: "",
    },
    redirectTo: "/staff/roles",
    successMessage: "Role created successfully!",
    errorMessage: "Failed to create role",
    validationSchema: {
      name: requiredField("Role name"),
    },
    validate: (data) => {
      if (selectedPermissions.length === 0) {
        return "Please select at least one permission"
      }
      return null
    },
    transform: (data, userId) => ({
      owner_id: userId,
      name: data.name,
      description: data.description || null,
      is_system_role: false,
      permissions: selectedPermissions,
    }),
    addOwnerId: false,
  })

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <DetailHero
        title="Create Role"
        subtitle="Define a new role with custom permissions"
        backHref={backHref}
        backLabel="All Roles"
        icon={Shield}
        breadcrumbs={[
          { label: "Roles", href: "/staff/roles" },
          { label: "Add Role" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Role Details" description="Name and description for this role" icon={Shield}>
          <FormField label="Role Name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Receptionist, Accountant, Meter Reader"
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
        </DetailSection>

        <DetailSection
          title="Permissions"
          description={`Select what this role can do (${selectedPermissions.length} selected)`}
          icon={Check}
          actions={
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
          }
        >
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
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/staff/roles">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || selectedPermissions.length === 0}>
            {saving ? "Creating..." : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Create Role
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
