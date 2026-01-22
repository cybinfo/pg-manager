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
} from "@/components/ui/detail-components"
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
} from "lucide-react"
import { toast } from "sonner"
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

export default function ExitClearanceDetailPage() {
  const params = useParams()
  const router = useRouter()
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

  const addDeduction = () => {
    if (!newDeduction.reason || !newDeduction.amount) {
      toast.error("Please enter reason and amount")
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
      toast.error("Please complete room inspection first")
      return
    }

    if (!formData.key_returned) {
      toast.error("Please confirm key has been returned")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const exitDate = formData.actual_exit_date || new Date().toISOString().split("T")[0]

      // Update clearance status
      const { error: clearanceError } = await supabase
        .from("exit_clearance")
        .update({
          settlement_status: "cleared",
          actual_exit_date: exitDate,
          completed_at: new Date().toISOString(),
        })
        .eq("id", clearance.id)

      if (clearanceError) throw clearanceError

      // Update tenant status
      if (!clearance.tenant) {
        toast.error("Tenant data not found")
        setSaving(false)
        return
      }

      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          status: "checked_out",
          check_out_date: exitDate,
        })
        .eq("id", clearance.tenant.id)

      if (tenantError) throw tenantError

      // Update room status
      if (!clearance.room) {
        toast.error("Room data not found")
        setSaving(false)
        return
      }

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", clearance.room.id)

      if (roomError) throw roomError

      toast.success("Exit clearance completed! Room is now available.")
      router.push("/exit-clearance")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to complete clearance"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading exit clearance..." />
  }

  if (!clearance) return null

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
        backHref="/exit-clearance"
        backLabel="All Exit Clearances"
        avatar={
          <div className="p-3 bg-orange-100 rounded-lg">
            <DoorOpen className="h-8 w-8 text-orange-600" />
          </div>
        }
        status={<StatusBadge variant={statusConfig.variant} label={statusConfig.label} />}
        actions={
          !isCleared && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
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

          {/* Checkout Checklist */}
          <DetailSection
            title="Checkout Checklist"
            description="Complete all items before finalizing"
            icon={ClipboardCheck}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className={`h-5 w-5 ${formData.room_inspection_done ? "text-green-600" : "text-muted-foreground"}`} />
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
                  <Key className={`h-5 w-5 ${formData.key_returned ? "text-green-600" : "text-muted-foreground"}`} />
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
                <textarea
                  value={formData.room_condition_notes}
                  onChange={(e) => setFormData({ ...formData, room_condition_notes: e.target.value })}
                  placeholder="Any damages or issues..."
                  rows={3}
                  disabled={isCleared}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            </div>
          </DetailSection>

          {/* Deductions */}
          <DetailSection
            title="Deductions"
            description="Damages, cleaning, or other charges"
            icon={Receipt}
          >
            <div className="space-y-4">
              {deductions.length > 0 && (
                <div className="space-y-2">
                  {deductions.map((deduction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <span>{deduction.reason}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-red-600">
                          {formatCurrency(deduction.amount)}
                        </span>
                        {!isCleared && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeDeduction(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

              {deductions.length === 0 && isCleared && (
                <p className="text-muted-foreground text-center py-4">No deductions</p>
              )}
            </div>
          </DetailSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
              <div className="flex justify-between text-sm text-green-600">
                <span>Security Deposit</span>
                <span>- {formatCurrency(clearance.total_refundable)}</span>
              </div>
              {deductions.length > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Deductions</span>
                  <span>+ {formatCurrency(deductions.reduce((sum, d) => sum + d.amount, 0))}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t font-bold text-lg">
                <span>{isRefund ? "Refund" : "Due"}</span>
                <span className={isRefund ? "text-green-600" : "text-red-600"}>
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
                  value={<span className="text-green-600">{formatDate(clearance.completed_at)}</span>}
                />
              )}
            </div>
          </DetailSection>

          {/* Actions */}
          {!isCleared && (
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
          )}

          {/* Cleared Badge */}
          {isCleared && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Clearance Completed</p>
              <p className="text-sm text-green-600">Room is now available</p>
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
        </div>
      </div>
    </div>
  )
}
