"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useFeatures } from "@/lib/features/use-features"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getTodayISO, computeEndDate } from "@/lib/date-helpers"
import { TimeSlot, calcSlotHours } from "@/lib/time-slots"
import { formatCurrency, formatDate } from "@/lib/format"
import { PersonSearchResult } from "@/types/people.types"
import { createLibraryMember } from "@/lib/workflows/library-member.workflow"
import type { LibraryOption, LibraryPlanOption } from "@/types/library.types"

export function useLibraryMemberCreateForm() {
  const router = useRouter()
  const { user } = useAuthContext()
  const { backHref } = useBackNavigation({ defaultHref: "/library-members" })
  const { isFeatureEnabled } = useFeatures()
  const ownerId = user?.id || ""
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [plans, setPlans] = useState<LibraryPlanOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)
  const [personError, setPersonError] = useState("")

  const searchParams = useSearchParams()
  const preselectedLibrary = searchParams?.get("library") || ""
  const prefilledName = searchParams?.get("name") || ""
  const prefilledPhone = searchParams?.get("phone") || ""
  const waitlistId = searchParams?.get("waitlist_id") || ""

  const [formData, setFormData] = useState({
    library_id: preselectedLibrary,
    plan_id: "",
    start_date: getTodayISO(),
    duration_months: 1,
    amount: 0,
    discount: 0,
    time_slots: [] as TimeSlot[],
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: librariesData } = await supabase
        .from("libraries")
        .select("id, name, code")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (librariesData) setLibraries(librariesData)

      const { data: plansData } = await supabase
        .from("library_plans")
        .select("id, name, hours_included, validity_days, base_price")
        .eq("is_active", true)
        .order("sort_order")

      if (plansData) setPlans(plansData)

      setLoadingData(false)
    }

    fetchData()
  }, [user])

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseFloat(e.target.value) || 0
    const plan = plans.find((p) => p.id === formData.plan_id)
    const newAmount = plan ? plan.base_price * duration : formData.amount
    setFormData((prev) => ({ ...prev, duration_months: duration, amount: newAmount }))
  }

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    const newAmount = plan ? plan.base_price * 1 : 0
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      duration_months: 1,
      amount: newAmount,
      discount: 0,
    }))
  }

  const handleSubmit = async () => {
    if (!selectedPerson) {
      setPersonError("Please select a person")
      setCurrentStep(1)
      return
    }
    if (!formData.library_id) {
      setCurrentStep(1)
      return
    }

    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      const selectedPlan = plans.find((p) => p.id === formData.plan_id)

      const result = await createLibraryMember(
        supabase,
        {
          library_id: formData.library_id,
          person_id: selectedPerson.id,
          person_name: selectedPerson.name,
          person_phone: selectedPerson.phone || undefined,
          person_email: selectedPerson.email || undefined,
          plan_id: formData.plan_id,
          plan_name: selectedPlan?.name,
          plan_hours_included: selectedPlan?.hours_included ?? null,
          plan_base_price: selectedPlan?.base_price,
          start_date: formData.start_date,
          duration_months: formData.duration_months,
          amount: formData.amount,
          discount: formData.discount,
          time_slots: formData.time_slots,
          waitlist_id: waitlistId || undefined,
          send_welcome_email: !!(selectedPerson.email && isFeatureEnabled("members", "welcomeEmail")),
        },
        user.id
      )

      if (!result.success) {
        showError(result.error || "Failed to register member")
        return
      }

      showSuccess("Member registered successfully!")

      if (result.membershipId) {
        router.push(`/library-subscriptions/${result.membershipId}`)
      } else {
        router.push(`/library-members/${result.memberId}`)
      }
    } catch (error) {
      handleClientError(error, "Registering member")
    } finally {
      setSaving(false)
    }
  }

  const selectedPlan = plans.find((p) => p.id === formData.plan_id)
  const computedEndDate = formData.start_date
    ? computeEndDate(formData.start_date, formData.duration_months)
    : ""
  const finalAmount = formData.amount - formData.discount
  const validTimeSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
  const totalSlotHours = validTimeSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
  const hoursExceeded = selectedPlan?.hours_included ? totalSlotHours > selectedPlan.hours_included : false
  const priceCalcDisplay = selectedPlan && formData.duration_months
    ? `${formatCurrency(selectedPlan.base_price)}/month × ${formData.duration_months} month${formData.duration_months !== 1 ? "s" : ""} = ${formatCurrency(selectedPlan.base_price * formData.duration_months)}`
    : null

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  const step1Complete = !!(selectedPerson && formData.library_id)
  const step2Complete = !!(formData.plan_id && formData.start_date && formData.duration_months)
  const step3Complete = true

  // Helpers used in JSX for schedule step
  const updateTimeSlot = (idx: number, field: "start" | "end", value: string) => {
    const updated = [...formData.time_slots]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormData((prev) => ({ ...prev, time_slots: updated }))
  }

  const removeTimeSlot = (idx: number) => {
    const updated = formData.time_slots.filter((_: TimeSlot, i: number) => i !== idx)
    setFormData((prev) => ({ ...prev, time_slots: updated }))
  }

  const addTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      time_slots: [...prev.time_slots, { start: "", end: "" }],
    }))
  }

  return {
    // State
    libraries,
    plans,
    loadingData,
    saving,
    currentStep,
    setCurrentStep,
    selectedPerson,
    setSelectedPerson,
    personError,
    setPersonError,
    formData,
    setFormData,
    ownerId,
    // URL-derived
    preselectedLibrary,
    prefilledName,
    prefilledPhone,
    waitlistId,
    // Computed
    selectedPlan,
    computedEndDate,
    finalAmount,
    validTimeSlots,
    totalSlotHours,
    hoursExceeded,
    priceCalcDisplay,
    libraryOptions,
    step1Complete,
    step2Complete,
    step3Complete,
    // Navigation
    backHref,
    // Handlers
    handleDurationChange,
    handlePlanChange,
    handleSubmit,
    updateTimeSlot,
    removeTimeSlot,
    addTimeSlot,
    // Format helpers forwarded for JSX use
    formatDate,
  }
}
