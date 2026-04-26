/**
 * Renew Library Member Subscription Page
 *
 * Form to renew a member's subscription with new hours.
 * Pre-fills current plan/slot/seat and shows current expiry date.
 * Smart start date: defaults to expiry+1 or today if already expired.
 * Creates membership record (payment is recorded separately on the subscription detail page).
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { Combobox } from "@/components/ui/combobox"
import { StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Loader2, Clock, RefreshCw, Calendar, AlertTriangle, Trash2, Plus } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { PageLoading } from "@/components/ui/loading"
import { withCreatedBy } from "@/lib/audit"
import { Currency } from "@/components/ui/currency"
import { formatDate, formatNumber} from "@/lib/format"
import { getTodayISO, getNowISO, computeEndDate, computeDefaultStartDate } from "@/lib/date-helpers"
import { TimeSlot, formatTime12h, calcSlotHours, serializeTimeSlots, parseTimeSlots } from "@/lib/time-slots"
import { useFormValidation } from "@/lib/hooks/useFormValidation"
import { requiredSelect, requiredDate } from "@/lib/validation"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

interface MemberData {
  id: string
  name: string
  member_code: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  expiry_date: string | null
  status: string
  current_subscription_id: string | null
  owner_id: string
  workspace_id: string
  library?: { id: string; name: string } | null
  person?: { id: string; name?: string } | null
}

interface Plan {
  id: string
  name: string
  hours_included: number | null
  validity_days: number
  base_price: number
}

interface CurrentMembership {
  id: string
  plan_id: string | null
  plan_name: string
  time_slot: string | null
  hours_included: number | null
}

export default function RenewLibraryMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const { backHref } = useBackNavigation({ defaultHref: `/library-members/${id}` })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentMembership, setCurrentMembership] = useState<CurrentMembership | null>(null)

  const [formData, setFormData] = useState({
    plan_id: "",
    start_date: getTodayISO(),
    duration_months: 1,
    amount: 0,
    discount: 0,
    time_slots: [] as TimeSlot[],
  })

  const validationSchema = {
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
    async function fetchData() {
      const supabase = createClient()

      // Fetch member with person data for display name
      const { data: memberData, error: memberError } = await supabase
        .from("library_members")
        .select("*, library:libraries(id, name), person:people(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (memberError || !memberData) {
        showError("Member not found")
        router.push("/library-members")
        return
      }

      setMember(memberData)

      // Fetch current active membership to pre-fill plan/slot
      if (memberData.current_subscription_id) {
        const { data: membershipData } = await supabase
          .from("library_memberships")
          .select("id, plan_id, plan_name, time_slot")
          .eq("id", memberData.current_subscription_id)
          .single()

        if (membershipData) {
          setCurrentMembership(membershipData)
        }
      }

      // Smart start date
      const smartStartDate = computeDefaultStartDate(memberData.expiry_date, memberData.status)

      setFormData((prev) => ({
        ...prev,
        start_date: smartStartDate,
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

  // Pre-fill plan from current membership once plans are loaded
  useEffect(() => {
    if (currentMembership && plans.length > 0 && !formData.plan_id) {
      const matchingPlan = plans.find((p) => p.id === currentMembership.plan_id)
      if (matchingPlan) {
        const durationMonths = 1
        const amount = matchingPlan.base_price * durationMonths

        // Pre-fill time slots from current membership time_slot
        const prefillSlots = parseTimeSlots(currentMembership.time_slot)

        setFormData((prev) => ({
          ...prev,
          plan_id: matchingPlan.id,
          duration_months: durationMonths,
          amount: amount,
          discount: 0,
          time_slots: prefillSlots,
        }))
      }
    }
  }, [currentMembership, plans, formData.plan_id])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll(formData as unknown as Record<string, unknown>)) {
      return
    }

    if (!user || !member) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    // Validate total slot hours don't exceed plan hours
    const plan = plans.find((p) => p.id === formData.plan_id)
    const validSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
    if (validSlots.length > 0 && plan?.hours_included) {
      const totalSlotHours = validSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
      if (totalSlotHours > plan.hours_included) {
        showError(`Total slot hours (${totalSlotHours.toFixed(1)}h) exceeds plan limit (${plan.hours_included}h/day)`)
        return
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const selectedPlan = plans.find((p) => p.id === formData.plan_id)
      const hoursToAdd = selectedPlan?.hours_included || 0

      const finalAmount = formData.amount - formData.discount
      const endDate = computeEndDate(formData.start_date, formData.duration_months)

      // Build time_slot string
      const timeSlot = serializeTimeSlots(formData.time_slots)

      // Create new membership record
      const membershipData = withCreatedBy({
        owner_id: member.owner_id,
        workspace_id: member.workspace_id,
        member_id: member.id,
        plan_id: formData.plan_id || null,
        plan_name: selectedPlan?.name || "Custom Renewal",
        hours_included: hoursToAdd || null,
        amount: formData.amount,
        discount_amount: formData.discount,
        final_amount: finalAmount,
        time_slot: timeSlot,
        start_date: formData.start_date,
        end_date: endDate,
        hours_remaining: null,
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
        showError(`Failed to create subscription: ${membershipError.message}`)
        setLoading(false)
        return
      }

      // Update member — hours_balance is the daily allowance (per-day model)
      const { error: memberUpdateError } = await supabase
        .from("library_members")
        .update({
          hours_balance: hoursToAdd,
          current_subscription_id: membership.id,
          expiry_date: endDate,
          status: "active",
          left_date: null,
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

      // Redirect to the new subscription detail page for payment recording
      router.push(`/library-subscriptions/${membership.id}`)
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

  const displayName = member.person?.name || member.name
  const selectedPlan = plans.find((p) => p.id === formData.plan_id)

  // Compute expiry info
  const isExpired = member.status === "expired"
  const expiryDate = member.expiry_date ? new Date(member.expiry_date) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

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

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
  }))

  return (
    <PermissionGuard permission="library_members.edit">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Renew Subscription</h1>
            <p className="text-muted-foreground">
              {displayName} {member.member_code ? `\u2022 ${member.member_code}` : ""}
            </p>
          </div>
        </div>

        {/* Current Expiry Info Card */}
        {member.expiry_date && (
          <Card className={isExpired ? "border-destructive/20 bg-destructive/5" : "border-warning/20 bg-warning/5"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isExpired ? "bg-destructive/10" : "bg-warning/10"}`}>
                    <Calendar className={`h-5 w-5 ${isExpired ? "text-destructive" : "text-warning"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Expiry Date</p>
                    <p className="text-lg font-semibold">{formatDate(member.expiry_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {isExpired ? (
                    <StatusBadge status="error" label="Expired" />
                  ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? (
                    <StatusBadge status="warning" label={`${daysUntilExpiry}d left`} />
                  ) : (
                    <StatusBadge status="success" label={`${daysUntilExpiry}d left`} />
                  )}
                  {currentMembership && (
                    <p className="text-xs text-muted-foreground mt-1">Plan: {currentMembership.plan_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Balance Card */}
        <Card className="border-info/20 bg-info/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-2xl font-bold">{currentMembership?.plan_name || "None"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Daily Allowance</p>
                <p className="text-lg font-medium">{currentMembership?.hours_included || 0}h/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Early Renewal Notice */}
        {!isExpired && member.expiry_date && daysUntilExpiry !== null && daysUntilExpiry > 0 && (
          <div className="flex items-center gap-3 p-3 bg-info/10 border border-info/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-info flex-shrink-0" />
            <p className="text-sm text-info">
              Early renewal: the new subscription will start on {formData.start_date} (day after current expiry). Hours will be added to the existing balance.
            </p>
          </div>
        )}

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
                    Select a plan and schedule. Payment can be recorded after creation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Selection */}
              <FormField
                label="Subscription Plan"
                required
                error={errors.plan_id as string | undefined}
              >
                <Combobox
                  options={planOptions}
                  value={formData.plan_id}
                  onValueChange={(val) => {
                    handlePlanChange(val)
                    validateField("plan_id")
                  }}
                  placeholder="Select a plan..."
                  searchPlaceholder="Search plans..."
                  emptyText="No plans found"
                  disabled={loading}
                />
              </FormField>

              {/* Start Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Start Date"
                  htmlFor="start_date"
                  required
                  error={errors.start_date as string | undefined}
                >
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleStartDateChange}
                    onBlur={() => validateField("start_date")}
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  label="Duration (Months)"
                  htmlFor="duration_months"
                  required
                  error={errors.duration_months as string | undefined}
                  hint={computedEndDate ? `Ends: ${formatDate(computedEndDate)}` : undefined}
                >
                  <Input
                    id="duration_months"
                    name="duration_months"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.duration_months}
                    onChange={handleDurationChange}
                    onBlur={() => validateField("duration_months")}
                    disabled={loading}
                  />
                </FormField>
              </div>

              {/* Access Schedule (Multi-Slot Time Input) */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Access Schedule <span className="text-muted-foreground font-normal">(optional)</span></p>
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
                          disabled={loading}
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
                          disabled={loading}
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
                          disabled={loading}
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
                    disabled={loading}
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
                <FormField
                  label="Amount"
                  htmlFor="amount"
                  hint={priceCalcDisplay ?? undefined}
                >
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  label="Discount"
                  htmlFor="discount"
                >
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.discount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    disabled={loading}
                  />
                </FormField>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 bg-muted/50 rounded-lg p-4 mt-4">
                <h3 className="font-medium mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Plan</span>
                    <span className="font-medium">{selectedPlan?.name || "\u2014"}</span>
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
                    <span className="font-medium">{selectedPlan?.hours_included || 0}h/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-medium">
                      {selectedPlan && formData.duration_months !== 1
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Link href={backHref}>
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
    </PermissionGuard>
  )
}
