/**
 * Renew Library Member Subscription Page
 *
 * Form to renew a member's subscription with new hours.
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, CreditCard, Loader2, Clock, RefreshCw } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { PageLoading } from "@/components/ui/loading"
import { withCreatedBy } from "@/lib/audit"
import { TIME_SLOTS } from "@/types/library.types"
import { Currency } from "@/components/ui/currency"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"

interface MemberData {
  id: string
  name: string
  member_code: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  owner_id: string
  workspace_id: string
  library?: { id: string; name: string } | null
}

interface Plan {
  id: string
  name: string
  hours_included: number | null
  validity_days: number
  base_price: number
}

export default function RenewLibraryMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const { handleSuccess } = useFormSubmit({
    redirectTo: `/library-members/${id}`,
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])

  const [formData, setFormData] = useState({
    plan_id: "",
    start_date: getTodayISO(),
    amount: "",
    discount_amount: "0",
    time_slot: "",
    payment_method: "cash",
    payment_reference: "",
    add_to_existing: true,
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch member
      const { data: memberData, error: memberError } = await supabase
        .from("library_members")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (memberError || !memberData) {
        showError("Member not found")
        router.push("/library-members")
        return
      }

      setMember(memberData)
      setFormData((prev) => ({
        ...prev,
        time_slot: memberData.preferred_slot || "Morning",
      }))

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
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      amount: plan?.base_price?.toString() || "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.plan_id && !formData.amount) {
      showError("Please select a plan or enter an amount")
      return
    }

    if (!user || !member) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const selectedPlan = plans.find((p) => p.id === formData.plan_id)
      const hoursToAdd = selectedPlan?.hours_included || 0

      // Calculate dates
      const startDate = new Date(formData.start_date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedPlan?.validity_days || 30))

      const amount = parseFloat(formData.amount) || 0
      const discountAmount = parseFloat(formData.discount_amount) || 0
      const finalAmount = amount - discountAmount

      // Create payment record
      let paymentId: string | null = null
      if (finalAmount > 0) {
        // Generate receipt number
        const { data: lastPayment } = await supabase
          .from("library_payments")
          .select("receipt_number")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (lastPayment?.receipt_number) {
          const match = lastPayment.receipt_number.match(/LIB-(\d+)/)
          if (match) nextNumber = parseInt(match[1], 10) + 1
        }
        const receiptNumber = `LIB-${nextNumber.toString().padStart(6, "0")}`

        const paymentData = withCreatedBy({
          owner_id: member.owner_id,
          workspace_id: member.workspace_id,
          member_id: member.id,
          receipt_number: receiptNumber,
          payment_date: formData.start_date,
          amount: finalAmount,
          payment_type: "subscription",
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference || null,
          status: "completed",
        }, user.id)

        const { data: payment, error: paymentError } = await supabase
          .from("library_payments")
          .insert(paymentData)
          .select()
          .single()

        if (paymentError) {
          console.error("Error creating payment:", paymentError)
          showError(`Failed to create payment: ${paymentError.message}`)
          setLoading(false)
          return
        }

        paymentId = payment?.id
      }

      // Create new membership record
      const membershipData = withCreatedBy({
        owner_id: member.owner_id,
        workspace_id: member.workspace_id,
        member_id: member.id,
        plan_id: formData.plan_id || null,
        plan_name: selectedPlan?.name || "Custom Renewal",
        hours_included: hoursToAdd || null,
        amount: amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        time_slot: formData.time_slot,
        start_date: formData.start_date,
        end_date: endDate.toISOString().split("T")[0],
        hours_remaining: hoursToAdd || null,
        hours_used: 0,
        status: "active",
        payment_id: paymentId,
      }, user.id)

      const { data: membership, error: membershipError } = await supabase
        .from("library_memberships")
        .insert(membershipData)
        .select()
        .single()

      if (membershipError) {
        console.error("Error creating membership:", membershipError)
        showError(`Failed to create subscription: ${membershipError.message}`)
        setLoading(false)
        return
      }

      // Update member with new hours and subscription
      const newHoursBalance = formData.add_to_existing
        ? member.hours_balance + hoursToAdd
        : hoursToAdd

      const { error: memberUpdateError } = await supabase
        .from("library_members")
        .update({
          hours_balance: newHoursBalance,
          current_subscription_id: membership.id,
          expiry_date: endDate.toISOString().split("T")[0],
          status: "active",
          updated_at: getNowISO(),
        })
        .eq("id", member.id)

      if (memberUpdateError) {
        console.error("Error updating member:", memberUpdateError)
      }

      // Mark previous active memberships as upgraded
      await supabase
        .from("library_memberships")
        .update({ status: "upgraded" })
        .eq("member_id", member.id)
        .eq("status", "active")
        .neq("id", membership.id)

      handleSuccess({ message: `Subscription renewed! Added ${hoursToAdd}h to balance.` })
    } catch (error) {
      handleClientError(error, "Renewing subscription")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading member..." />
  }

  if (!member) {
    return null
  }

  const selectedPlan = plans.find((p) => p.id === formData.plan_id)
  const finalAmount = (parseFloat(formData.amount) || 0) - (parseFloat(formData.discount_amount) || 0)
  const newHoursBalance = formData.add_to_existing
    ? member.hours_balance + (selectedPlan?.hours_included || 0)
    : selectedPlan?.hours_included || 0

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - ₹${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-members/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Renew Subscription</h1>
          <p className="text-muted-foreground">
            {member.name} • {member.member_code}
          </p>
        </div>
      </div>

      {/* Current Balance Card */}
      <Card className="border-info/20 bg-info/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Hours Balance</p>
                <p className="text-2xl font-bold">{member.hours_balance.toFixed(1)}h</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Used</p>
              <p className="text-lg font-medium">{member.hours_used.toFixed(1)}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <RefreshCw className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>New Subscription</CardTitle>
                <CardDescription>
                  Select a plan and record payment
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Subscription Plan *</Label>
              <Combobox
                options={planOptions}
                value={formData.plan_id}
                onValueChange={handlePlanChange}
                placeholder="Select a plan..."
                searchPlaceholder="Search plans..."
                emptyText="No plans found"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_slot">Time Slot</Label>
                <Select
                  value={formData.time_slot}
                  onChange={handleChange}
                  name="time_slot"
                  disabled={loading}
                  options={TIME_SLOTS.map((slot) => ({
                    value: slot.value,
                    label: slot.label,
                  }))}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="e.g., 1000"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount (₹)</Label>
                  <Input
                    id="discount_amount"
                    name="discount_amount"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.discount_amount}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onChange={handleChange}
                    name="payment_method"
                    disabled={loading}
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "upi", label: "UPI" },
                      { value: "card", label: "Card" },
                      { value: "bank_transfer", label: "Bank Transfer" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Reference</Label>
                  <Input
                    id="payment_reference"
                    name="payment_reference"
                    placeholder="e.g., UPI Ref Number"
                    value={formData.payment_reference}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 bg-muted/50 rounded-lg p-4 mt-4">
              <h3 className="font-medium mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-medium">{selectedPlan?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours to Add</span>
                  <span className="font-medium">{selectedPlan?.hours_included || 0}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Balance</span>
                  <span>{member.hours_balance.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
                  <span>New Balance</span>
                  <span className="text-success">{newHoursBalance.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Amount to Pay</span>
                  <span><Currency amount={finalAmount} /></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-members/${id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Renew Subscription"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
