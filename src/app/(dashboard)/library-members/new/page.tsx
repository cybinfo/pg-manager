/**
 * New Library Member Page
 *
 * Form to register a new library member with subscription.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Users, Loader2, CreditCard, UserCheck } from "lucide-react"
import { TIME_SLOTS } from "@/types/library.types"

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

export default function NewLibraryMemberPage() {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "library_members",
    initialData: {
      library_id: "",
      name: "",
      phone: "",
      email: "",
      id_proof_type: "aadhar",
      id_proof_number: "",
      preferred_slot: "Morning",
      notes: "",
      // Subscription
      plan_id: "",
      start_date: new Date().toISOString().split("T")[0],
      amount: "",
      discount_amount: "0",
      payment_method: "cash",
      payment_reference: "",
    },
    redirectTo: "/library-members",
    successMessage: "Member registered successfully!",
    errorMessage: "Failed to register member",
    validate: (data) => {
      if (!data.library_id || !data.name || !data.phone) {
        return "Please fill in required fields (Library, Name, Phone)"
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id, code, name")
        .eq("id", data.library_id)
        .single()

      if (!library) {
        throw new Error("Library not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      // Generate member code
      const libraryCode = library.code || library.name.slice(0, 3).toUpperCase()
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from("library_members")
        .select("*", { count: "exact", head: true })
        .eq("library_id", data.library_id)

      const memberCode = `${libraryCode}-${year}-${String((count || 0) + 1).padStart(4, "0")}`

      // Calculate subscription dates
      const selectedPlan = plans.find((p) => p.id === data.plan_id)
      const startDate = new Date(data.start_date as string)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedPlan?.validity_days || 30))

      const amount = parseFloat(data.amount as string) || 0
      const discountAmount = parseFloat(data.discount_amount as string) || 0
      const finalAmount = amount - discountAmount

      // Create member
      const memberData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: data.library_id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        member_code: memberCode,
        id_proof_type: data.id_proof_type || null,
        id_proof_number: data.id_proof_number || null,
        preferred_slot: data.preferred_slot || null,
        notes: data.notes || null,
        status: "active",
        join_date: data.start_date,
        expiry_date: endDate.toISOString().split("T")[0],
        hours_balance: selectedPlan?.hours_included || 0,
        hours_used: 0,
      }, userId)

      const { data: member, error: memberError } = await supabase
        .from("library_members")
        .insert(memberData)
        .select()
        .single()

      if (memberError || !member) {
        throw new Error(memberError?.message || "Failed to create member")
      }

      // Create payment record if amount > 0
      let paymentId: string | null = null
      if (finalAmount > 0) {
        const paymentData = withCreatedBy({
          owner_id: library.owner_id,
          workspace_id: workspaceId,
          member_id: member.id,
          payment_date: data.start_date,
          amount: finalAmount,
          payment_type: "subscription",
          payment_method: data.payment_method,
          payment_reference: data.payment_reference || null,
          status: "completed",
        }, userId)

        const { data: payment, error: paymentError } = await supabase
          .from("library_payments")
          .insert(paymentData)
          .select()
          .single()

        if (paymentError) {
          console.error("Error creating payment:", paymentError)
          // Don't fail - member is created, payment can be added later
        } else {
          paymentId = payment?.id
        }
      }

      // Create membership record
      const membershipData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        member_id: member.id,
        plan_id: data.plan_id || null,
        plan_name: selectedPlan?.name || "Custom",
        hours_included: selectedPlan?.hours_included || null,
        amount: amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        time_slot: data.preferred_slot,
        start_date: data.start_date,
        end_date: endDate.toISOString().split("T")[0],
        hours_remaining: selectedPlan?.hours_included || null,
        hours_used: 0,
        status: "active",
        payment_id: paymentId,
      }, userId)

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

      // If converting from waitlist, update the waitlist entry
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        const waitlistId = urlParams.get("waitlist_id")
        if (waitlistId) {
          const { error: waitlistError } = await supabase
            .from("library_waitlist")
            .update({
              status: "converted",
              converted_member_id: member.id,
              converted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", waitlistId)

          if (waitlistError) {
            console.error("Error updating waitlist entry:", waitlistError)
          }
        }
      }

      return `/library-members/${member.id}`
    },
  })

  // Read pre-filled values from URL (e.g., from waitlist conversion)
  const preselectedLibrary = searchParams.get("library")
  const prefilledName = searchParams.get("name")
  const prefilledPhone = searchParams.get("phone")
  const prefilledEmail = searchParams.get("email")
  const prefilledSlot = searchParams.get("slot")
  const waitlistId = searchParams.get("waitlist_id")

  // Pre-fill from URL params
  useEffect(() => {
    const updates: Record<string, string> = {}
    if (preselectedLibrary && !formData.library_id) updates.library_id = preselectedLibrary
    if (prefilledName && !formData.name) updates.name = prefilledName
    if (prefilledPhone && !formData.phone) updates.phone = prefilledPhone
    if (prefilledEmail && !formData.email) updates.email = prefilledEmail
    if (prefilledSlot && formData.preferred_slot === "Morning") updates.preferred_slot = prefilledSlot
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }))
    }
  }, [preselectedLibrary, prefilledName, prefilledPhone, prefilledEmail, prefilledSlot, setFormData, formData.library_id, formData.name, formData.phone, formData.email, formData.preferred_slot])

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

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      amount: plan?.base_price?.toString() || "",
    }))
  }

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
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Converting from Waitlist
            </p>
            <p className="text-xs text-green-600">
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
              <div className="space-y-2">
                <Label>Library *</Label>
                <Combobox
                  options={libraryOptions}
                  value={formData.library_id as string}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                  placeholder="Select a library..."
                  searchPlaceholder="Search libraries..."
                  emptyText="No libraries found"
                  disabled={saving || loadingData || !!preselectedLibrary}
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Rahul Sharma"
                    value={formData.name as string}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="e.g., 9876543210"
                    value={formData.phone as string}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    type="tel"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="e.g., rahul@example.com"
                  value={formData.email as string}
                  onChange={handleChange}
                  disabled={saving}
                  type="email"
                />
              </div>

              {/* ID Proof */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_proof_type">ID Proof Type</Label>
                  <Select
                    value={formData.id_proof_type as string}
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
                    value={formData.id_proof_number as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Preferred Slot */}
              <div className="space-y-2">
                <Label htmlFor="preferred_slot">Preferred Time Slot</Label>
                <Select
                  value={formData.preferred_slot as string}
                  onChange={handleChange}
                  name="preferred_slot"
                  disabled={saving}
                  options={TIME_SLOTS.map((slot) => ({
                    value: slot.value,
                    label: slot.label,
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Subscription & Payment</CardTitle>
                  <CardDescription>
                    Select plan and record payment
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
                  value={formData.plan_id as string}
                  onValueChange={handlePlanChange}
                  placeholder="Select a plan..."
                  searchPlaceholder="Search plans..."
                  emptyText="No plans found"
                  disabled={saving || loadingData}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date as string}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (Rs.) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="e.g., 1000"
                    value={formData.amount as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount (Rs.)</Label>
                  <Input
                    id="discount_amount"
                    name="discount_amount"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.discount_amount as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Final Amount</Label>
                  <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                    Rs.{((parseFloat(formData.amount as string) || 0) - (parseFloat(formData.discount_amount as string) || 0)).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method as string}
                    onChange={handleChange}
                    name="payment_method"
                    disabled={saving}
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "upi", label: "UPI" },
                      { value: "card", label: "Card" },
                      { value: "bank_transfer", label: "Bank Transfer" },
                      { value: "cheque", label: "Cheque" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Reference</Label>
                  <Input
                    id="payment_reference"
                    name="payment_reference"
                    placeholder="e.g., UPI Ref Number"
                    value={formData.payment_reference as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
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
