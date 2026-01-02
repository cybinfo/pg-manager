"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  Check
} from "lucide-react"
import { toast } from "sonner"

// Available permissions grouped by module
const permissionGroups: Record<string, { label: string; permissions: { key: string; label: string }[] }> = {
  properties: {
    label: "Properties",
    permissions: [
      { key: "properties.view", label: "View properties" },
      { key: "properties.create", label: "Create properties" },
      { key: "properties.edit", label: "Edit properties" },
      { key: "properties.delete", label: "Delete properties" },
    ],
  },
  rooms: {
    label: "Rooms",
    permissions: [
      { key: "rooms.view", label: "View rooms" },
      { key: "rooms.create", label: "Create rooms" },
      { key: "rooms.edit", label: "Edit rooms" },
      { key: "rooms.delete", label: "Delete rooms" },
    ],
  },
  tenants: {
    label: "Tenants",
    permissions: [
      { key: "tenants.view", label: "View tenants" },
      { key: "tenants.create", label: "Add tenants" },
      { key: "tenants.edit", label: "Edit tenants" },
      { key: "tenants.delete", label: "Remove tenants" },
    ],
  },
  payments: {
    label: "Payments",
    permissions: [
      { key: "payments.view", label: "View payments" },
      { key: "payments.create", label: "Record payments" },
      { key: "payments.edit", label: "Edit payments" },
      { key: "payments.delete", label: "Delete payments" },
    ],
  },
  meter_readings: {
    label: "Meter Readings",
    permissions: [
      { key: "meter_readings.view", label: "View readings" },
      { key: "meter_readings.create", label: "Record readings" },
      { key: "meter_readings.edit", label: "Edit readings" },
    ],
  },
  complaints: {
    label: "Complaints",
    permissions: [
      { key: "complaints.view", label: "View complaints" },
      { key: "complaints.create", label: "Submit complaints" },
      { key: "complaints.edit", label: "Edit complaints" },
      { key: "complaints.resolve", label: "Resolve complaints" },
    ],
  },
  notices: {
    label: "Notices",
    permissions: [
      { key: "notices.view", label: "View notices" },
      { key: "notices.create", label: "Create notices" },
      { key: "notices.edit", label: "Edit notices" },
      { key: "notices.delete", label: "Delete notices" },
    ],
  },
  visitors: {
    label: "Visitors",
    permissions: [
      { key: "visitors.view", label: "View visitors" },
      { key: "visitors.create", label: "Check-in visitors" },
    ],
  },
  reports: {
    label: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.export", label: "Export reports" },
    ],
  },
  exit_clearance: {
    label: "Exit Clearance",
    permissions: [
      { key: "exit_clearance.initiate", label: "Initiate clearance" },
      { key: "exit_clearance.process", label: "Process clearance" },
      { key: "exit_clearance.approve", label: "Approve clearance" },
    ],
  },
  staff: {
    label: "Staff Management",
    permissions: [
      { key: "staff.view", label: "View staff" },
      { key: "staff.create", label: "Add staff" },
      { key: "staff.edit", label: "Edit staff" },
      { key: "staff.delete", label: "Remove staff" },
    ],
  },
  settings: {
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "View settings" },
      { key: "settings.edit", label: "Edit settings" },
    ],
  },
}

export default function NewRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

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

    if (!formData.name) {
      toast.error("Please enter a role name")
      return
    }

    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const { error } = await supabase.from("roles").insert({
        owner_id: user.id,
        name: formData.name,
        description: formData.description || null,
        is_system_role: false,
        permissions: selectedPermissions,
      })

      if (error) {
        console.error("Error creating role:", error)
        throw error
      }

      toast.success("Role created successfully!")
      router.push("/staff/roles")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create role. Please try again.")
    } finally {
      setLoading(false)
    }
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/staff/roles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Role</h1>
          <p className="text-muted-foreground">Define a new role with custom permissions</p>
        </div>
      </div>

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
                disabled={loading}
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
                disabled={loading}
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Check className="h-5 w-5 text-blue-600" />
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
                  disabled={loading}
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllPermissions}
                  disabled={loading}
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
                      disabled={loading}
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
                          disabled={loading}
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
        <div className="flex justify-end gap-4">
          <Link href="/staff/roles">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || selectedPermissions.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
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
