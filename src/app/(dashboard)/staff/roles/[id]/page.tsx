"use client"

import Link from "next/link"
import { Loader2, Shield, Check, Trash2 } from "lucide-react"
import { useStaffRoleDetail } from "@/lib/hooks/forms/useStaffRoleDetail"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageLoading } from "@/components/ui/loading"
import { DetailSection, DetailPageTemplate, InfoBanner, DetailHero, NotFoundState } from "@/components/ui"
import { PermissionGate } from "@/components/auth"

export default function EditRolePage() {
  const {
    backHref,
    ConfirmDialogElement,
    loading,
    saving,
    role,
    userCount,
    formData,
    selectedPermissions,
    permissionGroups,
    handleChange,
    togglePermission,
    toggleGroupPermissions,
    selectAllPermissions,
    clearAllPermissions,
    handleSubmit,
    handleDelete,
    isGroupSelected,
    isGroupPartiallySelected,
  } = useStaffRoleDetail()

  if (loading) {
    return <PageLoading />
  }

  if (!role) {
    return <NotFoundState title="Role not found" backHref="/staff/roles" backLabel="All Roles" />
  }

  const isSystemRole = role.is_system_role

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {ConfirmDialogElement}

      {/* Header */}
      <DetailHero
        title="Role Details"
        subtitle={role.name || "Staff Role"}
        backHref={backHref}
        backLabel="All Roles"
        icon={Shield}
        breadcrumbs={[
          { label: "Staff", href: "/staff" },
          { label: "Roles", href: "/staff/roles" },
          { label: role?.name || "Role" },
        ]}
        actions={
          !isSystemRole ? (
            <PermissionGate permission="staff.delete" hide>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={saving || userCount > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Role
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      {isSystemRole && (
        <InfoBanner variant="info">
          System roles cannot be modified. They are managed by the application.
        </InfoBanner>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <DetailPageTemplate
          layoutKey="staff-role-detail"
          entityType="role"
          record={role}
          columns={1}
          editable={false}
        >
          {/* Role Details */}
          <DetailSection
            title="Role Details"
            description="Name and description for this role"
            icon={Shield}
          >
            <div className="space-y-4">
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
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of this role's responsibilities"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={saving || isSystemRole}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </DetailSection>

          {/* Permissions */}
          <DetailSection
            title="Permissions"
            description={
              isSystemRole
                ? "Permissions for this role"
                : `Select what this role can do (${selectedPermissions.length} selected)`
            }
            icon={Check}
            actions={
              !isSystemRole ? (
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
              ) : undefined
            }
          >
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
          </DetailSection>
        </DetailPageTemplate>

        {/* Form Actions */}
        {!isSystemRole && (
          <div className="flex justify-end gap-4 mt-6">
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
