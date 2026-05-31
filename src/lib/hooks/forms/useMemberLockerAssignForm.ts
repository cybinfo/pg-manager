"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

interface MemberData {
  id: string
  name: string
  member_code: string | null
  library_id: string
  library?: { id: string; name: string } | null
  locker_id?: string | null
}

interface LockerOption {
  id: string
  locker_number: string
  size: string
  floor: number
  section: string | null
  monthly_rent: number | null
  deposit_amount: number | null
}

export function useMemberLockerAssignForm(memberId: string) {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()
  const { handleSuccess } = useFormSubmit({
    successMessage: "Locker assigned successfully!",
    redirectTo: `/library-members/${memberId}`,
  })

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)
  const [lockers, setLockers] = useState<LockerOption[]>([])
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    start_date: getTodayISO(),
    end_date: "",
    rent_amount: "",
    deposit_amount: "",
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: memberData, error: memberError } = await supabase
        .from("library_members")
        .select("id, name, member_code, library_id, locker_id, library:libraries(id, name)")
        .eq("id", memberId)
        .is("deleted_at", null)
        .single()

      if (memberError || !memberData) {
        showError("Member not found")
        router.push("/library-members")
        return
      }

      if (memberData.locker_id) {
        showError("Member already has a locker assigned")
        router.push(`/library-members/${memberId}`)
        return
      }

      const library = Array.isArray(memberData.library)
        ? memberData.library[0]
        : memberData.library

      setMember({
        ...memberData,
        library,
      })

      const { data: lockersData } = await supabase
        .from("library_lockers")
        .select("id, locker_number, size, floor, section, monthly_rent, deposit_amount")
        .eq("library_id", memberData.library_id)
        .eq("status", "available")
        .is("deleted_at", null)
        .order("locker_number")

      setLockers(lockersData || [])
      setLoadingData(false)
    }

    fetchData()
  }, [memberId, router])

  const selectedLocker = lockers.find((l) => l.id === selectedLockerId)

  useEffect(() => {
    if (selectedLocker) {
      setFormData((prev) => ({
        ...prev,
        rent_amount: selectedLocker.monthly_rent?.toString() || "",
        deposit_amount: selectedLocker.deposit_amount?.toString() || "",
      }))
    }
  }, [selectedLocker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLockerId) {
      showError("Please select a locker")
      return
    }

    if (!formData.start_date) {
      showError("Please enter start date")
      return
    }

    if (!user || !workspaceId || !member) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

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
          locker_id: selectedLockerId,
          member_id: memberId,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          rent_amount: formData.rent_amount ? Number(formData.rent_amount) : selectedLocker?.monthly_rent,
          deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : selectedLocker?.deposit_amount,
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
          current_member_id: memberId,
          assigned_from: formData.start_date,
          assigned_until: formData.end_date || null,
          updated_at: getNowISO(),
        })
        .eq("id", selectedLockerId)

      if (lockerError) {
        logger.error("Error updating locker:", { detail: lockerError })
        showError(`Failed to update locker status: ${lockerError.message}`)
        return
      }

      const { error: memberError } = await supabase
        .from("library_members")
        .update({
          locker_id: selectedLockerId,
          updated_at: getNowISO(),
        })
        .eq("id", memberId)

      if (memberError) {
        logger.error("Error updating member:", { detail: memberError })
        // Don't fail the whole operation for this
      }

      handleSuccess()
    } catch (error) {
      handleClientError(error, "Assigning locker")
    } finally {
      setLoading(false)
    }
  }

  const backHref = `/library-members/${memberId}`

  return {
    loading,
    loadingData,
    member,
    lockers,
    selectedLockerId,
    setSelectedLockerId,
    selectedLocker,
    formData,
    setFormData,
    handleSubmit,
    backHref,
  }
}
