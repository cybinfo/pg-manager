"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { getTodayISO, computeEndDate } from "@/lib/date-helpers"
import { TimeSlot, calcSlotHours } from "@/lib/time-slots"
import { useFormValidation } from "@/lib/hooks/useFormValidation"
import { requiredSelect, requiredDate } from "@/lib/validation"
import { logger } from "@/lib/logger"
import type { LibraryPlanOption } from "@/types/library.types"
import { renewLibraryMembership } from "@/lib/services/library-members"

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  owner_id: string
  workspace_id: string
  expiry_date: string | null
  status: string
  library?: { id: string; name: string } | null
  person?: { id: string; name?: string; photo_url?: string | null } | null
}

export function useLibrarySubscriptionCreateForm() {
  const router = useRouter()
  const { user } = useAuthContext()

  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [members, setMembers] = useState<MemberOption[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
  const [plans, setPlans] = useState<LibraryPlanOption[]>([])

  const [formData, setFormData] = useState({
    member_id: "",
    plan_id: "",
    start_date: getTodayISO(),
    duration_months: 1,
    amount: 0,
    discount: 0,
    time_slots: [] as TimeSlot[],
  })

  const validationSchema = {
    member_id: requiredSelect("Member"),
    plan_id: requiredSelect("Plan"),
    start_date: requiredDate("Start date"),
    duration_months: (value: unknown) => {
      const num = Number(value)
      if (!value || isNaN(num) || num <= 0) {
        return { isValid: false, error: "Duration must be greater than 0" }
      }
      return null
    },
  }

  const { errors, validateField, validateAll } = useFormValidation(
    validationSchema,
    formData as unknown as Record<string, unknown>
  )

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("entity_members")
        .select("id, name, member_code, owner_id, workspace_id, expiry_date, status, library:libraries(id, name), person:people(id, name, photo_url)")
        .is("deleted_at", null)
        .order("name")

      if (error) {
        showError("Failed to load members")
        logger.error("Failed to load library members", { error: String(error) })
      } else {
        setMembers(data || [])
      }
      setLoadingMembers(false)
    }
    fetchMembers()
  }, [])

  useEffect(() => {
    if (!formData.member_id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPlans(true)
    async function fetchPlans() {
      const supabase = createClient()
      const { data } = await supabase
        .from("entity_plans")
        .select("id, name, hours_included, validity_days, base_price")
        .eq("is_active", true)
        .order("sort_order")
      setPlans(data || [])
      setLoadingPlans(false)
    }
    fetchPlans()
  }, [formData.member_id])

  const handleMemberChange = (memberId: string) => {
    const member = members.find(m => m.id === memberId) || null
    setSelectedMember(member)
    setFormData(prev => ({
      ...prev,
      member_id: memberId,
      plan_id: "",
      amount: 0,
      discount: 0,
      time_slots: [],
    }))
  }

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    setFormData(prev => ({
      ...prev,
      plan_id: planId,
      duration_months: 1,
      amount: plan ? plan.base_price : 0,
      discount: 0,
    }))
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseFloat(e.target.value) || 0
    const plan = plans.find(p => p.id === formData.plan_id)
    setFormData(prev => ({
      ...prev,
      duration_months: duration,
      amount: plan ? plan.base_price * duration : prev.amount,
    }))
  }

  const doSubmit = async () => {
    if (!validateAll(formData as unknown as Record<string, unknown>)) return
    if (!user || !selectedMember) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    const plan = plans.find(p => p.id === formData.plan_id)
    const validSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
    if (validSlots.length > 0 && plan?.hours_included) {
      const totalSlotHours = validSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
      if (totalSlotHours > plan.hours_included) {
        showError(`Total slot hours (${totalSlotHours.toFixed(1)}h) exceeds plan limit (${plan.hours_included}h/day)`)
        return
      }
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { membershipId } = await renewLibraryMembership(supabase, {
        userId: user.id,
        member: {
          id: selectedMember.id,
          owner_id: selectedMember.owner_id,
          workspace_id: selectedMember.workspace_id,
        },
        planId: formData.plan_id,
        planName: plan?.name || "Custom Plan",
        hoursIncluded: plan?.hours_included || 0,
        startDate: formData.start_date,
        durationMonths: formData.duration_months,
        amount: formData.amount,
        discount: formData.discount,
        timeSlots: formData.time_slots,
      })
      router.push(`/library-subscriptions/${membershipId}`)
    } catch (error) {
      logger.error("Error creating subscription", { error: String(error) })
      handleClientError(error, "Creating subscription")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPlan = plans.find(p => p.id === formData.plan_id)
  const computedEndDate = formData.start_date ? computeEndDate(formData.start_date, formData.duration_months) : ""
  const finalAmount = formData.amount - formData.discount
  const validTimeSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
  const totalSlotHours = validTimeSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
  const hoursExceeded = selectedPlan?.hours_included ? totalSlotHours > selectedPlan.hours_included : false
  const displayName = selectedMember ? (selectedMember.person?.name || selectedMember.name) : ""

  const memberOptions = members.map(m => ({
    value: m.id,
    label: `${m.person?.name || m.name}${m.member_code ? ` (${m.member_code})` : ""}`,
  }))

  const planOptions = plans.map(plan => ({
    value: plan.id,
    label: `${plan.name} — Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h/day` : "Unlimited"})`,
  }))

  const step1Complete = !!formData.member_id
  const step2Complete = !!formData.plan_id
  const step3Complete = !!(formData.start_date && formData.duration_months > 0)

  return {
    loadingMembers,
    loadingPlans,
    submitting,
    currentStep,
    setCurrentStep,
    members,
    selectedMember,
    plans,
    formData,
    setFormData,
    errors,
    validateField,
    handleMemberChange,
    handlePlanChange,
    handleDurationChange,
    doSubmit,
    selectedPlan,
    computedEndDate,
    finalAmount,
    validTimeSlots,
    totalSlotHours,
    hoursExceeded,
    displayName,
    memberOptions,
    planOptions,
    step1Complete,
    step2Complete,
    step3Complete,
    router,
  }
}
