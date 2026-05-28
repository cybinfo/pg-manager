"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, EXIT_CLEARANCE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Loader2,
  User,
  DoorOpen,
  Calendar,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  Key,
  ClipboardCheck,
  Save,
  Plus,
  Trash2,
  Wallet,
  Receipt,
  IndianRupee,
  Edit,
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
import { PermissionGate, FeatureGate, FeatureGuard } from "@/components/auth"
import { Textarea } from "@/components/ui/textarea"
import { applyExitClearanceCompletion } from "@/lib/workflows/exit.workflow"
import { FileWarning, Calculator } from "lucide-react"

export default function ExitClearanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/exit-clearance", defaultLabel: "All Exit Clearances" })
  const [saving, setSaving] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)

  const [formData, setFormData] = useState({
    actual_exit_date: "",
    room_inspection_done: false,
    key_returned: false,
    room_condition_notes: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })

  interface OutstandingBill {
    id: string
    bill_number: string | null
    for_month: string | null
    total_amount: number
    balance_due: number
    due_date: string | null
    status: string
  }

  const [outstandingBills, setOutstandingBills] = useState<OutstandingBill[]>([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [calculatedRefund, setCalculatedRefund] = useState<number | null>(null)

  const {
    data: clearance,
    loading,
    updateFields,
  } = useDetailPage<ExitClearance>({
    config: EXIT_CLEARANCE_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Initialize form when data loads
  useEffect(() => {
    if (clearance && !formInitialized) {
      setFormData({
        actual_exit_date: clearance.actual_exit_date || "",
        room_inspection_done: clearance.room_inspection_done || false,
        key_returned: clearance.key_returned || false,
        room_condition_notes: clearance.room_condition_notes || "",
      })
      setDeductions(clearance.deductions || [])
      setFormInitialized(true)
    }
  }, [clearance, formInitialized])

  useEffect(() => {
    const fetchOutstandingBills = async () => {
      if (!clearance?.tenant_id) return
      setBillsLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from("bills")
        .select("id, bill_number, for_month, total_amount, balance_due, due_date, status")
        .eq("tenant_id", clearance.tenant_id)
        .neq("status", "paid")
        .is("deleted_at", null)
        .order("due_date", { ascending: true })
      if (data) setOutstandingBills(data)
      setBillsLoading(false)
    }
    fetchOutstandingBills()
  }, [clearance?.tenant_id])

  const addDeduction = () => {
    if (!newDeduction.reason || !newDeduction.amount) {
      showError("Please enter reason and amount")
      return
    }

    setDeductions([
      ...deductions,
      {
        reason: newDeduction.reason,
        amount: parseFloat(newDeduction.amount),
      },
    ])
    setNewDeduction({ reason: "", amount: "" })
  }

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index))
  }

  const computeFinalAmount = () => {
    if (!clearance) return 0
    return calculateFinalAmount(clearance.total_dues, clearance.total_refundable, deductions)
  }

  const computeDaysStayed = () => {
    if (!clearance || !clearance.tenant) return 0
    return getDaysStayed(
      clearance.tenant.check_in_date,
      formData.actual_exit_date || clearance.expected_exit_date
    )
  }

  const handleSave = async () => {
    if (!clearance) return

    setSaving(true)
    const finalAmount = computeFinalAmount()

    const success = await updateFields({
      actual_exit_date: formData.actual_exit_date || null,
      room_inspection_done: formData.room_inspection_done,
      key_returned: formData.key_returned,
      room_condition_notes: formData.room_condition_notes || null,
      deductions,
      final_amount: finalAmount,
    })

    setSaving(false)
    return success
  }

  const handleMarkPending = async () => {
    if (!clearance) return

    setSaving(true)
    await updateFields({ settlement_status: "pending_payment" })
    setSaving(false)
  }

  const handleComplete = async () => {
    if (!clearance) return

    if (!formData.room_inspection_done) {
      showError("Please complete room inspection first")
      return
    }

    if (!formData.key_returned) {
      showError("Please confirm key has been returned")
      return
    }

    if (!clearance.tenant) {
      showError("Tenant data not found")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const exitDate = formData.actual_exit_date || getTodayISO()

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

  if (loading) {
    return <PageLoading message="Loading exit clearance..." />
  }

  if (!clearance) return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )

  const finalAmount = computeFinalAmount()
  const isRefund = isRefundDue(finalAmount)
  const isCleared = clearance.settlement_status === "cleared"
  const statusConfig = EXIT_CLEARANCE_STATUS_CONFIG[clearance.settlement_status] || EXIT_CLEARANCE_STATUS_CONFIG.initiated

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title="Exit Clearance"
        subtitle={clearance.tenant?.name || "Unknown Tenant"}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Exit Clearance", href: "/exit-clearance" },
          { label: clearance.tenant?.name || "Details" },
        ]}
        avatar={
          <div className="p-3 bg-warning/10 rounded-lg">
            <DoorOpen className="h-8 w-8 text-warning" />
          </div>
        }
        status={<StatusBadge variant={statusConfig.variant} label={statusConfig.label} />}
        actions={
          !isCleared && (
            <div className="flex items-center gap-2">
              <PermissionGate permission="exit_clearance.edit" hide>
                <Link href={`/exit-clearance/${clearance.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission="exit_clearance.edit" hide>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </PermissionGate>
            </div>
          )
        }
      />

      {/* Settlement Amount Card */}
      <InfoCard
        label={isRefund ? "Refund Due" : "Amount Due"}
        value={<Currency amount={Math.abs(finalAmount)} />}
        icon={IndianRupee}
        variant={isRefund ? "success" : "error"}
        className="max-w-sm"
      />

      <DetailPageTemplate layoutKey="exit-clearance-detail" entityType="exit_clearance" record={clearance}>
        {/* Tenant Info */}
        <DetailSection
          title="Tenant Information"
          description="Tenant and location details"
          icon={User}
        >
          <InfoRow
            label="Tenant"
            value={
              clearance.tenant ? (
                <TenantLink id={clearance.tenant.id} name={clearance.tenant.name} />
              ) : (
                "Unknown Tenant"
              )
            }
          />
          <InfoRow
            label="Phone"
            value={
              clearance.tenant?.phone ? (
                <a href={`tel:${clearance.tenant.phone}`} className="text-primary hover:underline flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {clearance.tenant.phone}
                </a>
              ) : (
                "N/A"
              )
            }
          />
          <InfoRow
            label="Property"
            value={
              clearance.property ? (
                <PropertyLink id={clearance.property.id} name={clearance.property.name} />
              ) : (
                "N/A"
              )
            }
          />
          <InfoRow
            label="Room"
            value={
              clearance.room ? (
                <RoomLink id={clearance.room.id} roomNumber={clearance.room.room_number} />
              ) : (
                "N/A"
              )
            }
          />
          <InfoRow
            label="Check-in Date"
            value={clearance.tenant?.check_in_date ? formatDate(clearance.tenant.check_in_date) : "N/A"}
            icon={Calendar}
          />
          <InfoRow
            label="Days Stayed"
            value={`${computeDaysStayed()} days`}
            icon={Clock}
          />
        </DetailSection>

        {/* Settlement Summary */}
        <DetailSection
          title="Settlement"
          description="Financial summary"
          icon={Wallet}
        >
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending Dues</span>
              <span>{formatCurrency(clearance.total_dues)}</span>
            </div>
            <div className="flex justify-between text-sm text-success">
              <span>Security Deposit</span>
              <span>- {formatCurrency(clearance.total_refundable)}</span>
            </div>
            {deductions.length > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Deductions</span>
                <span>+ {formatCurrency(deductions.reduce((sum, d) => sum + d.amount, 0))}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t font-bold text-lg">
              <span>{isRefund ? "Refund" : "Due"}</span>
              <span className={isRefund ? "text-success" : "text-destructive"}>
                {formatCurrency(Math.abs(finalAmount))}
              </span>
            </div>
          </div>
        </DetailSection>

        {/* Timeline */}
        <DetailSection
          title="Timeline"
          description="Key dates"
          icon={Calendar}
        >
          <div className="space-y-3 text-sm">
            {clearance.notice_given_date && (
              <InfoRow
                label="Notice Given"
                value={formatDate(clearance.notice_given_date)}
              />
            )}
            <InfoRow
              label="Expected Exit"
              value={formatDate(clearance.expected_exit_date)}
            />
            {(formData.actual_exit_date || clearance.actual_exit_date) && (
              <InfoRow
                label="Actual Exit"
                value={formatDate(formData.actual_exit_date || clearance.actual_exit_date!)}
              />
            )}
            {clearance.completed_at && (
              <InfoRow
                label="Completed"
                value={<span className="text-success">{formatDate(clearance.completed_at)}</span>}
              />
            )}
          </div>
        </DetailSection>

        {/* Checkout Checklist */}
        <FeatureGate module="exitClearance" feature="clearanceWorkflow">
        <DetailSection
          title="Checkout Checklist"
          description="Complete all items before finalizing"
          icon={ClipboardCheck}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <ClipboardCheck className={`h-5 w-5 ${formData.room_inspection_done ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium">Room Inspection</p>
                  <p className="text-sm text-muted-foreground">Check room condition and inventory</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.room_inspection_done}
                onChange={(e) => setFormData({ ...formData, room_inspection_done: e.target.checked })}
                disabled={isCleared}
                className="h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className={`h-5 w-5 ${formData.key_returned ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium">Key Returned</p>
                  <p className="text-sm text-muted-foreground">Collect all room keys</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.key_returned}
                onChange={(e) => setFormData({ ...formData, key_returned: e.target.checked })}
                disabled={isCleared}
                className="h-5 w-5"
              />
            </div>

            <div className="space-y-2">
              <Label>Actual Exit Date</Label>
              <Input
                type="date"
                value={formData.actual_exit_date}
                onChange={(e) => setFormData({ ...formData, actual_exit_date: e.target.value })}
                disabled={isCleared}
              />
            </div>

            <div className="space-y-2">
              <Label>Room Condition Notes</Label>
              <Textarea
                value={formData.room_condition_notes}
                onChange={(e) => setFormData({ ...formData, room_condition_notes: e.target.value })}
                placeholder="Any damages or issues..."
                rows={3}
                disabled={isCleared}
                className="resize-none"
              />
            </div>
          </div>
        </DetailSection>
        </FeatureGate>

        {/* Deductions */}
        <DetailSection
          title="Deductions"
          description="Damages, cleaning, or other charges"
          icon={Receipt}
        >
          <div className="space-y-4">
            {deductions.length > 0 ? (
              <div className="space-y-2">
                {deductions.map((deduction, index) => (
                  <div
                    key={`deduction-${index}-${deduction.reason}`}
                    className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg"
                  >
                    <span>{deduction.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-destructive">
                        {formatCurrency(deduction.amount)}
                      </span>
                      {!isCleared && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeDeduction(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No deductions</p>
            )}

            {!isCleared && (
              <div className="flex gap-2">
                <Input
                  placeholder="Reason"
                  value={newDeduction.reason}
                  onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newDeduction.amount}
                  onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                  className="w-32"
                />
                <Button variant="outline" onClick={addDeduction}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Actions */}
        {!isCleared && (
          <PermissionGate permission="exit_clearance.edit" hide>
            <DetailSection
              title="Actions"
              description="Complete the clearance"
              icon={CheckCircle}
            >
              <div className="space-y-3">
                {clearance.settlement_status === "initiated" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleMarkPending}
                    disabled={saving}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Mark Pending Payment
                  </Button>
                )}
                <Button
                  className="w-full"
                  onClick={handleComplete}
                  disabled={saving || !formData.room_inspection_done || !formData.key_returned}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Complete Clearance
                </Button>
                {(!formData.room_inspection_done || !formData.key_returned) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Complete checklist items to enable
                  </p>
                )}
              </div>
            </DetailSection>
          </PermissionGate>
        )}

        {/* Cleared Badge */}
        {isCleared && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
            <p className="font-semibold text-success">Clearance Completed</p>
            <p className="text-sm text-success/80">Room is now available</p>
          </div>
        )}

        {/* Record Refund Button */}
        {isCleared && isRefund && clearance.tenant && (
          <Link href={`/refunds/new?tenant=${clearance.tenant.id}&clearance=${clearance.id}`}>
            <Button className="w-full" variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Record Refund
            </Button>
          </Link>
        )}

        {/* Outstanding Bills */}
        <FeatureGuard module="exitClearance" feature="dueBillSettlement">
          <DetailSection
            title="Outstanding Bills"
            description="Unpaid bills for this tenant"
            icon={FileWarning}
          >
            {billsLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading bills...</p>
            ) : outstandingBills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No outstanding bills</p>
            ) : (
              <div className="space-y-2">
                {outstandingBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{bill.bill_number || "—"}</p>
                      <p className="text-xs text-muted-foreground">{bill.for_month || "—"}{bill.due_date ? ` · Due ${formatDate(bill.due_date)}` : ""}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <StatusBadge
                        status={bill.status === "overdue" ? "error" : bill.status === "partial" ? "warning" : "info"}
                        label={bill.status}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs text-muted-foreground">{formatCurrency(bill.total_amount)}</p>
                        <p className="font-semibold text-sm text-destructive">{formatCurrency(bill.balance_due)} due</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t font-semibold">
                  <span>Total Outstanding</span>
                  <span className="text-destructive">
                    {formatCurrency(outstandingBills.reduce((sum, b) => sum + b.balance_due, 0))}
                  </span>
                </div>
              </div>
            )}
          </DetailSection>
        </FeatureGuard>

        {/* Auto-Calculate Refund */}
        <FeatureGuard module="refunds" feature="autoRefundCalculation">
          <DetailSection
            title="Auto-Calculate Refund"
            description="Calculate deposit refund based on security deposit and outstanding dues"
            icon={Calculator}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-card border rounded-lg">
                  <p className="text-muted-foreground">Security Deposit</p>
                  <p className="font-semibold text-success mt-1">
                    {formatCurrency((clearance.tenant as (typeof clearance.tenant & { security_deposit?: number }) | null)?.security_deposit ?? clearance.total_refundable)}
                  </p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <p className="text-muted-foreground">Total Dues</p>
                  <p className="font-semibold text-destructive mt-1">{formatCurrency(clearance.total_dues)}</p>
                </div>
              </div>
              {calculatedRefund !== null && (
                <div className={`p-4 rounded-lg border-2 text-center ${calculatedRefund >= 0 ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground mb-1">{calculatedRefund >= 0 ? "Refundable Amount" : "Amount Owed by Tenant"}</p>
                  <p className={`text-2xl font-bold ${calculatedRefund >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(Math.abs(calculatedRefund))}
                  </p>
                </div>
              )}
              {!isCleared && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const deposit = (clearance.tenant as (typeof clearance.tenant & { security_deposit?: number }) | null)?.security_deposit ?? clearance.total_refundable
                    setCalculatedRefund(deposit - clearance.total_dues)
                  }}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Refund
                </Button>
              )}
            </div>
          </DetailSection>
        </FeatureGuard>

      </DetailPageTemplate>
    </div>
  )
}
