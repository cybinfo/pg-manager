"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PERMISSION_GROUPS as permissionGroups } from "@/lib/auth/permission-groups"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
  permissions: string[]
  created_at: string
}

export function useStaffRoleDetail() {
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
        logger.error("Error fetching role:", { detail: error })
        showError("Role not found")
        router.push("/staff/roles")
        return
      }

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
      setSelectedPermissions((prev) => prev.filter((p) => !groupPermissions.includes(p)))
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
        logger.error("Error updating role:", { detail: error })
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

          const { error } = await supabase.from("roles").delete().eq("id", role.id)

          if (error) throw error

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

  return {
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
  }
}
