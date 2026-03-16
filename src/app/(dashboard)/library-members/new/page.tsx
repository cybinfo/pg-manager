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
import { Currency } from "@/components/ui/currency"
import { ArrowLeft, Users, Loader2, CreditCard, UserCheck, Trash2, Plus } from "lucide-react"
import { requiredField, requiredSelect, requiredPhone } from "@/lib/validation"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { formatDate } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { withCreatedBy } from "@/lib/audit"

interface Library {
  id: string
  name: string
  code: string | null
}

interface Plan {
  id: string
  name: string
  hours_included: number | null
  validity_days: number
  base_price: number
}

/**
 * Compute end date from start date + duration in months (each month = 30 days).
 */
function computeEndDate(startDate: string, durationMonths: number): string {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + Math.round(durationMonths * 30))
  return end.toISOString().split("T")[0]
}

/**
 * Format time string "HH:MM" to 12-hour display format.
 */
function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

interface TimeSlot {
  start: string
  end: string
}

/**
 * Calculate hours for a single time slot.
 */
function calcSlotHours(slot: TimeSlot): number {
  if (!slot.start || !slot.end) return 0
  const [sh, sm] = slot.start.split(":").map(Number)
  const [eh, em] = slot.end.split(":").map(Number)
  let hours = (eh * 60 + em - sh * 60 - sm) / 60
  if (hours < 0) hours += 24
  return hours
}

/**
 * Serialize time slots for database storage.
 * Empty array → null, any slots → JSON array string.
 */
function serializeTimeSlots(slots: TimeSlot[]): string | null {
  const valid = slots.filter((s) => s.start && s.end)
  if (valid.length === 0) return null
  return JSON.stringify(valid.map((s) => ({ start: s.start, end: s.end })))
}

/**
 * Parse time_slot from database into TimeSlot array.
 * Handles null, old "HH:MM-HH:MM" format, and JSON array format.
 */
function parseTimeSlots(raw: string | null): TimeSlot[] {
  if (!raw) return []
  // Try JSON array first
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((s: { start: string; end: string }) => ({
        start: s.start || "",
        end: s.end || "",
      }))
    }
  } catch {
    // Not JSON — try old format "HH:MM-HH:MM"
  }
  if (raw.includes("-")) {
    const [st, et] = raw.split("-")
    return [{ start: st.trim(), end: et.trim() }]
  }
  return []
}

export default function NewLibraryMemberPage() {
  return (
    <PermissionGuard permission="library_members.create">
      <NewLibraryMemberContent />
    </PermissionGuard>
  )
}

function NewLibraryMemberContent() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [libraries, setLibraries] = useState<Library[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    library_id: "",
    name: "",
    phone: "",
    email: "",
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const libraryResult = requiredSelect("Library")(formData.library_id)
    if (libraryResult && !libraryResult.isValid && libraryResult.error) {
      newErrors.library_id = libraryResult.error
    }

    const nameResult = requiredField("Full name")(formData.name)
    if (nameResult && !nameResult.isValid && nameResult.error) {
      newErrors.name = nameResult.error
    }

    const phoneResult = requiredPhone("Phone number")(formData.phone)
    if (phoneResult && !phoneResult.isValid && phoneResult.error) {
      newErrors.phone = phoneResult.error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id, code, name")
        .eq("id", formData.library_id)
        .single()

      if (!library) {
        throw new Error("Library not found")
      }

      // Get workspace_id from user context
      const { data: context } = await supabase
        .from("user_contexts")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single()

      const workspaceId = context?.workspace_id

      // Generate member code
      const libraryCode = library.code || library.name.slice(0, 3).toUpperCase()
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from("library_members")
        .select("*", { count: "exact", head: true })
        .eq("library_id", formData.library_id)

      const memberCode = `${libraryCode}-${year}-${String((count || 0) + 1).padStart(4, "0")}`

      // Calculate subscription dates
      const selectedPlan = plans.find((p) => p.id === formData.plan_id)

      // Validate total slot hours don't exceed plan hours
      const validSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
      if (validSlots.length > 0 && selectedPlan?.hours_included) {
        const totalSlotHours = validSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
        if (totalSlotHours > selectedPlan.hours_included) {
          showError(`Total slot hours (${totalSlotHours.toFixed(1)}h) exceeds plan limit (${selectedPlan.hours_included}h/day)`)
          setSaving(false)
          return
        }
      }

      const endDate = computeEndDate(formData.start_date, formData.duration_months)

      const finalAmount = formData.amount - formData.discount

      // Build time_slot string
      const timeSlot = serializeTimeSlots(formData.time_slots)

      // Auto-uppercase name
      const memberName = formData.name.toUpperCase()

      // Create member
      const memberData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: formData.library_id,
        name: memberName,
        phone: formData.phone,
        email: formData.email || null,
        member_code: memberCode,
        id_proof_type: formData.id_proof_type || null,
        id_proof_number: formData.id_proof_number || null,
        preferred_slot: formData.preferred_slot || null,
        notes: formData.notes || null,
        status: "active",
        join_date: formData.start_date,
        expiry_date: endDate,
        hours_balance: selectedPlan?.hours_included || 0,
        hours_used: 0,
      }, user.id)

      const { data: member, error: memberError } = await supabase
        .from("library_members")
        .insert(memberData)
        .select()
        .single()

      if (memberError || !member) {
        throw new Error(memberError?.message || "Failed to create member")
      }

      // Create membership record (no payment — that is done on the subscription detail page)
      const membershipData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        member_id: member.id,
        plan_id: formData.plan_id || null,
        plan_name: selectedPlan?.name || "Custom",
        hours_included: selectedPlan?.hours_included || null,
        amount: formData.amount,
        discount_amount: formData.discount,
        final_amount: finalAmount,
        time_slot: timeSlot,
        start_date: formData.start_date,
        end_date: endDate,
        hours_remaining: selectedPlan?.hours_included || null,
        hours_used: 0,
        status: "active",
        payment_id: null,
      }, user.id)

      const { data: membership, error: membershipError } = await supabase
        .from("library_memberships")
        .insert(membershipData)
        .select()
        .single()

      if (membershipError) {
        console.error("Error creating membership:", membershipError)
      }

      // Update member with current subscription
      if (membership) {
        await supabase
          .from("library_members")
          .update({ current_subscription_id: membership.id })
          .eq("id", member.id)
      }

      // Update person record with additional fields (gender, DOB, father/guardian)
      if (member.person_id || formData.gender || formData.date_of_birth || formData.father_name) {
        const personUpdates: Record<string, unknown> = {}
        if (formData.gender) personUpdates.gender = formData.gender
        if (formData.date_of_birth) personUpdates.date_of_birth = formData.date_of_birth
        if (formData.father_name) {
          personUpdates.emergency_contacts = [
            { name: formData.father_name.toUpperCase(), phone: "", relation: "Father/Guardian" },
          ]
        }

        if (Object.keys(personUpdates).length > 0 && member.person_id) {
          await supabase
            .from("people")
            .update(personUpdates)
            .eq("id", member.person_id)
        }
      }

      // Send welcome email (non-blocking)
      if (formData.email) {
        import("@/lib/email").then(({ sendLibraryMemberWelcomeEmail }) => {
          sendLibraryMemberWelcomeEmail({
            to: formData.email,
            memberName: memberName,
            libraryName: library.name,
            memberCode: memberCode,
            planName: selectedPlan?.name,
            hoursIncluded: selectedPlan?.hours_included || undefined,
          }).catch((err: unknown) => {
            console.warn("[NewLibraryMember] Failed to send welcome email:", err)
          })
        }).catch((err: unknown) => {
          console.warn("[NewLibraryMember] Failed to load email module:", err)
        })
      }

      // If converting from waitlist, update the waitlist entry
      if (waitlistId) {
        const { error: waitlistError } = await supabase
          .from("library_waitlist")
          .update({
            status: "converted",
            converted_member_id: member.id,
            converted_at: getNowISO(),
            updated_at: getNowISO(),
          })
          .eq("id", waitlistId)

        if (waitlistError) {
          console.error("Error updating waitlist entry:", waitlistError)
        }
      }

      // Redirect to the subscription detail page for payment recording
      if (membership) {
        router.push(`/library-subscriptions/${membership.id}`)
      } else {
        router.push(`/library-members/${member.id}`)
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
    ? `\u20B9${selectedPlan.base_price.toLocaleString("en-IN")}/month \u00D7 ${formData.duration_months} month${formData.duration_months !== 1 ? "s" : ""} = \u20B9${(selectedPlan.base_price * formData.duration_months).toLocaleString("en-IN")}`
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
        <Link href="/library-members">
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

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="e.g., rahul@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={saving}
                  type="email"
                />
              </div>

              {/* Gender & Date of Birth */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onChange={handleChange}
                    name="gender"
                    disabled={saving}
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Father/Guardian Name */}
              <div className="space-y-2">
                <Label htmlFor="father_name">Father/Guardian Name</Label>
                <Input
                  id="father_name"
                  name="father_name"
                  placeholder="e.g., Mr. Sharma"
                  value={formData.father_name}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              {/* ID Proof */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_proof_type">ID Proof Type</Label>
                  <Select
                    value={formData.id_proof_type}
                    onChange={handleChange}
                    name="id_proof_type"
                    disabled={saving}
                    options={[
                      { value: "aadhar", label: "Aadhaar Card" },
                      { value: "pan", label: "PAN Card" },
                      { value: "student_id", label: "Student ID" },
                      { value: "voter_id", label: "Voter ID" },
                      { value: "driving_license", label: "Driving License" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_proof_number">ID Number</Label>
                  <Input
                    id="id_proof_number"
                    name="id_proof_number"
                    placeholder="e.g., XXXX-XXXX-XXXX"
                    value={formData.id_proof_number}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
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
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Combobox
                  options={planOptions}
                  value={formData.plan_id}
                  onValueChange={handlePlanChange}
                  placeholder="Select a plan..."
                  searchPlaceholder="Search plans..."
                  emptyText="No plans found"
                  disabled={saving || loadingData}
                />
              </div>

              {/* Start Date & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleStartDateChange}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duration (Months) *</Label>
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
                  {computedEndDate && (
                    <p className="text-xs text-muted-foreground">
                      Ends: {formatDate(computedEndDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Access Schedule (Multi-Slot Time Input) */}
              <div className="space-y-3">
                <Label>Access Schedule (optional)</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
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
                  {priceCalcDisplay && (
                    <p className="text-xs text-muted-foreground">{priceCalcDisplay}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
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
                </div>
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
          <Link href="/library-members">
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
