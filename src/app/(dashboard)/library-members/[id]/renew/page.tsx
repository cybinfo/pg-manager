/**
 * Renew Library Member Subscription Page
 *
 * 3-step guided workflow: Plan → Schedule → Confirm & Renew
 * Fetches member + current membership + plans.
 * Smart start date: defaults to expiry+1 or today if already expired.
 * Creates membership record (payment is recorded separately on the subscription detail page).
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { Combobox } from "@/components/ui/combobox"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"
import { Loader2, Clock, RefreshCw, Calendar, AlertTriangle, Trash2, Plus, BookOpen, CheckCircle } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { PageLoading } from "@/components/ui/loading"
import { Currency } from "@/components/ui/currency"
import { formatDate, formatNumber } from "@/lib/format"
import { getTodayISO, computeEndDate, computeDefaultStartDate } from "@/lib/date-helpers"
import { TimeSlot, formatTime12h, calcSlotHours, parseTimeSlots } from "@/lib/time-slots"
import { useFormValidation } from "@/lib/hooks/useFormValidation"
import { requiredSelect, requiredDate } from "@/lib/validation"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import type { LibraryPlanOption } from "@/types/library.types"
import { renewLibraryMembership } from "@/lib/services/library-members"

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

interface CurrentMembership {
  id: string
  plan_id: string | null
  plan_name: string
  time_slot: string | null
  hours_included: number | null
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Choose Plan", icon: BookOpen },
  { id: 2, label: "Schedule", icon: Calendar },
  { id: 3, label: "Confirm & Renew", icon: CheckCircle },
]

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
  const [plans, setPlans] = useState<LibraryPlanOption[]>([])
  const [currentMembership, setCurrentMembership] = useState<CurrentMembership | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

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

      const smartStartDate = computeDefaultStartDate(memberData.expiry_date, memberData.status)
      setFormData((prev) => ({ ...prev, start_date: smartStartDate }))

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

  const doSubmit = async () => {
    if (!validateAll(formData as unknown as Record<string, unknown>)) {
      return
    }

    if (!user || !member) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

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

      const { membershipId } = await renewLibraryMembership(supabase, {
        userId: user.id,
        member: { id: member.id, owner_id: member.owner_id, workspace_id: member.workspace_id },
        planId: formData.plan_id,
        planName: selectedPlan?.name || "Custom Renewal",
        hoursIncluded: selectedPlan?.hours_included || 0,
        startDate: formData.start_date,
        durationMonths: formData.duration_months,
        amount: formData.amount,
        discount: formData.discount,
        timeSlots: formData.time_slots,
      })

      router.push(`/library-subscriptions/${membershipId}`)
    } catch (error) {
      logger.error("Error renewing subscription", { error: String(error) })
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

  const isExpired = member.status === "expired"
  const expiryDate = member.expiry_date ? new Date(member.expiry_date) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const computedEndDate = formData.start_date
    ? computeEndDate(formData.start_date, formData.duration_months)
    : ""

  const finalAmount = formData.amount - formData.discount

  const validTimeSlots = formData.time_slots.filter((s: TimeSlot) => s.start && s.end)
  const totalSlotHours = validTimeSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
  const hoursExceeded = selectedPlan?.hours_included ? totalSlotHours > selectedPlan.hours_included : false

  const priceCalcDisplay = selectedPlan && formData.duration_months
    ? `₹${formatNumber(selectedPlan.base_price)}/month × ${formData.duration_months} month${formData.duration_months !== 1 ? "s" : ""} = ₹${formatNumber(selectedPlan.base_price * formData.duration_months)}`
    : null

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
  }))

  // Step completion rules
  const step1Complete = !!formData.plan_id
  const step2Complete = !!(formData.start_date && formData.duration_months > 0)

  // Expiry badge for header
  const expiryBadge = member.expiry_date ? (
    isExpired ? (
      <StatusBadge status="error" label="Expired" />
    ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? (
      <StatusBadge status="warning" label={`Expires in ${daysUntilExpiry}d`} />
    ) : (
      <StatusBadge status="success" label={`${daysUntilExpiry}d left`} />
    )
  ) : null

  return (
    <PermissionGuard permission="library_members.edit">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <WorkflowHeader
          title="Renew Subscription"
          subtitle={`${displayName}${member.member_code ? ` • ${member.member_code}` : ""}`}
          icon={RefreshCw}
          onBack={() => router.push(backHref)}
          backLabel="Back to Member"
          badge={expiryBadge}
        />

        {/* Stepper */}
        <WorkflowStepper steps={STEPS} currentStep={currentStep} />

        {/* Early Renewal Notice — shown below stepper when applicable */}
        {!isExpired && member.expiry_date && daysUntilExpiry !== null && daysUntilExpiry > 0 && (
          <div className="flex items-center gap-3 p-3 bg-info/10 border border-info/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-info flex-shrink-0" />
            <p className="text-sm text-info">
              Early renewal: the new subscription will start on {formData.start_date} (day after current expiry). Hours will be added to the existing balance.
            </p>
          </div>
        )}

        {/* Step 1 — Choose Plan */}
        <WorkflowStepCard
          stepNum={1}
          title="Choose Plan"
          description="Select the subscription plan to renew with"
          icon={BookOpen}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(1)}
          completedSummary={selectedPlan ? `${selectedPlan.name} • ${selectedPlan.hours_included ?? 0}h/day` : undefined}
        >
          <div className="space-y-4">
            {/* Renewing from — current plan context */}
            {currentMembership && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border">
                <div className="p-1.5 bg-muted rounded-md">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Renewing from: </span>
                  <span className="font-medium">{currentMembership.plan_name}</span>
                  {member.expiry_date && (
                    <span className="text-muted-foreground"> • expires {formatDate(member.expiry_date)}</span>
                  )}
                </div>
              </div>
            )}

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

            {/* Plan card — shown when plan selected */}
            {selectedPlan && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selectedPlan.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedPlan.hours_included ? `${selectedPlan.hours_included}h/day` : "Unlimited"} access
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        <Currency amount={selectedPlan.base_price} />
                      </p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              disabled={!step1Complete}
              onClick={() => setCurrentStep(2)}
            >
              Save & Continue
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 2 — Schedule */}
        <WorkflowStepCard
          stepNum={2}
          title="Schedule"
          description="Set start date, duration, and access time slots"
          icon={Calendar}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(2)}
          completedSummary={
            formData.start_date && computedEndDate
              ? `${formatDate(formData.start_date)} – ${formatDate(computedEndDate)} • ${formData.duration_months} month${formData.duration_months !== 1 ? "s" : ""}`
              : undefined
          }
        >
          <div className="space-y-4">
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

            {/* Computed end date callout */}
            {computedEndDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>New expiry: <span className="font-medium text-foreground">{formatDate(computedEndDate)}</span></span>
              </div>
            )}

            {/* Access Schedule */}
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Access Schedule{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
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
                    Total: {totalSlotHours.toFixed(1)}h / {selectedPlan.hours_included}h daily {hoursExceeded ? "✗" : "✓"}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      time_slots: [...prev.time_slots, { start: "", end: "" }],
                    }))
                  }
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

            <Button
              className="w-full"
              disabled={!step2Complete || hoursExceeded}
              onClick={() => setCurrentStep(3)}
            >
              Save & Continue
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 3 — Confirm & Renew */}
        <WorkflowStepCard
          stepNum={3}
          title="Confirm & Renew"
          description="Review the renewal summary before confirming"
          icon={CheckCircle}
          currentStep={currentStep}
        >
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewing</span>
                <span className="font-medium">{displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current expiry</span>
                <span className="font-medium">
                  {member.expiry_date ? formatDate(member.expiry_date) : "—"}
                  {computedEndDate && (
                    <span className="text-muted-foreground"> → </span>
                  )}
                  {computedEndDate && (
                    <span className="text-success">{formatDate(computedEndDate)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">
                  {selectedPlan?.name || "—"}
                  {selectedPlan?.hours_included && (
                    <span className="text-muted-foreground"> | {selectedPlan.hours_included}h/day</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {formData.start_date ? formatDate(formData.start_date) : "—"}
                  {computedEndDate && ` – ${formatDate(computedEndDate)}`}
                  <span className="text-muted-foreground">
                    {" "}&bull; {formData.duration_months} month{formData.duration_months !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
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
                  ) : (
                    "Full Day"
                  )}
                </span>
              </div>
              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {selectedPlan && formData.duration_months !== 1 ? (
                      <>
                        <Currency amount={selectedPlan.base_price} /> &times; {formData.duration_months} ={" "}
                        <Currency amount={selectedPlan.base_price * formData.duration_months} />
                      </>
                    ) : (
                      <Currency amount={formData.amount} />
                    )}
                    {priceCalcDisplay && (
                      <span className="block text-xs text-muted-foreground font-normal">{priceCalcDisplay}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium"><Currency amount={formData.discount} /></span>
                </div>
              </div>

              {/* Amount & Discount editable inline */}
              <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Amount" htmlFor="amount_confirm">
                  <Input
                    id="amount_confirm"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField label="Discount" htmlFor="discount_confirm">
                  <Input
                    id="discount_confirm"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))
                    }
                    disabled={loading}
                  />
                </FormField>
              </div>

              <div className="flex justify-between text-base font-semibold border-t pt-3">
                <span>Total</span>
                <span className="text-success"><Currency amount={finalAmount} /></span>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={loading || !step1Complete || !step2Complete}
              onClick={doSubmit}
            >
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
        </WorkflowStepCard>
      </div>
    </PermissionGuard>
  )
}
