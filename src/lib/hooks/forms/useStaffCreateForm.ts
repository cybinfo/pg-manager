"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { sendInvitationEmail } from "@/lib/email"
import { withCreatedBy, withCreatedByBatch } from "@/lib/audit"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getNowISO } from "@/lib/date-helpers"
import { PersonSearchResult } from "@/types/people.types"
import { validatePhone as validateIndianMobile } from "@/lib/phone"
import { logger } from "@/lib/logger"
import { useFeatures } from "@/lib/features/use-features"
import type { PropertyOption } from "@/types/properties.types"

export interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
}

export interface RoleAssignment {
  role_id: string
  entity_id: string | null
}

export function useStaffCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/staff" })
  const { isFeatureEnabled } = useFeatures()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleSuccess } = useFormSubmit({ redirectTo: "/staff" })
  const personIdFromUrl = searchParams.get("person_id")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [ownerId, setOwnerId] = useState<string>("")
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" })

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setOwnerId(user.id)
      }

      const supabase = createClient()
      const [rolesRes, propertiesRes] = await Promise.all([
        supabase
          .from("roles")
          .select("id, name, description, is_system_role")
          .order("is_system_role", { ascending: false })
          .order("name"),
        supabase.from("entities").eq("type", "pg").select("id, name").order("name"),
      ])

      if (!rolesRes.error) setRoles(rolesRes.data || [])
      if (!propertiesRes.error) setProperties(propertiesRes.data || [])
      setLoadingData(false)
    }

    fetchData()
  }, [user])

  useEffect(() => {
    const loadPersonFromUrl = async () => {
      if (!personIdFromUrl || selectedPerson) return

      const supabase = createClient()
      const { data } = await supabase
        .from("people")
        .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
        .eq("id", personIdFromUrl)
        .single()

      if (data && !data.is_blocked) {
        // eslint-disable-next-line react-hooks/immutability
        handlePersonSelect(data)
      } else if (data?.is_blocked) {
        showError("This person is blocked and cannot be added as staff")
      }
    }

    loadPersonFromUrl()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personIdFromUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePersonSelect = (person: PersonSearchResult | null) => {
    setSelectedPerson(person)
    if (person) {
      setFormData({
        name: person.name,
        email: person.email || "",
        phone: person.phone || "",
      })
    }
  }

  const addRoleAssignment = () => {
    if (roles.length === 0) {
      showError("No roles available. Create a role first.")
      return
    }
    setRoleAssignments((prev) => [...prev, { role_id: roles[0].id, entity_id: null }])
  }

  const updateRoleAssignment = (index: number, field: "role_id" | "entity_id", value: string | null) => {
    setRoleAssignments((prev) =>
      prev.map((assignment, i) => (i === index ? { ...assignment, [field]: value } : assignment))
    )
  }

  const removeRoleAssignment = (index: number) => {
    setRoleAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  const doSubmit = async () => {
    const staffName = selectedPerson?.name || formData.name
    const staffEmail = selectedPerson?.email || formData.email
    const staffPhone = selectedPerson?.phone || formData.phone

    if (!staffName || !staffEmail) {
      showError("Please select a person or fill in name and email")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(staffEmail)) {
      showError("Please enter a valid email address")
      return
    }

    if (staffPhone && !validateIndianMobile(staffPhone)) {
      showError("Please enter a valid Indian mobile number (10 digits)")
      return
    }

    setLoading(true)

    try {
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const supabase = createClient()

      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("user_id, name")
        .eq("email", staffEmail.toLowerCase())
        .single()

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .single()

      let personId = selectedPerson?.id || null
      if (!personId && (staffName || staffPhone || staffEmail)) {
        try {
          const { data: newPersonId } = await supabase.rpc("upsert_person", {
            p_owner_id: user.id,
            p_name: staffName,
            p_phone: staffPhone || null,
            p_email: staffEmail || null,
            p_tags: ["staff"],
            p_source: "staff",
          })
          personId = newPersonId || null
        } catch {
          personId = null
        }
      } else if (personId) {
        try {
          await supabase.rpc("upsert_person", {
            p_owner_id: user.id,
            p_name: staffName,
            p_phone: staffPhone || null,
            p_email: staffEmail || null,
            p_tags: ["staff"],
          })
        } catch {
          // non-fatal: person tag update failure doesn't block staff creation
        }
      }

      const { data: staffData, error: staffError } = await supabase
        .from("staff_members")
        .insert(
          withCreatedBy(
            {
              owner_id: user.id,
              name: staffName,
              email: staffEmail,
              phone: staffPhone || null,
              is_active: true,
              user_id: existingProfile?.user_id || null,
              person_id: personId,
            },
            user.id
          )
        )
        .select()
        .single()

      if (staffError) {
        logger.error("Error creating staff member:", { detail: staffError })
        throw staffError
      }

      let primaryRoleId: string | null = null
      if (roleAssignments.length > 0) {
        primaryRoleId = roleAssignments[0].role_id
        const roleInserts = roleAssignments.map((assignment) => ({
          owner_id: user.id,
          staff_member_id: staffData.id,
          role_id: assignment.role_id,
          entity_id: assignment.entity_id,
        }))

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(withCreatedByBatch(roleInserts, user.id))

        if (roleError) {
          logger.error("Error assigning roles:", { detail: roleError })
          showError("Staff created but role assignment failed")
        }
      }

      if (existingProfile?.user_id && workspace) {
        const { error: contextError } = await supabase.from("user_contexts").insert(
          withCreatedBy(
            {
              user_id: existingProfile.user_id,
              workspace_id: workspace.id,
              context_type: "staff",
              role_id: primaryRoleId,
              entity_id: staffData.id,
              is_active: true,
              is_default: false,
              invited_by: user.id,
              invited_at: getNowISO(),
              accepted_at: getNowISO(),
            },
            user.id
          )
        )

        if (contextError) {
          logger.error("Error creating context:", { detail: contextError })
        } else {
          handleSuccess({ message: `Staff member added! ${existingProfile.name} can now login and switch to this staff account.` })
          return
        }
      } else if (workspace && isFeatureEnabled("staff", "staffInvitations")) {
        const { data: invitation, error: inviteError } = await supabase
          .from("invitations")
          .insert(
            withCreatedBy(
              {
                workspace_id: workspace.id,
                invited_by: user.id,
                email: staffEmail,
                phone: staffPhone || null,
                name: staffName,
                context_type: "staff",
                role_id: primaryRoleId,
                entity_id: staffData.id,
                status: "pending",
                message: `You've been invited to join ${workspace.name} as a staff member.`,
              },
              user.id
            )
          )
          .select("id, token")
          .single()

        if (inviteError) {
          logger.error("Error creating invitation:", { detail: inviteError })
          handleSuccess({ message: "Staff member added! (Invitation could not be created)" })
          return
        } else if (invitation) {
          const selectedRole = roles.find((r) => r.id === primaryRoleId)
          const roleName = selectedRole?.name || "Staff Member"

          const { data: inviterProfile } = await supabase
            .from("user_profiles")
            .select("name")
            .eq("user_id", user.id)
            .single()

          const inviterName = inviterProfile?.name || "Property Owner"

          const signupUrl = `${window.location.origin}/register?invite=${invitation.token}&email=${encodeURIComponent(staffEmail)}`
          const emailResult = await sendInvitationEmail({
            to: staffEmail,
            inviteeName: staffName,
            inviterName: inviterName,
            workspaceName: workspace.name,
            contextType: "staff",
            roleName: roleName,
            signupUrl: signupUrl,
            message: `You've been invited to join ${workspace.name} as a staff member. As ${roleName}, you'll be able to help manage the property through the ManageKar dashboard.`,
          })

          if (emailResult.success) {
            handleSuccess({ message: "Staff member added! An invitation email has been sent." })
          } else {
            logger.warn("Failed to send invitation email", { error: String(emailResult.error) })
            handleSuccess({ message: "Staff member added! Invitation created but email failed to send." })
          }
          return
        }
      } else {
        handleSuccess({ message: "Staff member added successfully!" })
        return
      }

      handleSuccess({ message: "Staff member added!" })
    } catch (error) {
      handleClientError(error, "Adding staff member")
    } finally {
      setLoading(false)
    }
  }

  const step1Complete = !!selectedPerson && !!formData.email
  const step2Complete = roleAssignments.length > 0
  const staffName = selectedPerson?.name || formData.name
  const staffEmail = formData.email
  const staffPhone = formData.phone

  return {
    backHref,
    loading,
    loadingData,
    roles,
    properties,
    roleAssignments,
    currentStep,
    setCurrentStep,
    ownerId,
    selectedPerson,
    formData,
    handleChange,
    handlePersonSelect,
    addRoleAssignment,
    updateRoleAssignment,
    removeRoleAssignment,
    doSubmit,
    step1Complete,
    step2Complete,
    staffName,
    staffEmail,
    staffPhone,
  }
}
