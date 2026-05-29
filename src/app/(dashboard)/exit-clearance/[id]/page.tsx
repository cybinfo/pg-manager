"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, EXIT_CLEARANCE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Key,
  ClipboardCheck,
  Plus,
  Trash2,
  Wallet,
  IndianRupee,
  ChevronRight,
  Calendar,
  DoorOpen,
  Phone,
  FileWarning,
  Check,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency, formatDate } from "@/lib/format"
import { StatusBadge } from "@/components/ui/status-badge"
import { TenantLink, PropertyLink, RoomLink } from "@/components/ui/entity-link"
import {
  ExitClearance,
  Deduction,
  EXIT_CLEARANCE_STATUS_CONFIG,
  calculateFinalAmount,
  isRefundDue,
  getDaysStayed,
} from "@/types/exit-clearance.types"
import { getTodayISO } from "@/lib/date-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { PermissionGate } from "@/components/auth"
import { Textarea } from "@/components/ui/textarea"
import { applyExitClearanceCompletion } from "@/lib/workflows/exit.workflow"
import Link from "next/link"
import { Select } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Exit Details", icon: Calendar },
  { id: 2, label: "Room Handover", icon: ClipboardCheck },
  { id: 3, label: "Settlement", icon: IndianRupee },
  { id: 4, label: "Complete", icon: CheckCircle },
] as const

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveCurrentStep(clearance: ExitClearance, formData: FormData): number {
  if (clearance.settlement_status === "cleared") return 4
  if (clearance.settlement_status === "pending_payment") return 4
  if (formData.room_inspection_done && formData.key_returned) return 3
  if (formData.actual_exit_date) return 2
  return 1
}

interface FormData {
  actual_exit_date: string
  room_inspection_done: boolean
  key_returned: boolean
  room_condition_notes: string
  settlement_mode: string
  settlement_reference: string
}

interface OutstandingBill {
  id: string
  bill_number: string | null
  for_month: string | null
  total_amount: number
  balance_due: number
  due_date: string | null
  status: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep, completedUpTo }: { currentStep: number; completedUpTo: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = step.id < currentStep || completedUpTo >= step.id
        const active = step.id === currentStep
        const locked = step.id > currentStep && !done
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  done
                    ? "bg-success border-success text-white"
                    : active
                    ? "bg-primary border-primary text-white"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                  active ? "text-primary" : done ? "text-success" : locked ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  step.id < currentStep ? "bg-success" : "bg-border"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step card wrapper ────────────────────────────────────────────────────────

function StepCard({
  stepNum,
  title,
  description,
  icon: Icon,
  currentStep,
  isComplete,
  isLocked,
  onEdit,
  children,
  completedSummary,
}: {
  stepNum: number
  title: string
  description: string
  icon: React.ElementType
  currentStep: number
  isComplete: boolean
  isLocked: boolean
  onEdit?: () => void
  children: React.ReactNode
  completedSummary?: React.ReactNode
}) {
  const isActive = stepNum === currentStep

  if (isComplete && !isActive) {
    return (
      <div className="border border-success/30 bg-success/5 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              {completedSummary && <div className="text-xs text-muted-foreground mt-0.5">{completedSummary}</div>}
            </div>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs">
              Edit
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="border border-dashed rounded-xl p-5 opacity-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-primary/30 bg-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b bg-primary/5">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExitClearanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/exit-clearance", defaultLabel: "All Exit Clearances" })
  const [saving, setSaving] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState<FormData>({
    actual_exit_date: "",
    room_inspection_done: false,
    key_returned: false,
    room_condition_notes: "",
    settlement_mode: "",
    settlement_reference: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })
  const [outstandingBills, setOutstandingBills] = useState<OutstandingBill[]>([])
  const [billsLoading, setBillsLoading] = useState(false)

  const {
    data: clearance,
    loading,
    updateFields,
  } = useDetailPage<ExitClearance>({
    config: EXIT_CLEARANCE_DETAIL_CONFIG,
    id: params.id as string,
  })

  useEffect(() => {
    if (clearance && !formInitialized) {
      const fd: FormData = {
        actual_exit_date: clearance.actual_exit_date || "",
        room_inspection_done: clearance.room_inspection_done || false,
        key_returned: clearance.key_returned || false,
        room_condition_notes: clearance.room_condition_notes || "",
        settlement_mode: (clearance as ExitClearance & { settlement_mode?: string }).settlement_mode || "",
        settlement_reference: (clearance as ExitClearance & { settlement_reference?: string }).settlement_reference || "",
      }
      setFormData(fd)
      setDeductions(clearance.deductions || [])
      setCurrentStep(deriveCurrentStep(clearance, fd))
      setFormInitialized(true)
    }
  }, [clearance, formInitialized])

  useEffect(() => {
    if (!clearance?.tenant_id) return
    setBillsLoading(true)
    const supabase = createClient()
    supabase
      .from("bills")
      .select("id, bill_number, for_month, total_amount, balance_due, due_date, status")
      .eq("tenant_id", clearance.tenant_id)
      .neq("status", "paid")
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .then(({ data }: { data: OutstandingBill[] | null }) => {
        if (data) setOutstandingBills(data)
        setBillsLoading(false)
      })
  }, [clearance?.tenant_id])

  const computeFinalAmount = useCallback(() => {
    if (!clearance) return 0
    return calculateFinalAmount(clearance.total_dues, clearance.total_refundable, deductions)
  }, [clearance, deductions])

  const saveProgress = useCallback(async () => {
    if (!clearance) return false
    return await updateFields({
      actual_exit_date: formData.actual_exit_date || null,
      room_inspection_done: formData.room_inspection_done,
      key_returned: formData.key_returned,
      room_condition_notes: formData.room_condition_notes || null,
      deductions,
      final_amount: computeFinalAmount(),
    })
  }, [clearance, formData, deductions, computeFinalAmount, updateFields])

  const advanceTo = async (nextStep: number) => {
    setSaving(true)
    const ok = await saveProgress()
    setSaving(false)
    if (ok) setCurrentStep(nextStep)
  }

  const handleMarkPending = async () => {
    setSaving(true)
    await saveProgress()
    await updateFields({ settlement_status: "pending_payment" })
    setSaving(false)
    setCurrentStep(4)
  }

  const handleComplete = async () => {
    if (!clearance) return
    if (!formData.room_inspection_done) { showError("Please complete room inspection first"); return }
    if (!formData.key_returned) { showError("Please confirm key has been returned"); return }
    if (!formData.settlement_mode) { showError("Please select a settlement mode"); return }
    if (!clearance.tenant) { showError("Tenant data not found"); return }

    setSaving(true)
    try {
      const supabase = createClient()
      const exitDate = formData.actual_exit_date || getTodayISO()

      await updateFields({
        settlement_mode: formData.settlement_mode,
        settlement_reference: formData.settlement_reference || null,
      })

      const result = await applyExitClearanceCompletion(
        supabase,
        clearance.id,
        clearance.tenant.id,
        clearance.room?.id ?? null,
        exitDate,
      )

      if (!result.success) {
        showError(result.error || "Failed to complete exit")
        return
      }

      showSuccess("Exit clearance completed! Room is now available.")
      router.push("/exit-clearance")
    } catch (error: unknown) {
      handleClientError(error, "Completing clearance")
    } finally {
      setSaving(false)
    }
  }

  const addDeduction = () => {
    if (!newDeduction.reason || !newDeduction.amount) { showError("Please enter reason and amount"); return }
    setDeductions([...deductions, { reason: newDeduction.reason, amount: parseFloat(newDeduction.amount) }])
    setNewDeduction({ reason: "", amount: "" })
  }

  if (loading) return <PageLoading message="Loading exit clearance..." />
  if (!clearance) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h2 className="text-lg font-semibold">Not Found</h2>
      <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
    </div>
  )

  const finalAmount = computeFinalAmount()
  const isRefund = isRefundDue(finalAmount)
  const isCleared = clearance.settlement_status === "cleared"
  const isPendingPayment = clearance.settlement_status === "pending_payment"
  const statusConfig = EXIT_CLEARANCE_STATUS_CONFIG[clearance.settlement_status] || EXIT_CLEARANCE_STATUS_CONFIG.initiated

  const step1Complete = !!formData.actual_exit_date
  const step2Complete = formData.room_inspection_done && formData.key_returned
  const step3Complete = step2Complete
  const completedUpTo = isCleared ? 4 : isPendingPayment ? 3 : step2Complete ? 3 : step1Complete ? 2 : 1

  const daysStayed = clearance.tenant?.check_in_date
    ? getDaysStayed(clearance.tenant.check_in_date, formData.actual_exit_date || clearance.expected_exit_date)
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push(backHref)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            ← {backLabel}
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning/10 rounded-lg">
              <DoorOpen className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{clearance.tenant?.name || "Exit Clearance"}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge variant={statusConfig.variant} label={statusConfig.label} />
                {clearance.property && <span className="text-sm text-muted-foreground">{clearance.property.name}</span>}
                {clearance.room && <span className="text-sm text-muted-foreground">· Room {clearance.room.room_number}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Settlement amount pill */}
        <div className={`px-4 py-3 rounded-xl text-center border-2 ${isRefund ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
          <p className="text-xs text-muted-foreground mb-0.5">{isRefund ? "Refund Due" : "Amount Due"}</p>
          <p className={`text-xl font-bold ${isRefund ? "text-success" : "text-destructive"}`}>
            <Currency amount={Math.abs(finalAmount)} />
          </p>
        </div>
      </div>

      {/* Tenant quick info */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border rounded-xl p-4 bg-muted/30">
        {clearance.tenant && (
          <span className="flex items-center gap-1.5">
            <TenantLink id={clearance.tenant.id} name={clearance.tenant.name} />
          </span>
        )}
        {clearance.tenant?.phone && (
          <a href={`tel:${clearance.tenant.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
            <Phone className="h-3.5 w-3.5" /> {clearance.tenant.phone}
          </a>
        )}
        {daysStayed > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {daysStayed} days stayed
          </span>
        )}
        {clearance.notice_given_date && (
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Notice: {formatDate(clearance.notice_given_date)}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} completedUpTo={completedUpTo} />

      {/* ── Step 1: Exit Details ── */}
      <StepCard
        stepNum={1}
        title="Exit Details"
        description="Confirm when the tenant is leaving"
        icon={Calendar}
        currentStep={currentStep}
        isComplete={step1Complete && currentStep !== 1}
        isLocked={false}
        onEdit={() => setCurrentStep(1)}
        completedSummary={
          <span>
            Exit date: {formatDate(formData.actual_exit_date)} · Expected: {formatDate(clearance.expected_exit_date)}
          </span>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Notice Given</p>
              <p className="font-medium">{clearance.notice_given_date ? formatDate(clearance.notice_given_date) : "—"}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Expected Exit</p>
              <p className="font-medium">{formatDate(clearance.expected_exit_date)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Actual Exit Date <span className="text-destructive">*</span></Label>
            <DatePicker
              value={formData.actual_exit_date}
              onChange={(val) => setFormData({ ...formData, actual_exit_date: val })}
              disabled={isCleared}
            />
            <p className="text-xs text-muted-foreground">The actual date the tenant vacated the room</p>
          </div>

          {!isCleared && (
            <Button
              className="w-full"
              onClick={() => advanceTo(2)}
              disabled={!formData.actual_exit_date || saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Continue to Room Handover
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </StepCard>

      {/* ── Step 2: Room Handover ── */}
      <StepCard
        stepNum={2}
        title="Room Handover"
        description="Confirm inspection and key return"
        icon={ClipboardCheck}
        currentStep={currentStep}
        isComplete={step2Complete && currentStep !== 2}
        isLocked={currentStep < 2 && !step1Complete}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          <span>Room inspected · Key returned{formData.room_condition_notes ? " · Notes added" : ""}</span>
        }
      >
        <div className="space-y-4">
          {/* Room inspection */}
          <button
            type="button"
            onClick={() => !isCleared && setFormData({ ...formData, room_inspection_done: !formData.room_inspection_done })}
            className={`w-full flex items-center justify-between p-4 border-2 rounded-xl transition-colors ${
              formData.room_inspection_done ? "border-success bg-success/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className={`h-5 w-5 ${formData.room_inspection_done ? "text-success" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="font-medium text-sm">Room Inspection</p>
                <p className="text-xs text-muted-foreground">Check room condition and inventory</p>
              </div>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              formData.room_inspection_done ? "bg-success border-success" : "border-border"
            }`}>
              {formData.room_inspection_done && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
          </button>

          {/* Key returned */}
          <button
            type="button"
            onClick={() => !isCleared && setFormData({ ...formData, key_returned: !formData.key_returned })}
            className={`w-full flex items-center justify-between p-4 border-2 rounded-xl transition-colors ${
              formData.key_returned ? "border-success bg-success/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Key className={`h-5 w-5 ${formData.key_returned ? "text-success" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="font-medium text-sm">Keys Returned</p>
                <p className="text-xs text-muted-foreground">Collect all room keys from tenant</p>
              </div>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              formData.key_returned ? "bg-success border-success" : "border-border"
            }`}>
              {formData.key_returned && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
          </button>

          {/* Condition notes */}
          <div className="space-y-1.5">
            <Label>Room Condition Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={formData.room_condition_notes}
              onChange={(e) => setFormData({ ...formData, room_condition_notes: e.target.value })}
              placeholder="Describe any damages, issues, or missing items..."
              rows={3}
              disabled={isCleared}
              className="resize-none"
            />
          </div>

          {!isCleared && (
            <Button
              className="w-full"
              onClick={() => advanceTo(3)}
              disabled={!formData.room_inspection_done || !formData.key_returned || saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {!formData.room_inspection_done || !formData.key_returned
                ? "Complete both items above to continue"
                : <>Save & Continue to Settlement <ChevronRight className="ml-2 h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </StepCard>

      {/* ── Step 3: Settlement ── */}
      <StepCard
        stepNum={3}
        title="Settlement"
        description="Review dues, add deductions, confirm refund"
        icon={IndianRupee}
        currentStep={currentStep}
        isComplete={step3Complete && currentStep > 3}
        isLocked={currentStep < 3 && !step2Complete}
        onEdit={() => setCurrentStep(3)}
        completedSummary={
          <span>
            {isRefund ? `Refund: ${formatCurrency(Math.abs(finalAmount))}` : `Due: ${formatCurrency(Math.abs(finalAmount))}`}
            {deductions.length > 0 ? ` · ${deductions.length} deduction(s)` : ""}
          </span>
        }
      >
        <div className="space-y-5">
          {/* Outstanding bills */}
          {billsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-3">Checking bills...</p>
          ) : outstandingBills.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <FileWarning className="h-4 w-4" />
                <p className="text-sm font-semibold">Outstanding Bills</p>
              </div>
              {outstandingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 border border-destructive/20 bg-destructive/5 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{bill.bill_number || bill.for_month || "—"}</p>
                    {bill.due_date && <p className="text-xs text-muted-foreground">Due {formatDate(bill.due_date)}</p>}
                  </div>
                  <span className="font-semibold text-destructive">{formatCurrency(bill.balance_due)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              No outstanding bills
            </div>
          )}

          {/* Deductions */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Deductions</p>
            {deductions.length > 0 ? (
              <div className="space-y-2">
                {deductions.map((d, i) => (
                  <div key={`${i}-${d.reason}`} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                    <span className="text-sm">{d.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-destructive text-sm">{formatCurrency(d.amount)}</span>
                      {!isCleared && (
                        <button onClick={() => setDeductions(deductions.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No deductions added</p>
            )}

            {!isCleared && (
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Reason (e.g. damage)"
                  value={newDeduction.reason}
                  onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })}
                  className="flex-1 text-sm"
                />
                <Input
                  type="number"
                  placeholder="₹ Amount"
                  value={newDeduction.amount}
                  onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                  className="w-28 text-sm"
                />
                <Button variant="outline" size="icon" onClick={addDeduction}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Settlement summary */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settlement Summary
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Dues</span>
                <span className="font-medium">{formatCurrency(clearance.total_dues)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Security Deposit</span>
                <span className="font-medium">− {formatCurrency(clearance.total_refundable)}</span>
              </div>
              {deductions.length > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Deductions</span>
                  <span className="font-medium">+ {formatCurrency(deductions.reduce((s, d) => s + d.amount, 0))}</span>
                </div>
              )}
              <div className={`flex justify-between pt-3 border-t text-base font-bold ${isRefund ? "text-success" : "text-destructive"}`}>
                <span>{isRefund ? "Refund to Tenant" : "Amount Due from Tenant"}</span>
                <span>{formatCurrency(Math.abs(finalAmount))}</span>
              </div>
            </div>
          </div>

          {!isCleared && (
            <Button className="w-full" onClick={handleMarkPending} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Confirm Settlement & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </StepCard>

      {/* ── Step 4: Complete ── */}
      <StepCard
        stepNum={4}
        title="Complete Clearance"
        description={isCleared ? "Clearance completed" : "Record payment and close out"}
        icon={CheckCircle}
        currentStep={currentStep}
        isComplete={isCleared}
        isLocked={currentStep < 4 && !isPendingPayment && !isCleared}
        completedSummary={<span>Cleared on {clearance.completed_at ? formatDate(clearance.completed_at) : "—"}</span>}
      >
        {isCleared ? (
          <div className="text-center py-4">
            <CheckCircle className="h-14 w-14 text-success mx-auto mb-3" />
            <p className="font-semibold text-success text-lg">Clearance Completed</p>
            <p className="text-sm text-muted-foreground mt-1">Room is now available for new tenants</p>
            {isRefund && clearance.tenant && (
              <Link href={`/refunds/new?tenant=${clearance.tenant.id}&clearance=${clearance.id}`}>
                <Button className="mt-4" variant="outline">
                  <Wallet className="mr-2 h-4 w-4" />
                  Record Refund of {formatCurrency(Math.abs(finalAmount))}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 text-center mb-2 ${isRefund ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
              <p className="text-xs text-muted-foreground mb-1">{isRefund ? "Refund to Tenant" : "Collect from Tenant"}</p>
              <p className={`text-2xl font-bold ${isRefund ? "text-success" : "text-destructive"}`}>
                {formatCurrency(Math.abs(finalAmount))}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Settlement Mode <span className="text-destructive">*</span></Label>
              <Select
                value={formData.settlement_mode}
                onChange={(e) => setFormData({ ...formData, settlement_mode: e.target.value })}
                options={PAYMENT_MODES}
                placeholder="Select how payment was made"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Reference / Transaction ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={formData.settlement_reference}
                onChange={(e) => setFormData({ ...formData, settlement_reference: e.target.value })}
                placeholder="UPI ref, cheque no., etc."
              />
            </div>

            <PermissionGate permission="exit_clearance.edit" hide>
              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={saving || !formData.settlement_mode}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Complete Clearance
              </Button>
              {!formData.settlement_mode && (
                <p className="text-xs text-muted-foreground text-center">Select a settlement mode to continue</p>
              )}
            </PermissionGate>
          </div>
        )}
      </StepCard>
    </div>
  )
}
