"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"
import type { ComboboxOption } from "@/components/ui/combobox"

interface LockerData {
  id: string
  locker_number: string
  size: string
  monthly_rent: number | null
  deposit_amount: number | null
  library_id: string
  status: string
  library?: { id: string; name: string } | null
}

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  status: string
}

export function useLockerAssignForm(id: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedMember = searchParams.get("member")
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locker, setLocker] = useState<LockerData | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])

  const [formData, setFormData] = useState({
    member_id: preselectedMember || "",
    start_date: getTodayISO(),
    end_date: "",
    rent_amount: "",
    deposit_amount: "",
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: lockerData, error: lockerError } = await supabase
        .from("library_lockers")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (lockerError || !lockerData) {
        showError("Locker not found")
        router.push("/library-lockers")
        return
      }

      if (lockerData.status !== "available") {
        showError("Locker is not available for assignment")
        router.push(`/library-lockers/${id}`)
        return
      }

      setLocker(lockerData)

      setFormData((prev) => ({
        ...prev,
        rent_amount: lockerData.monthly_rent?.toString() || "",
        deposit_amount: lockerData.deposit_amount?.toString() || "",
      }))

      const { data: membersData } = await supabase
        .from("library_members")
        .select("id, name, member_code, status")
        .eq("library_id", lockerData.library_id)
        .eq("status", "active")
        .is("locker_id", null)
        .is("deleted_at", null)
        .order("name")

      setMembers(membersData || [])
      setLoadingData(false)
    }

    fetchData()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.member_id) {
      showError("Please select a member")
      return
    }

    if (!formData.start_date) {
      showError("Please enter start date")
      return
    }

    if (!user || !workspaceId) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    if (!locker) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        showError("Workspace not found")
        setLoading(false)
        return
      }

      const assignmentData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          locker_id: id,
          member_id: formData.member_id,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          rent_amount: formData.rent_amount ? Number(formData.rent_amount) : locker.monthly_rent,
          deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : locker.deposit_amount,
          status: "active",
        },
        user.id
      )

      const { error: assignmentError } = await supabase
        .from("library_locker_assignments")
        .insert(assignmentData)

      if (assignmentError) {
        logger.error("Error creating assignment:", { detail: assignmentError })
        showError(`Failed to assign locker: ${assignmentError.message}`)
        return
      }

      const { error: lockerError } = await supabase
        .from("library_lockers")
        .update({
          status: "occupied",
          current_member_id: formData.member_id,
          assigned_from: formData.start_date,
          assigned_until: formData.end_date || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (lockerError) {
        logger.error("Error updating locker:", { detail: lockerError })
        showError(`Failed to update locker status: ${lockerError.message}`)
        return
      }

      const { error: memberError } = await supabase
        .from("library_members")
        .update({
          locker_id: id,
          updated_at: getNowISO(),
        })
        .eq("id", formData.member_id)

      if (memberError) {
        logger.error("Error updating member:", { detail: memberError })
        // Don't fail the whole operation for this
      }

      showSuccess("Locker assigned successfully!")
      router.push(`/library-lockers/${id}`)
    } catch (error) {
      handleClientError(error, "Assigning locker")
    } finally {
      setLoading(false)
    }
  }

  const memberOptions: ComboboxOption[] = members.map((m) => ({
    value: m.id,
    label: m.name + (m.member_code ? ` (${m.member_code})` : ""),
  }))

  const backHref = `/library-lockers/${id}`
  const lockerNumber = locker ? `#${locker.locker_number}` : ""

  return {
    loading,
    loadingData,
    locker,
    members,
    memberOptions,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    lockerNumber,
  }
}
