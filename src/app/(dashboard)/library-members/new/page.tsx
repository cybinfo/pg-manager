/**
 * New Library Member Page
 *
 * Form to register a new library member with subscription.
 * Payment is recorded separately on the subscription detail page.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { Currency } from "@/components/ui/currency"
import { ArrowLeft, Users, Loader2, CreditCard, UserCheck, Trash2, Plus } from "lucide-react"
import { ProfilePhotoUpload } from "@/components/ui/file-upload"
import { requiredField, requiredSelect, requiredPhone } from "@/lib/validation"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getTodayISO, computeEndDate } from "@/lib/date-helpers"
import { TimeSlot, formatTime12h, calcSlotHours } from "@/lib/time-slots"
import { formatDate, formatNumber} from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useFeatures } from "@/lib/features/use-features"
import { GENDER_OPTIONS, ID_PROOF_TYPE_OPTIONS } from "@/lib/constants/form-options"
import { createLibraryMember } from "@/lib/workflows/library-member.workflow"
import type { LibraryOption, LibraryPlanOption } from "@/types/library.types"

export default function NewLibraryMemberPage() {
  return (
    <PermissionGuard permission="library_members.create">
      <NewLibraryMemberContent />
    </PermissionGuard>
  )
}

// Validation schema for required fields
const validationSchema = {
  library_id: requiredSelect("Library"),
  name: requiredField("Full name"),
  phone: requiredPhone("Phone number"),
} as const

function NewLibraryMemberContent() {
  const router = useRouter()
  const { user } = useAuthContext()
  const { backHref } = useBackNavigation({ defaultHref: "/library-members" })
  const { isFeatureEnabled } = useFeatures()
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [plans, setPlans] = useState<LibraryPlanOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    library_id: "",
    name: "",
    phone: "",
    email: "",
    photo_url: "",
    gender: "",
    father_name: "",
    date_of_birth: "",
    id_proof_type: "aadhar",
    id_proof_number: "",
    preferred_slot: "Morning",
    notes: "",
    // Subscription
    plan_id: "",
    start_date: getTodayISO(),
    duration_months: 1,
    amount: 0,
    discount: 0,
    time_slots: [] as TimeSlot[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Read pre-filled values from URL (e.g., from waitlist conversion)
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearchParams(new URLSearchParams(window.location.search))
    }
  }, [])

  const preselectedLibrary = searchParams?.get("library") || ""
  const prefilledName = searchParams?.get("name") || ""
  const prefilledPhone = searchParams?.get("phone") || ""
  const prefilledEmail = searchParams?.get("email") || ""
  const prefilledSlot = searchParams?.get("slot") || ""
  const waitlistId = searchParams?.get("waitlist_id") || ""

  // Pre-fill from URL params
  useEffect(() => {
    if (!searchParams) return
    const updates: Record<string, string> = {}
    if (preselectedLibrary && !formData.library_id) updates.library_id = preselectedLibrary
    if (prefilledName && !formData.name) updates.name = prefilledName
    if (prefilledPhone && !formData.phone) updates.phone = prefilledPhone
    if (prefilledEmail && !formData.email) updates.email = prefilledEmail
    if (prefilledSlot && formData.preferred_slot === "Morning") {
      updates.preferred_slot = prefilledSlot
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }))
    }
  }, [searchParams, preselectedLibrary, prefilledName, prefilledPhone, prefilledEmail, prefilledSlot, formData.library_id, formData.name, formData.phone, formData.email, formData.preferred_slot])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch libraries
      const { data: librariesData } = await supabase
        .from("libraries")
        .select("id, name, code")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (librariesData) setLibraries(librariesData)

      // Fetch plans
      const { data: plansData } = await supabase
        .from("library_plans")
        .select("id, name, hours_included, validity_days, base_price")
        .eq("is_active", true)
        .order("sort_order")

      if (plansData) setPlans(plansData)

      setLoadingData(false)
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, start_date: e.target.value }))
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseFloat(e.target.value) || 0
    const plan = plans.find((p) => p.id === formData.plan_id)
    const newAmount = plan ? plan.base_price * duration : formData.amount
    setFormData((prev) => ({ ...prev, duration_months: duration, amount: newAmount }))
  }

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    const duration = 1
    const newAmount = plan ? plan.base_price * duration : 0
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      duration_months: duration,
      amount: newAmount,
      discount: 0,
    }))
  }

  const runValidation = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const [field, validator] of Object.entries(validationSchema)) {
      const value = formData[field as keyof typeof formData]
      const result = (validator as (v: unknown) => { isValid: boolean; error?: string } | null)(value)
      if (result && !result.isValid && result.error) {
        newErrors[field] = result.error
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!runValidation()) return

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
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          photo_url: formData.photo_url,
          gender: formData.gender,
          father_name: formData.father_name,
          date_of_birth: formData.date_of_birth,
          id_proof_type: formData.id_proof_type,
          id_proof_number: formData.id_proof_number,
          preferred_slot: formData.preferred_slot,
          notes: formData.notes,
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
          send_welcome_email: !!(formData.email && isFeatureEnabled("members", "welcomeEmail")),
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

  // Computed end date
  const computedEndDate = formData.start_date
    ? computeEndDate(formData.start_date, formData.duration_months)
    : ""

  // Final amount
  const finalAmount = formData.amount - formData.discount

  // Access time computed values
  const validTimeSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
  const totalSlotHours = validTimeSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
  const hoursExceeded = selectedPlan?.hours_included ? totalSlotHours > selectedPlan.hours_included : false

  // Price calculation display
  const priceCalcDisplay = selectedPlan && formData.duration_months
    ? `\u20B9${formatNumber(selectedPlan.base_price)}/month \u00D7 ${formData.duration_months} month${formData.duration_months !== 1 ? "s" : ""} = \u20B9${(formatNumber(selectedPlan.base_price * formData.duration_months))}`
    : null

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Member</h1>
          <p className="text-muted-foreground">
            Register a new library member with subscription
          </p>
        </div>
      </div>

      {/* Waitlist Conversion Banner */}
      {waitlistId && (
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
          <UserCheck className="h-5 w-5 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success">
              Converting from Waitlist
            </p>
            <p className="text-xs text-success/80">
              Contact details have been pre-filled. Complete the subscription to convert this waitlist entry to a member.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Member Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Member Details</CardTitle>
                  <CardDescription>
                    Enter member information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Library Selection */}
              <FormField label="Library" required error={errors.library_id}>
                <Combobox
                  options={libraryOptions}
                  value={formData.library_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                  placeholder="Select a library..."
                  searchPlaceholder="Search libraries..."
                  emptyText="No libraries found"
                  disabled={saving || loadingData || !!preselectedLibrary}
                />
              </FormField>

              {/* Photo Upload */}
              <div className="flex justify-center">
                <ProfilePhotoUpload
                  bucket="person-photos"
                  folder="profiles"
                  value={formData.photo_url || ""}
                  onChange={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                  size="lg"
                  placeholder="Add Photo"
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Name" htmlFor="name" required error={errors.name}>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Rahul Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Phone Number" htmlFor="phone" required error={errors.phone}>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="e.g., 9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={saving}
                    type="tel"
                    maxLength={10}
                  />
                </FormField>
              </div>

              <FormField label="Email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  placeholder="e.g., rahul@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={saving}
                  type="email"
                />
              </FormField>

              {/* Gender & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Gender" htmlFor="gender">
                  <Select
                    value={formData.gender}
                    onChange={handleChange}
                    name="gender"
                    id="gender"
                    disabled={saving}
                    options={GENDER_OPTIONS}
                  />
                </FormField>
                <FormField label="Date of Birth" htmlFor="date_of_birth">
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
              </div>

              {/* Father/Guardian Name */}
              <FormField label="Father/Guardian Name" htmlFor="father_name">
                <Input
                  id="father_name"
                  name="father_name"
                  placeholder="e.g., Mr. Sharma"
                  value={formData.father_name}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>

              {/* ID Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="ID Proof Type" htmlFor="id_proof_type">
                  <Select
                    value={formData.id_proof_type}
                    onChange={handleChange}
                    name="id_proof_type"
                    id="id_proof_type"
                    disabled={saving}
                    options={ID_PROOF_TYPE_OPTIONS}
                  />
                </FormField>
                <FormField label="ID Number" htmlFor="id_proof_number">
                  <Input
                    id="id_proof_number"
                    name="id_proof_number"
                    placeholder="e.g., XXXX-XXXX-XXXX"
                    value={formData.id_proof_number}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                    Select plan and schedule. Payment can be recorded after creation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Selection */}
              <FormField label="Subscription Plan" error={errors.plan_id} tooltip="The plan defines the daily hours allowance and base price. You can override the amount below."  >
                <Combobox
                  options={planOptions}
                  value={formData.plan_id}
                  onValueChange={handlePlanChange}
                  placeholder="Select a plan..."
                  searchPlaceholder="Search plans..."
                  emptyText="No plans found"
                  disabled={saving || loadingData}
                />
              </FormField>

              {/* Start Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start Date" htmlFor="start_date" required>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleStartDateChange}
                    required
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Duration (Months)" htmlFor="duration_months" required hint={computedEndDate ? `Ends: ${formatDate(computedEndDate)}` : undefined} tooltip="How many months this subscription is valid for. The end date is calculated automatically."  >
                  <Input
                    id="duration_months"
                    name="duration_months"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.duration_months}
                    onChange={handleDurationChange}
                    required
                    disabled={saving}
                  />
                </FormField>
              </div>

              {/* Access Schedule (Multi-Slot Time Input) */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Label>Access Schedule (optional)</Label>
                  <HelpTooltip content="Define when this member is allowed to study. Each time slot is a daily window (e.g., 9 AM–12 PM). Members can have multiple non-overlapping slots per day." />
                </div>
                <div className="border rounded-lg p-3 space-y-3">
                  {formData.time_slots.map((slot: TimeSlot, idx: number) => {
                    const slotHours = calcSlotHours(slot)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Slot {idx + 1}:</span>
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => {
                            const updated = [...formData.time_slots]
                            updated[idx] = { ...updated[idx], start: e.target.value }
                            setFormData((prev) => ({ ...prev, time_slots: updated }))
                          }}
                          disabled={saving}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">&mdash;</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => {
                            const updated = [...formData.time_slots]
                            updated[idx] = { ...updated[idx], end: e.target.value }
                            setFormData((prev) => ({ ...prev, time_slots: updated }))
                          }}
                          disabled={saving}
                          className="w-32"
                        />
                        {slot.start && slot.end && (
                          <span className="text-xs text-muted-foreground w-10 text-right">{slotHours.toFixed(1)}h</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            const updated = formData.time_slots.filter((_: TimeSlot, i: number) => i !== idx)
                            setFormData((prev) => ({ ...prev, time_slots: updated }))
                          }}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}

                  {validTimeSlots.length > 0 && selectedPlan?.hours_included && (
                    <div className={`text-xs font-medium ${hoursExceeded ? "text-destructive" : "text-muted-foreground"}`}>
                      Total: {totalSlotHours.toFixed(1)}h / {selectedPlan.hours_included}h daily {hoursExceeded ? "\u2717" : "\u2713"}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, time_slots: [...prev.time_slots, { start: "", end: "" }] }))}
                    disabled={saving}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Slot
                  </Button>
                </div>
                {formData.time_slots.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty for full day access (no time restriction).
                  </p>
                )}
              </div>

              {/* Amount & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Amount" htmlFor="amount" hint={priceCalcDisplay ?? undefined}>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Discount" htmlFor="discount">
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.discount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    disabled={saving}
                  />
                </FormField>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div className="border-t pt-4 bg-muted/50 rounded-lg p-4 mt-4">
                  <h3 className="font-medium mb-3">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Plan</span>
                      <span className="font-medium">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="font-medium">{formData.duration_months} month{formData.duration_months !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Period</span>
                      <span className="font-medium">
                        {formData.start_date ? formatDate(formData.start_date) : "\u2014"}
                        {computedEndDate ? ` \u2013 ${formatDate(computedEndDate)}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Access Schedule</span>
                      <span className="font-medium text-right">
                        {validTimeSlots.length > 0 ? (
                          <span className="flex flex-col items-end gap-0.5">
                            {validTimeSlots.map((slot: TimeSlot, idx: number) => (
                              <span key={idx}>
                                {formatTime12h(slot.start)} &ndash; {formatTime12h(slot.end)} ({calcSlotHours(slot).toFixed(1)}h)
                              </span>
                            ))}
                            {validTimeSlots.length > 1 && (
                              <span className="text-xs text-muted-foreground">Total: {totalSlotHours.toFixed(1)}h</span>
                            )}
                          </span>
                        ) : "Full Day"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Hours</span>
                      <span className="font-medium">{selectedPlan.hours_included || 0}h/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-medium">
                        {formData.duration_months !== 1
                          ? <><Currency amount={selectedPlan.base_price} /> &times; {formData.duration_months} = <Currency amount={selectedPlan.base_price * formData.duration_months} /></>
                          : <Currency amount={formData.amount} />
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="font-medium"><Currency amount={formData.discount} /></span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-success"><Currency amount={finalAmount} /></span>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={backHref}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Register Member"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
