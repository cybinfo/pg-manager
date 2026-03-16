"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
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
  Trash2,
  Bell
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency } from "@/lib/format"
import { handleClientError } from "@/lib/error-handler"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { initiateExitClearance, ExitClearanceInput } from "@/lib/workflows/exit.workflow"
import { getTodayISO } from "@/lib/date-helpers"

interface TenantRaw {
  id: string
  name: string
  phone: string
  monthly_rent: number
  check_in_date: string
  notice_date: string | null
  expected_exit_date: string | null
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
  notice_date: string | null
  expected_exit_date: string | null
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
  const [configuredNoticePeriod, setConfiguredNoticePeriod] = useState(30)

  const [formData, setFormData] = useState({
    tenant_id: preselectedTenantId || "",
    notice_given_date: getTodayISO(),
    expected_exit_date: "",
    room_condition_notes: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch owner config for notice period
      const { data: configData } = await supabase
        .from("owner_config")
        .select("default_notice_period")
        .single()

      if (configData?.default_notice_period) {
        setConfiguredNoticePeriod(configData.default_notice_period)
      }

      // Fetch tenants on notice period
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          monthly_rent,
          check_in_date,
          notice_date,
          expected_exit_date,
          status,
          property_id,
          room_id,
          property:properties(id, name),
          room:rooms(id, room_number, deposit_amount)
        `)
        .eq("status", "notice_period")
        .order("name")

      if (error) {
        console.error("Error fetching tenants:", error)
        showError("Failed to load tenants")
        setLoadingData(false)
        return
      }

      // Transform Supabase joins using centralized utility
      const transformedTenants: Tenant[] = ((data as TenantRaw[]) || [])
        .map((t) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          monthly_rent: t.monthly_rent,
          check_in_date: t.check_in_date,
          notice_date: t.notice_date,
          expected_exit_date: t.expected_exit_date,
          status: t.status,
          property_id: t.property_id,
          room_id: t.room_id,
          property: transformJoin(t.property),
          room: transformJoin(t.room),
        }))
        .filter((t): t is Tenant => t.property !== null && t.room !== null)
      setTenants(transformedTenants)

      // Preselect tenant if provided
      if (preselectedTenantId && transformedTenants.length > 0) {
        const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
        if (tenant) {
          setSelectedTenant(tenant)
          // Use tenant's notice_date if available, otherwise today
          const noticeDate = tenant.notice_date || getTodayISO()
          // Use tenant's expected_exit_date if available, otherwise 30 days from now
          const exitDate = tenant.expected_exit_date || (() => {
            const date = new Date()
            date.setDate(date.getDate() + 30)
            return date.toISOString().split("T")[0]
          })()
          setFormData((prev) => ({
            ...prev,
            notice_given_date: noticeDate,
            expected_exit_date: exitDate,
          }))
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId])

  // Update selected tenant when selection changes
  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      setSelectedTenant(tenant || null)

      // Update dates from tenant's stored values when selecting a different tenant
      if (tenant) {
        const noticeDate = tenant.notice_date || getTodayISO()
        const exitDate = tenant.expected_exit_date || (() => {
          const date = new Date()
          date.setDate(date.getDate() + 30)
          return date.toISOString().split("T")[0]
        })()
        setFormData((prev) => ({
          ...prev,
          notice_given_date: noticeDate,
          expected_exit_date: exitDate,
        }))
      }
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
      showError("Please enter reason and amount")
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

  // Calculate notice period comparison
  const calculateNoticePeriodComparison = () => {
    if (!formData.notice_given_date || !formData.expected_exit_date) {
      return null
    }

    const noticeDate = new Date(formData.notice_given_date)
    const exitDate = new Date(formData.expected_exit_date)
    const actualDays = Math.ceil((exitDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24))
    const difference = actualDays - configuredNoticePeriod

    let status: "short" | "exact" | "long"
    let message: string
    let colorClass: string

    if (difference < 0) {
      status = "short"
      message = `${Math.abs(difference)} days SHORT of required ${configuredNoticePeriod} days notice`
      colorClass = "text-destructive bg-destructive/10 border-destructive/20"
    } else if (difference === 0) {
      status = "exact"
      message = `Exactly ${configuredNoticePeriod} days notice (as required)`
      colorClass = "text-success bg-success/10 border-success/20"
    } else {
      status = "long"
      message = `${difference} days MORE than required ${configuredNoticePeriod} days notice`
      colorClass = "text-info bg-info/10 border-info/20"
    }

    return { actualDays, configuredDays: configuredNoticePeriod, difference, status, message, colorClass }
  }

  const noticePeriodComparison = calculateNoticePeriodComparison()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.expected_exit_date) {
      showError("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      // Get session with access token for RLS context
      const { data: { session } } = await supabase.auth.getSession()

      console.log("[ExitClearance] Session user:", session?.user?.id)
      console.log("[ExitClearance] Has access token:", !!session?.access_token)
      console.log("[ExitClearance] Selected tenant ID:", selectedTenant?.id)

      if (!session?.user || !session?.access_token || !selectedTenant) {
        showError("Session expired. Please login again.")
        setLoading(false)
        return
      }

      // Build workflow input
      const workflowInput: ExitClearanceInput = {
        tenant_id: formData.tenant_id,
        property_id: selectedTenant.property_id,
        room_id: selectedTenant.room_id,
        requested_exit_date: formData.expected_exit_date,
        exit_reason: "notice_period", // Default reason
        notice_date: formData.notice_given_date || undefined,
        deductions: deductions.map((d) => ({
          description: d.reason,
          amount: d.amount,
        })),
        notes: formData.room_condition_notes || undefined,
      }

      // Execute the workflow with access token for RLS
      const result = await initiateExitClearance(
        workflowInput,
        session.user.id,
        "owner",
        session.user.id, // workspace_id is same as owner_id
        session.access_token
      )

      if (!result.success) {
        console.error("Error initiating exit:", result.errors)
        const errorMsg = result.errors?.[0]?.message || "Unknown error"
        showError(`Failed to initiate checkout: ${errorMsg}`)
        setLoading(false)
        return
      }

      showSuccess("Exit clearance initiated")
      router.push(`/exit-clearance/${result.data?.clearance_id}`)
    } catch (error: unknown) {
      handleClientError(error, "Initiating checkout")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageSkeleton variant="form" />
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
              {tenants.length === 0 ? (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                  <Bell className="h-8 w-8 text-warning mx-auto mb-2" />
                  <p className="text-sm font-medium text-warning mb-1">
                    No tenants on notice period
                  </p>
                  <p className="text-xs text-warning/80 mb-3">
                    To initiate checkout, you must first put a tenant on notice period from their profile page.
                  </p>
                  <Link href="/tenants" className="inline-block">
                    <Button type="button" size="sm" variant="outline">
                      <User className="mr-1 h-3 w-3" />
                      View Tenants
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select
                  id="tenant_id"
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Select a tenant"
                  options={tenants.map((tenant) => ({
                    value: tenant.id,
                    label: `${tenant.name} - ${tenant.property?.name || "\u2014"}, Room ${tenant.room?.room_number || "\u2014"}`,
                  }))}
                />
              )}
            </div>

            {selectedTenant && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTenant.property?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>Room {selectedTenant.room?.room_number || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>Rent: {formatCurrency(selectedTenant.monthly_rent)}/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Since: {new Date(selectedTenant.check_in_date).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Security Deposit:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedTenant.room.deposit_amount || 0)}</span>
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
              <div className="p-2 bg-info/10 rounded-lg">
                <Calendar className="h-5 w-5 text-info" />
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
                <Label htmlFor="notice_given_date">Notice Given Date *</Label>
                <Input
                  id="notice_given_date"
                  name="notice_given_date"
                  type="date"
                  value={formData.notice_given_date}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  When did the tenant give notice?
                </p>
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
                />
                <p className="text-xs text-muted-foreground">
                  Last day of stay
                </p>
              </div>
            </div>

            {/* Notice Period Comparison */}
            {noticePeriodComparison && (
              <div className={`p-4 rounded-lg border ${noticePeriodComparison.colorClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Notice Period Analysis</p>
                    <p className="text-sm mt-1">{noticePeriodComparison.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{noticePeriodComparison.actualDays}</p>
                    <p className="text-xs">days given</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-current/20 text-sm">
                  <div className="flex justify-between">
                    <span>Notice Date:</span>
                    <span className="font-medium">{new Date(formData.notice_given_date).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Exit Date:</span>
                    <span className="font-medium">{new Date(formData.expected_exit_date).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Required Notice:</span>
                    <span className="font-medium">{configuredNoticePeriod} days</span>
                  </div>
                </div>
              </div>
            )}

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
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
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
                    className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg"
                  >
                    <span>{deduction.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-destructive">
                        {formatCurrency(deduction.amount)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeDeduction(deduction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
                <div className="p-2 bg-success/10 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-success" />
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
                  <span className="font-medium">{formatCurrency(amounts.totalDues)}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>Security Deposit (Refundable)</span>
                  <span className="font-medium">- {formatCurrency(amounts.totalRefundable)}</span>
                </div>
                {amounts.totalDeductions > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Deductions</span>
                    <span className="font-medium">+ {formatCurrency(amounts.totalDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t text-lg font-bold">
                  <span>{amounts.finalAmount >= 0 ? "Tenant Owes" : "Refund to Tenant"}</span>
                  <span className={amounts.finalAmount >= 0 ? "text-destructive" : "text-success"}>
                    {formatCurrency(Math.abs(amounts.finalAmount))}
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
    <PermissionGuard permission="exit_clearance.create">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <InitiateCheckoutForm />
      </Suspense>
    </PermissionGuard>
  )
}
