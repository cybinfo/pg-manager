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
import { ArrowLeft, Users, Loader2, CreditCard, UserCheck } from "lucide-react"
import { requiredField, requiredSelect, requiredPhone } from "@/lib/validation"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
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
 * Compute end date from start date + validity days.
 */
function computeEndDate(startDate: string, validityDays: number): string {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + validityDays)
  return end.toISOString().split("T")[0]
}

/**
 * Compute duration in days between two date strings.
 */
function computeDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
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
  const [endDateManuallySet, setEndDateManuallySet] = useState(false)

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
    end_date: "",
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
    const newStartDate = e.target.value
    setFormData((prev) => {
      if (!endDateManuallySet && prev.end_date && prev.start_date) {
        const currentDuration = computeDurationDays(prev.start_date, prev.end_date)
        const newEndDate = computeEndDate(newStartDate, currentDuration)
        return { ...prev, start_date: newStartDate, end_date: newEndDate }
      }
      return { ...prev, start_date: newStartDate }
    })
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDateManuallySet(true)
    setFormData((prev) => ({ ...prev, end_date: e.target.value }))
  }

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    const newEndDate = plan
      ? computeEndDate(formData.start_date, plan.validity_days)
      : formData.end_date

    setEndDateManuallySet(false)
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      end_date: newEndDate,
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
      const endDate = formData.end_date || (selectedPlan
        ? computeEndDate(formData.start_date, selectedPlan.validity_days)
        : computeEndDate(formData.start_date, 30))

      const amount = selectedPlan?.base_price || 0

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
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        time_slot: null,
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
  const durationDays = formData.start_date && formData.end_date
    ? computeDurationDays(formData.start_date, formData.end_date)
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

              {/* Start Date & End Date */}
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
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleEndDateChange}
                    required
                    disabled={saving}
                  />
                  {durationDays !== null && (
                    <p className="text-xs text-muted-foreground">
                      Duration: {durationDays} days
                    </p>
                  )}
                </div>
              </div>

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
