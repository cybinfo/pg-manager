"use client"

import { useRouter } from "next/navigation"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { Combobox } from "@/components/ui/combobox"
import { Avatar } from "@/components/ui/avatar"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"
import { Loader2, Plus, BookOpen, Calendar, CheckCircle, Users, Trash2 } from "lucide-react"
import { Currency } from "@/components/ui/currency"
import { formatDate, formatCurrency } from "@/lib/format"
import { TimeSlot, formatTime12h, calcSlotHours } from "@/lib/time-slots"
import { DatePicker } from "@/components/ui/date-picker"
import { useLibrarySubscriptionCreateForm } from "@/lib/hooks/forms/useLibrarySubscriptionCreateForm"

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  owner_id: string
  workspace_id: string
  expiry_date: string | null
  status: string
  library?: { id: string; name: string } | null
  person?: { id: string; name?: string; photo_url?: string | null } | null
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Member", icon: Users },
  { id: 2, label: "Choose Plan", icon: BookOpen },
  { id: 3, label: "Schedule", icon: Calendar },
  { id: 4, label: "Confirm", icon: CheckCircle },
]

export default function NewLibrarySubscriptionPage() {
  const router = useRouter()
  const {
    loadingMembers,
    loadingPlans,
    submitting,
    currentStep,
    setCurrentStep,
    selectedMember,
    formData,
    setFormData,
    errors,
    validateField,
    handleMemberChange,
    handlePlanChange,
    handleDurationChange,
    doSubmit,
    selectedPlan,
    computedEndDate,
    finalAmount,
    validTimeSlots,
    totalSlotHours,
    hoursExceeded,
    displayName,
    memberOptions,
    planOptions,
    step1Complete,
    step2Complete,
    step3Complete,
  } = useLibrarySubscriptionCreateForm()

  return (
    <PermissionGuard permission="entity_members.edit">
      <div className="max-w-2xl mx-auto space-y-6">
        <WorkflowHeader
          title="Add Subscription"
          subtitle="Create a new subscription for an existing library member"
          icon={Plus}
          onBack={() => router.push("/entity-subscriptions")}
          backLabel="Back to Subscriptions"
        />

        <WorkflowStepper steps={STEPS} currentStep={currentStep} />

        {/* Step 1 — Select Member */}
        <WorkflowStepCard
          stepNum={1}
          title="Select Member"
          description="Choose the member to subscribe"
          icon={Users}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(1)}
          completedSummary={selectedMember ? `${displayName}${selectedMember.member_code ? ` • ${selectedMember.member_code}` : ""}` : undefined}
        >
          <div className="space-y-4">
            <FormField
              label="Member"
              required
              error={errors.member_id as string | undefined}
            >
              <Combobox
                options={memberOptions}
                value={formData.member_id}
                onValueChange={(val) => {
                  handleMemberChange(val)
                  validateField("member_id")
                }}
                placeholder={loadingMembers ? "Loading members..." : "Search member..."}
                searchPlaceholder="Search by name or code..."
                emptyText="No members found"
                disabled={loadingMembers || submitting}
              />
            </FormField>

            {selectedMember && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={displayName}
                      src={(selectedMember as MemberOption).person?.photo_url}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold">{displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMember.member_code && <span className="font-mono mr-2">{selectedMember.member_code}</span>}
                        {selectedMember.library?.name}
                      </p>
                      {selectedMember.expiry_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Current expiry: {formatDate(selectedMember.expiry_date)}
                        </p>
                      )}
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

        {/* Step 2 — Choose Plan */}
        <WorkflowStepCard
          stepNum={2}
          title="Choose Plan"
          description="Select the subscription plan"
          icon={BookOpen}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(2)}
          completedSummary={selectedPlan ? `${selectedPlan.name} • ${selectedPlan.hours_included ?? 0}h/day` : undefined}
        >
          <div className="space-y-4">
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
                placeholder={loadingPlans ? "Loading plans..." : "Select a plan..."}
                searchPlaceholder="Search plans..."
                emptyText="No plans found"
                disabled={loadingPlans || submitting}
              />
            </FormField>

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
              disabled={!step2Complete}
              onClick={() => setCurrentStep(3)}
            >
              Save & Continue
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 3 — Schedule */}
        <WorkflowStepCard
          stepNum={3}
          title="Schedule"
          description="Set start date, duration, and access time slots"
          icon={Calendar}
          currentStep={currentStep}
          onEdit={() => setCurrentStep(3)}
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
                <DatePicker
                  id="start_date"
                  value={formData.start_date}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, start_date: val }))
                    validateField("start_date")
                  }}
                  disabled={submitting}
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
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.duration_months}
                  onChange={handleDurationChange}
                  onBlur={() => validateField("duration_months")}
                  disabled={submitting}
                />
              </FormField>
            </div>

            {computedEndDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Expiry: <span className="font-medium text-foreground">{formatDate(computedEndDate)}</span></span>
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
                          setFormData(prev => ({ ...prev, time_slots: updated }))
                        }}
                        disabled={submitting}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">&mdash;</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => {
                          const updated = [...formData.time_slots]
                          updated[idx] = { ...updated[idx], end: e.target.value }
                          setFormData(prev => ({ ...prev, time_slots: updated }))
                        }}
                        disabled={submitting}
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
                          setFormData(prev => ({ ...prev, time_slots: updated }))
                        }}
                        disabled={submitting}
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
                    setFormData(prev => ({
                      ...prev,
                      time_slots: [...prev.time_slots, { start: "", end: "" }],
                    }))
                  }
                  disabled={submitting}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Slot
                </Button>
              </div>
              {formData.time_slots.length === 0 && (
                <p className="text-xs text-muted-foreground">Leave empty for full day access.</p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!step3Complete || hoursExceeded}
              onClick={() => setCurrentStep(4)}
            >
              Save & Continue
            </Button>
          </div>
        </WorkflowStepCard>

        {/* Step 4 — Confirm */}
        <WorkflowStepCard
          stepNum={4}
          title="Confirm"
          description="Review before creating the subscription"
          icon={CheckCircle}
          currentStep={currentStep}
        >
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member</span>
                <span className="font-medium">{displayName}</span>
              </div>
              {selectedMember?.member_code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono font-medium">{selectedMember.member_code}</span>
                </div>
              )}
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
                  ) : "Full Day"}
                </span>
              </div>

              <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Amount" htmlFor="amount_confirm">
                  <Input
                    id="amount_confirm"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    disabled={submitting}
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
                      setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))
                    }
                    disabled={submitting}
                  />
                </FormField>
              </div>

              {selectedPlan && formData.duration_months > 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Calculation</span>
                  <span>{formatCurrency(selectedPlan.base_price)}/mo × {formData.duration_months} = {formatCurrency(selectedPlan.base_price * formData.duration_months)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-semibold border-t pt-3">
                <span>Total</span>
                <span className="text-success"><Currency amount={finalAmount} /></span>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={submitting || !step1Complete || !step2Complete || !step3Complete}
              onClick={doSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Subscription"
              )}
            </Button>
          </div>
        </WorkflowStepCard>
      </div>
    </PermissionGuard>
  )
}
