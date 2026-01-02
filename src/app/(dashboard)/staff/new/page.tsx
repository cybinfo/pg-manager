"use client"

import { useState, useEffect } from "react"
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
  UserPlus,
  Mail,
  Phone,
  User,
  Shield,
  Building2,
  Plus,
  X
} from "lucide-react"
import { toast } from "sonner"
import { sendInvitationEmail } from "@/lib/email"

interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
}

interface Property {
  id: string
  name: string
}

interface RoleAssignment {
  role_id: string
  property_id: string | null
}

export default function NewStaffPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [rolesRes, propertiesRes] = await Promise.all([
        supabase
          .from("roles")
          .select("id, name, description, is_system_role")
          .order("is_system_role", { ascending: false }) // System roles first
          .order("name"),
        supabase.from("properties").select("id, name").order("name"),
      ])

      if (!rolesRes.error) {
        setRoles(rolesRes.data || [])
      }

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
      }

      setLoadingData(false)
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const addRoleAssignment = () => {
    if (roles.length === 0) {
      toast.error("No roles available. Create a role first.")
      return
    }
    setRoleAssignments((prev) => [...prev, { role_id: roles[0].id, property_id: null }])
  }

  const updateRoleAssignment = (index: number, field: "role_id" | "property_id", value: string | null) => {
    setRoleAssignments((prev) =>
      prev.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment
      )
    )
  }

  const removeRoleAssignment = (index: number) => {
    setRoleAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast.error("Please fill in name and email")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address")
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

      // Step 1: Check if email already exists as a user
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("user_id, name")
        .eq("email", formData.email.toLowerCase())
        .single()

      // Step 2: Get owner's workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .single()

      // Step 3: Create staff member (with user_id if exists)
      const { data: staffData, error: staffError } = await supabase
        .from("staff_members")
        .insert({
          owner_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          is_active: true,
          user_id: existingProfile?.user_id || null, // Link if user exists
        })
        .select()
        .single()

      if (staffError) {
        console.error("Error creating staff member:", staffError)
        throw staffError
      }

      // Step 4: Assign roles if any
      let primaryRoleId: string | null = null
      if (roleAssignments.length > 0) {
        primaryRoleId = roleAssignments[0].role_id
        const roleInserts = roleAssignments.map((assignment) => ({
          owner_id: user.id,
          staff_member_id: staffData.id,
          role_id: assignment.role_id,
          property_id: assignment.property_id,
        }))

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(roleInserts)

        if (roleError) {
          console.error("Error assigning roles:", roleError)
          toast.error("Staff created but role assignment failed")
        }
      }

      // Step 5: Handle user context or invitation
      if (existingProfile?.user_id && workspace) {
        // User exists - create user_context directly
        const { error: contextError } = await supabase
          .from("user_contexts")
          .insert({
            user_id: existingProfile.user_id,
            workspace_id: workspace.id,
            context_type: "staff",
            role_id: primaryRoleId,
            entity_id: staffData.id,
            is_active: true,
            is_default: false,
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(), // Auto-accepted since user exists
          })

        if (contextError) {
          console.error("Error creating context:", contextError)
        } else {
          toast.success(`Staff member added! ${existingProfile.name} can now login and switch to this staff account.`)
        }
      } else if (workspace) {
        // User doesn't exist - create invitation
        const { data: invitation, error: inviteError } = await supabase
          .from("invitations")
          .insert({
            workspace_id: workspace.id,
            invited_by: user.id,
            email: formData.email,
            phone: formData.phone || null,
            name: formData.name,
            context_type: "staff",
            role_id: primaryRoleId,
            entity_id: staffData.id,
            status: "pending",
            message: `You've been invited to join ${workspace.name} as a staff member.`,
          })
          .select("id, token")
          .single()

        if (inviteError) {
          console.error("Error creating invitation:", inviteError)
          toast.success("Staff member added! (Invitation could not be created)")
        } else if (invitation) {
          // Get role name for email
          const selectedRole = roles.find(r => r.id === primaryRoleId)
          const roleName = selectedRole?.name || "Staff Member"

          // Get inviter's name
          const { data: inviterProfile } = await supabase
            .from("user_profiles")
            .select("name")
            .eq("user_id", user.id)
            .single()

          const inviterName = inviterProfile?.name || "Property Owner"

          // Send invitation email
          const signupUrl = `${window.location.origin}/register?invite=${invitation.token}&email=${encodeURIComponent(formData.email)}`
          const emailResult = await sendInvitationEmail({
            to: formData.email,
            inviteeName: formData.name,
            inviterName: inviterName,
            workspaceName: workspace.name,
            contextType: "staff",
            roleName: roleName,
            signupUrl: signupUrl,
            message: `You've been invited to join ${workspace.name} as a staff member. As ${roleName}, you'll be able to help manage the property through the ManageKar dashboard.`,
          })

          if (emailResult.success) {
            toast.success("Staff member added! An invitation email has been sent.")
          } else {
            console.warn("Failed to send invitation email:", emailResult.error)
            toast.success("Staff member added! Invitation created but email failed to send.")
          }
        }
      } else {
        toast.success("Staff member added successfully!")
      }

      router.push("/staff")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to add staff member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/staff">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Staff Member</h1>
          <p className="text-muted-foreground">Create a new staff account</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Staff member details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="staff@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                An invitation email will be sent to this address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Assignment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Role Assignment</CardTitle>
                  <CardDescription>Assign roles and permissions</CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRoleAssignment}
                disabled={loading || roles.length === 0}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No roles created yet</p>
                <Link href="/staff/roles/new">
                  <Button variant="link" size="sm" className="mt-2">
                    Create your first role
                  </Button>
                </Link>
              </div>
            ) : roleAssignments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No roles assigned</p>
                <p className="text-sm">Click "Add Role" to assign permissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roleAssignments.map((assignment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <select
                          value={assignment.role_id}
                          onChange={(e) => updateRoleAssignment(index, "role_id", e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          disabled={loading}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Property (Optional)</Label>
                        <select
                          value={assignment.property_id || ""}
                          onChange={(e) =>
                            updateRoleAssignment(
                              index,
                              "property_id",
                              e.target.value || null
                            )
                          }
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          disabled={loading}
                        >
                          <option value="">All Properties</option>
                          {properties.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRoleAssignment(index)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/staff">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff Member
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
