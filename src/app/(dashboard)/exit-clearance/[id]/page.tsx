"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
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
  Building2,
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

interface Deduction {
  reason: string
  amount: number
}

interface ExitClearance {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  deductions: Deduction[]
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  room_condition_notes: string | null
  key_returned: boolean
  created_at: string
  completed_at: string | null
  tenant: {
    id: string
    name: string
    phone: string
    monthly_rent: number
    check_in_date: string
  } | null
  property: {
    id: string
    name: string
    address: string | null
    city: string
  } | null
  room: {
    id: string
    room_number: string
    deposit_amount: number
  } | null
}

interface RawExitClearance {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  deductions: Deduction[]
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  room_condition_notes: string | null
  key_returned: boolean
  created_at: string
  completed_at: string | null
  tenant: {
    id: string
    name: string
    phone: string
    monthly_rent: number
    check_in_date: string
  }[] | null
  property: {
    id: string
    name: string
    address: string | null
    city: string
  }[] | null
  room: {
    id: string
    room_number: string
    deposit_amount: number
  }[] | null
}

// Exit clearance status mapping for StatusBadge
const exitStatusMap: Record<string, { variant: "info" | "warning" | "success"; label: string }> = {
  initiated: { variant: "info", label: "Initiated" },
  pending_payment: { variant: "warning", label: "Pending Payment" },
  cleared: { variant: "success", label: "Cleared" },
}

export default function ExitClearanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clearance, setClearance] = useState<ExitClearance | null>(null)

  const [formData, setFormData] = useState({
    actual_exit_date: "",
    room_inspection_done: false,
    key_returned: false,
    room_condition_notes: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })

  useEffect(() => {
    const fetchClearance = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("exit_clearance")
        .select(`
          *,
          tenant:tenants(id, name, phone, monthly_rent, check_in_date),
          property:properties(id, name, address, city),
          room:rooms(id, room_number, deposit_amount)
        `)
        .eq("id", params.id)
        .single()

      if (error || !data) {
        toast.error("Clearance not found")
        router.push("/exit-clearance")
        return
      }

      // Transform the data from arrays to single objects
      const rawData = data as RawExitClearance
      const transformedData: ExitClearance = {
        ...rawData,
        tenant: transformJoin(rawData.tenant),
        property: transformJoin(rawData.property),
        room: transformJoin(rawData.room),
      }
      setClearance(transformedData)
      setFormData({
        actual_exit_date: data.actual_exit_date || "",
        room_inspection_done: data.room_inspection_done || false,
        key_returned: data.key_returned || false,
        room_condition_notes: data.room_condition_notes || "",
      })
      setDeductions(data.deductions || [])
      setLoading(false)
    }

    fetchClearance()
  }, [params.id, router])

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

  const calculateFinalAmount = () => {
    if (!clearance) return 0
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
    return clearance.total_dues - clearance.total_refundable + totalDeductions
  }

  const handleSave = async () => {
    if (!clearance) return

    setSaving(true)
    try {
      const supabase = createClient()
      const finalAmount = calculateFinalAmount()

      const { error } = await supabase
        .from("exit_clearance")
        .update({
          actual_exit_date: formData.actual_exit_date || null,
          room_inspection_done: formData.room_inspection_done,
          key_returned: formData.key_returned,
          room_condition_notes: formData.room_condition_notes || null,
          deductions,
          final_amount: finalAmount,
        })
        .eq("id", clearance.id)

      if (error) throw error

      setClearance({
        ...clearance,
        ...formData,
        deductions,
        final_amount: finalAmount,
      })
      toast.success("Changes saved")
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPending = async () => {
    if (!clearance) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("exit_clearance")
        .update({ settlement_status: "pending_payment" })
        .eq("id", clearance.id)

      if (error) throw error

      setClearance({ ...clearance, settlement_status: "pending_payment" })
      toast.success("Marked as pending payment")
    } catch (error) {
      toast.error("Failed to update status")
    } finally {
      setSaving(false)
    }
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

      // Update clearance status
      const { error: clearanceError } = await supabase
        .from("exit_clearance")
        .update({
          settlement_status: "cleared",
          actual_exit_date: formData.actual_exit_date || new Date().toISOString().split("T")[0],
          completed_at: new Date().toISOString(),
        })
        .eq("id", clearance.id)

      if (clearanceError) throw clearanceError

      // Update tenant status
      if (!clearance.tenant) {
        toast.error("Tenant data not found")
        return
      }
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          status: "checked_out",
          check_out_date: formData.actual_exit_date || new Date().toISOString().split("T")[0],
        })
        .eq("id", clearance.tenant.id)

      if (tenantError) throw tenantError

      // Update room status
      if (!clearance.room) {
        toast.error("Room data not found")
        return
      }
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", clearance.room.id)

      if (roomError) throw roomError

      toast.success("Exit clearance completed! Room is now available.")
      router.push("/exit-clearance")
    } catch (error: any) {
      toast.error(error.message || "Failed to complete clearance")
    } finally {
      setSaving(false)
    }
  }

  const getDaysStayed = () => {
    if (!clearance || !clearance.tenant) return 0
    const checkIn = new Date(clearance.tenant.check_in_date)
    const checkOut = new Date(formData.actual_exit_date || clearance.expected_exit_date)
    return Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return <PageLoading message="Loading exit clearance..." />
  }

  if (!clearance) return null

  const finalAmount = calculateFinalAmount()
  const isRefund = finalAmount < 0
  const isCleared = clearance.settlement_status === "cleared"

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
        status={
          <StatusBadge
            variant={exitStatusMap[clearance.settlement_status]?.variant || "muted"}
            label={exitStatusMap[clearance.settlement_status]?.label || clearance.settlement_status}
          />
        }
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
              value={`${getDaysStayed()} days`}
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

          {/* Record Refund Button - show when clearance is complete and refund is due */}
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
