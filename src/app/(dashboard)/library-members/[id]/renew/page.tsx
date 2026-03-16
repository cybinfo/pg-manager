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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Loader2, Clock, RefreshCw, Calendar, AlertTriangle } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { PageLoading } from "@/components/ui/loading"
import { withCreatedBy } from "@/lib/audit"
import { Currency } from "@/components/ui/currency"
import { formatDate } from "@/lib/format"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"

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
}

/** Time slot presets for quick selection */
const TIME_PRESETS = [
  { label: "Morning (6 AM - 2 PM)", startTime: "06:00", endTime: "14:00", slot: "Morning" },
  { label: "Evening (2 PM - 10 PM)", startTime: "14:00", endTime: "22:00", slot: "Evening" },
  { label: "Night (10 PM - 6 AM)", startTime: "22:00", endTime: "06:00", slot: "Night" },
  { label: "Full Day (24 Hours)", startTime: "00:00", endTime: "23:59", slot: "24 Hours" },
] as const

/**
 * Derive the time_slot name from start/end times for backward compatibility.
 * Returns the matching preset name or "Custom".
 */
function deriveTimeSlot(startTime: string, endTime: string): string {
  const match = TIME_PRESETS.find((p) => p.startTime === startTime && p.endTime === endTime)
  return match ? match.slot : "Custom"
}

/**
 * Compute the smart default start date for renewal.
 * - If member is expired or has no expiry date: use today
 * - If member is active (early renewal): use expiry_date + 1 day
 */
function computeDefaultStartDate(expiryDate: string | null, status: string): string {
  const today = getTodayISO()

  if (!expiryDate || status === "expired" || status === "cancelled" || status === "suspended") {
    return today
  }

  // For active members (early renewal), start the day after current expiry
  const expiry = new Date(expiryDate)
  const todayDate = new Date(today)

  if (expiry < todayDate) {
    // Expiry is in the past - use today
    return today
  }

  // Expiry is in the future - start day after expiry
  const nextDay = new Date(expiry)
  nextDay.setDate(nextDay.getDate() + 1)
  return nextDay.toISOString().split("T")[0]
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

export default function RenewLibraryMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentMembership, setCurrentMembership] = useState<CurrentMembership | null>(null)

  const [formData, setFormData] = useState({
    plan_id: "",
    start_date: getTodayISO(),
    end_date: "",
    start_time: "06:00",
    end_time: "14:00",
    add_to_existing: true,
  })

  // Track whether user has manually overridden end_date
  const [endDateManuallySet, setEndDateManuallySet] = useState(false)

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

      // Determine initial time slot from preferred_slot
      const preferredSlot = memberData.preferred_slot || "Morning"
      const matchingPreset = TIME_PRESETS.find((p) => p.slot === preferredSlot)

      setFormData((prev) => ({
        ...prev,
        start_date: smartStartDate,
        start_time: matchingPreset?.startTime || "06:00",
        end_time: matchingPreset?.endTime || "14:00",
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
        const smartStartDate = formData.start_date
        const newEndDate = computeEndDate(smartStartDate, matchingPlan.validity_days)

        // Set time from current membership slot
        const slotPreset = TIME_PRESETS.find((p) => p.slot === currentMembership.time_slot)

        setFormData((prev) => ({
          ...prev,
          plan_id: matchingPlan.id,
          end_date: newEndDate,
          start_time: slotPreset?.startTime || prev.start_time,
          end_time: slotPreset?.endTime || prev.end_time,
        }))
      }
    }
  }, [currentMembership, plans, formData.plan_id, formData.start_date])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value
    setFormData((prev) => {
      // If end_date was not manually overridden, auto-update it keeping same duration
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

  const handleTimePreset = (preset: typeof TIME_PRESETS[number]) => {
    setFormData((prev) => ({
      ...prev,
      start_time: preset.startTime,
      end_time: preset.endTime,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.plan_id) {
      showError("Please select a plan")
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

      const amount = selectedPlan?.base_price || 0
      const timeSlot = deriveTimeSlot(formData.start_time, formData.end_time)

      // Create new membership record
      const membershipData = withCreatedBy({
        owner_id: member.owner_id,
        workspace_id: member.workspace_id,
        member_id: member.id,
        plan_id: formData.plan_id || null,
        plan_name: selectedPlan?.name || "Custom Renewal",
        hours_included: hoursToAdd || null,
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        time_slot: timeSlot,
        start_date: formData.start_date,
        end_date: formData.end_date,
        hours_remaining: hoursToAdd || null,
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

      // Update member with new hours and subscription
      const newHoursBalance = formData.add_to_existing
        ? member.hours_balance + hoursToAdd
        : hoursToAdd

      const { error: memberUpdateError } = await supabase
        .from("library_members")
        .update({
          hours_balance: newHoursBalance,
          current_subscription_id: membership.id,
          expiry_date: formData.end_date,
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
  const newHoursBalance = formData.add_to_existing
    ? member.hours_balance + (selectedPlan?.hours_included || 0)
    : selectedPlan?.hours_included || 0

  // Compute expiry info
  const isExpired = member.status === "expired"
  const expiryDate = member.expiry_date ? new Date(member.expiry_date) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Duration in days between start and end date
  const durationDays = formData.start_date && formData.end_date
    ? computeDurationDays(formData.start_date, formData.end_date)
    : null

  // Derive current time slot label
  const currentTimeSlot = deriveTimeSlot(formData.start_time, formData.end_time)
  const timeLabel = currentTimeSlot !== "Custom"
    ? currentTimeSlot
    : `${formData.start_time} - ${formData.end_time}`

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
  }))

  return (
    <PermissionGuard permission="library_members.edit">
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  {durationDays !== null && (
                    <p className="text-xs text-muted-foreground">
                      Duration: {durationDays} days
                    </p>
                  )}
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-3">
                <Label>Daily Time</Label>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.map((preset) => {
                    const isActive = formData.start_time === preset.startTime && formData.end_time === preset.endTime
                    return (
                      <Button
                        key={preset.slot}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTimePreset(preset)}
                        disabled={loading}
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      name="end_time"
                      type="time"
                      value={formData.end_time}
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
                    <span className="font-medium">{selectedPlan?.name || "\u2014"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period</span>
                    <span className="font-medium">
                      {formData.start_date ? formatDate(formData.start_date) : "\u2014"}
                      {formData.end_date ? ` \u2013 ${formatDate(formData.end_date)}` : ""}
                    </span>
                  </div>
                  {durationDays !== null && (
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="font-medium">{durationDays} days</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Daily Hours</span>
                    <span className="font-medium">{selectedPlan?.hours_included || 0}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time</span>
                    <span className="font-medium">{timeLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-medium"><Currency amount={selectedPlan?.base_price || 0} /></span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span>Hours to Add</span>
                    <span className="font-medium">{selectedPlan?.hours_included || 0}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Balance</span>
                    <span>{member.hours_balance.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>New Balance</span>
                    <span className="text-success">{newHoursBalance.toFixed(1)}h</span>
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
    </PermissionGuard>
  )
}
