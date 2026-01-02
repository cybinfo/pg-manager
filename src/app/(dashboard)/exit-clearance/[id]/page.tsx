"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  User,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  Key,
  ClipboardCheck,
  Printer,
  Save,
  Plus,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"

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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  initiated: { label: "Initiated", color: "text-blue-700", bgColor: "bg-blue-100" },
  pending_payment: { label: "Pending Payment", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  cleared: { label: "Cleared", color: "text-green-700", bgColor: "bg-green-100" },
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
        tenant: rawData.tenant && rawData.tenant.length > 0 ? rawData.tenant[0] : null,
        property: rawData.property && rawData.property.length > 0 ? rawData.property[0] : null,
        room: rawData.room && rawData.room.length > 0 ? rawData.room[0] : null,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getDaysStayed = () => {
    if (!clearance || !clearance.tenant) return 0
    const checkIn = new Date(clearance.tenant.check_in_date)
    const checkOut = new Date(formData.actual_exit_date || clearance.expected_exit_date)
    return Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!clearance) return null

  const finalAmount = calculateFinalAmount()
  const isRefund = finalAmount < 0
  const isCleared = clearance.settlement_status === "cleared"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/exit-clearance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[clearance.settlement_status]?.bgColor} ${statusConfig[clearance.settlement_status]?.color}`}>
                {statusConfig[clearance.settlement_status]?.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold">Exit Clearance</h1>
          </div>
        </div>
        {!isCleared && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tenant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{clearance.tenant?.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${clearance.tenant?.phone}`} className="hover:text-primary">
                      {clearance.tenant?.phone}
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{clearance.property?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>Room {clearance.room?.room_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Since {clearance.tenant?.check_in_date ? formatDate(clearance.tenant.check_in_date) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{getDaysStayed()} days stayed</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checkout Checklist</CardTitle>
              <CardDescription>Complete all items before finalizing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deductions</CardTitle>
              <CardDescription>Damages, cleaning, or other charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settlement Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settlement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {clearance.notice_given_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notice Given</span>
                  <span>{formatDate(clearance.notice_given_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Exit</span>
                <span>{formatDate(clearance.expected_exit_date)}</span>
              </div>
              {(formData.actual_exit_date || clearance.actual_exit_date) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual Exit</span>
                  <span>{formatDate(formData.actual_exit_date || clearance.actual_exit_date!)}</span>
                </div>
              )}
              {clearance.completed_at && (
                <div className="flex justify-between text-green-600">
                  <span>Completed</span>
                  <span>{formatDate(clearance.completed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {!isCleared && (
            <Card>
              <CardContent className="p-4 space-y-3">
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
              </CardContent>
            </Card>
          )}

          {/* Cleared Badge */}
          {isCleared && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">Clearance Completed</p>
                <p className="text-sm text-green-600">Room is now available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
