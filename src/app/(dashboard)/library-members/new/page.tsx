"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { FormField } from "@/components/ui/form-components"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { Currency } from "@/components/ui/currency"
import { PageSkeleton } from "@/components/ui/loading"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowContinueButton,
} from "@/components/ui/workflow"
import type { WorkflowStepDef } from "@/components/ui/workflow"
import { Users, CreditCard, Clock, CheckCircle, UserCheck, Trash2, Plus, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getTodayISO, computeEndDate } from "@/lib/date-helpers"
import { TimeSlot, formatTime12h, calcSlotHours } from "@/lib/time-slots"
import { formatDate, formatCurrency } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useFeatures } from "@/lib/features/use-features"
import { DatePicker } from "@/components/ui/date-picker"
import { PersonSelector } from "@/components/people"
import { PersonSearchResult } from "@/types/people.types"
import { createLibraryMember } from "@/lib/workflows/library-member.workflow"
import type { LibraryOption, LibraryPlanOption } from "@/types/library.types"

export default function NewLibraryMemberPage() {
  return (
    <PermissionGuard permission="library_members.create">
      <Suspense>
        <NewLibraryMemberContent />
      </Suspense>
    </PermissionGuard>
  )
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Person", icon: Users },
  { id: 2, label: "Subscription", icon: CreditCard },
  { id: 3, label: "Schedule", icon: Clock },
  { id: 4, label: "Confirm", icon: CheckCircle },
]

function NewLibraryMemberContent() {
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

  // Read pre-filled values from URL (e.g., from waitlist conversion)
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

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WorkflowHeader
        title="Add Member"
        subtitle="Register a new library member with subscription"
        icon={Users}
        onBack={() => router.push(backHref)}
        backLabel="Back to Members"
        badge={
          waitlistId ? (
            <div className="flex items-center gap-2 text-xs text-success font-medium">
              <UserCheck className="h-3.5 w-3.5" />
              Converting from Waitlist
            </div>
          ) : undefined
        }
      />

      {waitlistId && (
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
          <UserCheck className="h-5 w-5 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success">Converting from Waitlist</p>
            <p className="text-xs text-success/80">
              Search for the person below or add them if not found. Complete the subscription to convert this waitlist entry.
            </p>
          </div>
        </div>
      )}

      <WorkflowStepper steps={STEPS} currentStep={currentStep} />

      {/* Step 1: Select Person */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Person"
        description="Choose an existing person or add a new one"
        icon={Users}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(1)}
        completedSummary={
          selectedPerson ? (
            <span>
              {selectedPerson.name}
              {selectedPerson.phone ? ` · ${selectedPerson.phone}` : ""}
              {formData.library_id
                ? ` · ${libraries.find((l) => l.id === formData.library_id)?.name ?? ""}`
                : ""}
            </span>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <FormField label="Library" required>
            <Combobox
              options={libraryOptions}
              value={formData.library_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
              placeholder="Select a library..."
              searchPlaceholder="Search libraries..."
              emptyText="No libraries found"
              disabled={saving || !!preselectedLibrary}
            />
          </FormField>

          <FormField label="Member" required error={personError}>
            {ownerId ? (
              <PersonSelector
                ownerId={ownerId}
                selectedPersonId={selectedPerson?.id}
                onSelect={(person) => {
                  setSelectedPerson(person)
                  setPersonError("")
                }}
                initialSearch={prefilledPhone || prefilledName}
                disabled={saving}
                required
                error={personError}
                showEditLink
              />
            ) : null}
          </FormField>

          <WorkflowContinueButton
            onClick={() => {
              if (!selectedPerson) {
                setPersonError("Please select a person")
                return
              }
              setPersonError("")
              setCurrentStep(2)
            }}
            disabled={!step1Complete}
            disabledReason="Select a library and a person to continue"
          />
        </div>
      </WorkflowStepCard>

      {/* Step 2: Subscription Plan */}
      <WorkflowStepCard
        stepNum={2}
        title="Subscription Plan"
        description="Plan, start date, duration, and amount"
        icon={CreditCard}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          selectedPlan ? (
            <span>
              {selectedPlan.name} · {formData.duration_months} month{formData.duration_months !== 1 ? "s" : ""}
              {computedEndDate ? ` · ends ${formatDate(computedEndDate)}` : ""}
            </span>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <FormField
            label="Subscription Plan"
            tooltip="The plan defines the daily hours allowance and base price. You can override the amount below."
          >
            <Combobox
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} - Rs.${plan.base_price} (${plan.hours_included ? `${plan.hours_included}h` : "Unlimited"})`,
              }))}
              value={formData.plan_id}
              onValueChange={handlePlanChange}
              placeholder="Select a plan..."
              searchPlaceholder="Search plans..."
              emptyText="No plans found"
              disabled={saving}
            />
          </FormField>

          {selectedPlan && (
            <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
              <p className="text-sm font-semibold text-primary mb-2">{selectedPlan.name}</p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {selectedPlan.hours_included ?? "Unlimited"}h
                  </span>
                  /day
                </span>
                <span>
                  Base price:{" "}
                  <span className="font-medium text-foreground">
                    <Currency amount={selectedPlan.base_price} />/month
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Date" htmlFor="start_date" required>
              <DatePicker
                id="start_date"
                value={formData.start_date}
                onChange={(val) => setFormData((prev) => ({ ...prev, start_date: val }))}
                disabled={saving}
              />
            </FormField>
            <FormField
              label="Duration (Months)"
              htmlFor="duration_months"
              required
              hint={computedEndDate ? `Ends: ${formatDate(computedEndDate)}` : undefined}
              tooltip="How many months this subscription is valid for. The end date is calculated automatically."
            >
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

          <WorkflowContinueButton
            onClick={() => { if (step2Complete) setCurrentStep(3) }}
            disabled={!step2Complete}
            disabledReason="Select a plan, start date, and duration to continue"
          />
        </div>
      </WorkflowStepCard>

      {/* Step 3: Schedule */}
      <WorkflowStepCard
        stepNum={3}
        title="Access Schedule"
        description="Define daily time windows (optional — leave empty for full day)"
        icon={Clock}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(3)}
        completedSummary={
          validTimeSlots.length > 0 ? (
            <span>
              {validTimeSlots.length} slot{validTimeSlots.length !== 1 ? "s" : ""} · {totalSlotHours.toFixed(1)}h/day
            </span>
          ) : (
            <span>Full day access</span>
          )
        }
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Label>Time Slots</Label>
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
                  Total: {totalSlotHours.toFixed(1)}h / {selectedPlan.hours_included}h daily{" "}
                  {hoursExceeded ? "✗" : "✓"}
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
                disabled={saving}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Slot
              </Button>
            </div>

            {formData.time_slots.length === 0 && (
              <p className="text-xs text-muted-foreground">Leave empty for full day access (no time restriction).</p>
            )}
          </div>

          <WorkflowContinueButton
            onClick={() => setCurrentStep(4)}
            label={formData.time_slots.length === 0 ? "Continue with Full Day Access" : "Save & Continue"}
            disabled={!step3Complete}
          />
        </div>
      </WorkflowStepCard>

      {/* Step 4: Confirm & Register */}
      <WorkflowStepCard
        stepNum={4}
        title="Confirm & Register"
        description="Review and submit"
        icon={CheckCircle}
        currentStep={currentStep}
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member</span>
              <span className="font-medium">{selectedPerson?.name}</span>
            </div>
            {selectedPerson?.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{selectedPerson.phone}</span>
              </div>
            )}
            {selectedPerson?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{selectedPerson.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Library</span>
              <span className="font-medium">
                {libraries.find((l) => l.id === formData.library_id)?.name ?? "—"}
              </span>
            </div>

            {selectedPlan && (
              <>
                <div className="border-t my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Hours</span>
                  <span className="font-medium">{selectedPlan.hours_included ?? "Unlimited"}h/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {formData.duration_months} month{formData.duration_months !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">
                    {formData.start_date ? formatDate(formData.start_date) : "—"}
                    {computedEndDate ? ` – ${formatDate(computedEndDate)}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access Schedule</span>
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
                <div className="border-t my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {formData.duration_months !== 1 ? (
                      <>
                        <Currency amount={selectedPlan.base_price} /> &times; {formData.duration_months} ={" "}
                        <Currency amount={selectedPlan.base_price * formData.duration_months} />
                      </>
                    ) : (
                      <Currency amount={formData.amount} />
                    )}
                  </span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium">
                      &minus; <Currency amount={formData.discount} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold border-t pt-2 mt-1">
                  <span>Total Due</span>
                  <span className="text-success">
                    <Currency amount={finalAmount} />
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Payment can be recorded after creation on the subscription detail page.
          </p>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving}
          >
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
      </WorkflowStepCard>
    </div>
  )
}
