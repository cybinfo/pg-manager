"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  LogOut,
  Loader2,
  User,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react"
import { toast } from "sonner"

interface TenantRaw {
  id: string
  name: string
  phone: string
  monthly_rent: number
  check_in_date: string
  status: string
  property_id: string
  room_id: string
  property: { id: string; name: string }[] | null
  room: { id: string; room_number: string; deposit_amount: number }[] | null
}

interface Tenant {
  id: string
  name: string
  phone: string
  monthly_rent: number
  check_in_date: string
  status: string
  property_id: string
  room_id: string
  property: {
    id: string
    name: string
  }
  room: {
    id: string
    room_number: string
    deposit_amount: number
  }
}

interface Deduction {
  id: string
  reason: string
  amount: number
}

function InitiateCheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenantId = searchParams.get("tenant")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const [formData, setFormData] = useState({
    tenant_id: preselectedTenantId || "",
    notice_given_date: new Date().toISOString().split("T")[0],
    expected_exit_date: "",
    room_condition_notes: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })

  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          monthly_rent,
          check_in_date,
          status,
          property_id,
          room_id,
          property:properties(id, name),
          room:rooms(id, room_number, deposit_amount)
        `)
        .in("status", ["active", "notice_period"])
        .order("name")

      // Transform Supabase array joins to single objects
      const transformedTenants: Tenant[] = ((data as TenantRaw[]) || [])
        .filter((t) => t.property && t.property.length > 0 && t.room && t.room.length > 0)
        .map((t) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          monthly_rent: t.monthly_rent,
          check_in_date: t.check_in_date,
          status: t.status,
          property_id: t.property_id,
          room_id: t.room_id,
          property: t.property![0],
          room: t.room![0],
        }))
      setTenants(transformedTenants)

      // Preselect tenant if provided
      if (preselectedTenantId && transformedTenants.length > 0) {
        const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
        if (tenant) {
          setSelectedTenant(tenant)
          // Set default exit date to 30 days from now
          const exitDate = new Date()
          exitDate.setDate(exitDate.getDate() + 30)
          setFormData((prev) => ({
            ...prev,
            expected_exit_date: exitDate.toISOString().split("T")[0],
          }))
        }
      }

      setLoadingData(false)
    }

    fetchTenants()
  }, [preselectedTenantId])

  // Update selected tenant when selection changes
  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      setSelectedTenant(tenant || null)
    } else {
      setSelectedTenant(null)
    }
  }, [formData.tenant_id, tenants])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const addDeduction = () => {
    if (!newDeduction.reason || !newDeduction.amount) {
      toast.error("Please enter reason and amount")
      return
    }

    setDeductions([
      ...deductions,
      {
        id: Date.now().toString(),
        reason: newDeduction.reason,
        amount: parseFloat(newDeduction.amount),
      },
    ])
    setNewDeduction({ reason: "", amount: "" })
  }

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id))
  }

  // Calculate amounts
  const calculateAmounts = () => {
    if (!selectedTenant) {
      return { totalDues: 0, totalRefundable: 0, totalDeductions: 0, finalAmount: 0 }
    }

    const depositAmount = selectedTenant.room.deposit_amount || 0
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
    const totalRefundable = depositAmount
    const totalDues = 0 // This would come from pending charges in a real app
    const finalAmount = totalDues - totalRefundable + totalDeductions

    return { totalDues, totalRefundable, totalDeductions, finalAmount }
  }

  const amounts = calculateAmounts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.expected_exit_date) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !selectedTenant) {
        toast.error("Session expired. Please login again.")
        return
      }

      const { data, error } = await supabase
        .from("exit_clearance")
        .insert({
          owner_id: user.id,
          tenant_id: formData.tenant_id,
          property_id: selectedTenant.property_id,
          room_id: selectedTenant.room_id,
          notice_given_date: formData.notice_given_date || null,
          expected_exit_date: formData.expected_exit_date,
          total_dues: amounts.totalDues,
          total_refundable: amounts.totalRefundable,
          deductions: deductions.map((d) => ({ reason: d.reason, amount: d.amount })),
          final_amount: amounts.finalAmount,
          settlement_status: "initiated",
          room_condition_notes: formData.room_condition_notes || null,
        })
        .select()
        .single()

      if (error) throw error

      // Update tenant status to notice_period if not already
      if (selectedTenant.status === "active") {
        await supabase
          .from("tenants")
          .update({ status: "notice_period" })
          .eq("id", selectedTenant.id)
      }

      toast.success("Exit clearance initiated")
      router.push(`/exit-clearance/${data.id}`)
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || "Failed to initiate checkout")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/exit-clearance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Initiate Checkout</h1>
          <p className="text-muted-foreground">Start the exit clearance process</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Select Tenant</CardTitle>
                <CardDescription>Choose the tenant for checkout</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant *</Label>
              <select
                id="tenant_id"
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                required
                disabled={loading}
              >
                <option value="">Select a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} - {tenant.property.name}, Room {tenant.room.room_number}
                    {tenant.status === "notice_period" ? " (On Notice)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedTenant && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTenant.property.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>Room {selectedTenant.room.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>Rent: ₹{selectedTenant.monthly_rent.toLocaleString("en-IN")}/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Since: {new Date(selectedTenant.check_in_date).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Security Deposit:</span>{" "}
                    <span className="font-medium">₹{(selectedTenant.room.deposit_amount || 0).toLocaleString("en-IN")}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Exit Details</CardTitle>
                <CardDescription>Notice and exit dates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notice_given_date">Notice Given Date</Label>
                <Input
                  id="notice_given_date"
                  name="notice_given_date"
                  type="date"
                  value={formData.notice_given_date}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_exit_date">Expected Exit Date *</Label>
                <Input
                  id="expected_exit_date"
                  name="expected_exit_date"
                  type="date"
                  value={formData.expected_exit_date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room_condition_notes">Room Condition Notes</Label>
              <textarea
                id="room_condition_notes"
                name="room_condition_notes"
                placeholder="Note any damages or issues with the room..."
                value={formData.room_condition_notes}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle>Deductions</CardTitle>
                <CardDescription>Damages, cleaning, or other charges</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Deductions */}
            {deductions.length > 0 && (
              <div className="space-y-2">
                {deductions.map((deduction) => (
                  <div
                    key={deduction.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <span>{deduction.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">
                        ₹{deduction.amount.toLocaleString("en-IN")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeDeduction(deduction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Deduction */}
            <div className="flex gap-2">
              <Input
                placeholder="Reason (e.g., Wall damage)"
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
              <Button type="button" variant="outline" onClick={addDeduction}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Summary */}
        {selectedTenant && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Settlement Summary</CardTitle>
                  <CardDescription>Calculated amounts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Dues</span>
                  <span className="font-medium">₹{amounts.totalDues.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Security Deposit (Refundable)</span>
                  <span className="font-medium">- ₹{amounts.totalRefundable.toLocaleString("en-IN")}</span>
                </div>
                {amounts.totalDeductions > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Deductions</span>
                    <span className="font-medium">+ ₹{amounts.totalDeductions.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t text-lg font-bold">
                  <span>{amounts.finalAmount >= 0 ? "Tenant Owes" : "Refund to Tenant"}</span>
                  <span className={amounts.finalAmount >= 0 ? "text-red-600" : "text-green-600"}>
                    ₹{Math.abs(amounts.finalAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Link href="/exit-clearance">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !selectedTenant}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Initiate Checkout
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewExitClearancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InitiateCheckoutForm />
    </Suspense>
  )
}
