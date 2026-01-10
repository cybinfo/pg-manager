"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Wallet,
  ArrowLeft,
  User,
  Building2,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import { PageLoader } from "@/components/ui/page-loader"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/auth"

interface Tenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  property_id: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
}

interface ExitClearance {
  id: string
  tenant_id: string
  total_refundable: number
  final_amount: number
  settlement_status: string
}

export default function NewRefundPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get("tenant")
  const exitClearanceId = searchParams.get("clearance")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [exitClearance, setExitClearance] = useState<ExitClearance | null>(null)

  const [formData, setFormData] = useState({
    tenant_id: tenantId || "",
    refund_type: "deposit_refund",
    amount: "",
    payment_mode: "cash",
    reference_number: "",
    refund_date: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  })

  useEffect(() => {
    fetchTenants()
    if (exitClearanceId) {
      fetchExitClearance(exitClearanceId)
    }
  }, [exitClearanceId])

  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      setSelectedTenant(tenant || null)
    }
  }, [formData.tenant_id, tenants])

  const fetchTenants = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        id, name, phone, photo_url, property_id,
        property:properties(id, name),
        room:rooms(id, room_number)
      `)
      .in("status", ["active", "notice_period", "checked_out"])
      .order("name")

    if (error) {
      console.error("Error fetching tenants:", error)
    } else {
      const transformed = (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        property: transformJoin(t.property as Record<string, unknown>[] | Record<string, unknown> | null),
        room: transformJoin(t.room as Record<string, unknown>[] | Record<string, unknown> | null),
      })) as Tenant[]
      setTenants(transformed)

      // Pre-select tenant if provided
      if (tenantId) {
        const tenant = transformed.find((t) => t.id === tenantId)
        if (tenant) {
          setSelectedTenant(tenant)
        }
      }
    }
    setLoading(false)
  }

  const fetchExitClearance = async (clearanceId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("exit_clearance")
      .select("id, tenant_id, total_refundable, final_amount, settlement_status")
      .eq("id", clearanceId)
      .single()

    if (error) {
      console.error("Error fetching exit clearance:", error)
    } else if (data) {
      setExitClearance(data)
      setFormData((prev) => ({
        ...prev,
        tenant_id: data.tenant_id,
        amount: data.final_amount < 0 ? Math.abs(data.final_amount).toString() : data.total_refundable.toString(),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        toast.error("Session expired. Please login again.")
        return
      }

      const refundData = {
        owner_id: session.user.id,
        tenant_id: formData.tenant_id,
        property_id: selectedTenant?.property_id || null,
        exit_clearance_id: exitClearanceId || null,
        refund_type: formData.refund_type,
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        refund_date: formData.refund_date || null,
        status: formData.refund_date ? "completed" : "pending",
        reason: formData.reason || null,
        notes: formData.notes || null,
        processed_by: formData.refund_date ? session.user.id : null,
        processed_at: formData.refund_date ? new Date().toISOString() : null,
      }

      const { data, error } = await supabase
        .from("refunds")
        .insert(refundData)
        .select()
        .single()

      if (error) {
        console.error("Error creating refund:", error)
        toast.error(`Failed to create refund: ${error.message}`)
      } else {
        toast.success("Refund recorded successfully")

        // Update exit_clearance refund status if linked
        if (exitClearanceId) {
          await supabase
            .from("exit_clearance")
            .update({
              refund_status: formData.refund_date ? "completed" : "pending",
              refund_amount: parseFloat(formData.amount),
            })
            .eq("id", exitClearanceId)
        }

        router.push("/refunds")
      }
    } catch (err) {
      console.error("Error:", err)
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <PermissionGuard permission="payments.create">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/refunds">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Record Refund</h1>
            <p className="text-muted-foreground">Record a new refund payment to tenant</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tenant Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Tenant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  disabled={!!tenantId}
                  placeholder="Select a tenant"
                  options={tenants.map((tenant) => ({
                    value: tenant.id,
                    label: `${tenant.name} - ${tenant.property?.name || "No property"}`,
                  }))}
                />

                {selectedTenant && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={selectedTenant.name}
                        src={selectedTenant.photo_url}
                        size="lg"
                        className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
                      />
                      <div>
                        <p className="font-semibold">{selectedTenant.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedTenant.phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTenant.property?.name}
                          {selectedTenant.room && ` • Room ${selectedTenant.room.room_number}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refund Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Refund Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refund_type">Refund Type *</Label>
                    <Select
                      value={formData.refund_type}
                      onChange={(e) => setFormData({ ...formData, refund_type: e.target.value })}
                      options={[
                        { value: "deposit_refund", label: "Security Deposit Refund" },
                        { value: "overpayment", label: "Overpayment Refund" },
                        { value: "adjustment", label: "Adjustment" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="pl-8"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_mode">Payment Mode *</Label>
                    <Select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      options={[
                        { value: "cash", label: "Cash" },
                        { value: "upi", label: "UPI" },
                        { value: "bank_transfer", label: "Bank Transfer" },
                        { value: "cheque", label: "Cheque" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference_number">Reference Number</Label>
                    <Input
                      id="reference_number"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      placeholder="Transaction ID / UPI Ref / Cheque No."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refund_date">Refund Date</Label>
                  <Input
                    id="refund_date"
                    type="date"
                    value={formData.refund_date}
                    onChange={(e) => setFormData({ ...formData, refund_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to mark as pending. Enter a date to mark as completed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Security deposit refund after checkout"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <span className="text-xl font-bold text-green-600">
                    {formData.amount ? formatCurrency(parseFloat(formData.amount)) : "₹0"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{formData.refund_type.replace(/_/g, " ")}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="capitalize">{formData.payment_mode.replace(/_/g, " ")}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={formData.refund_date ? "text-green-600" : "text-yellow-600"}>
                    {formData.refund_date ? "Completed" : "Pending"}
                  </span>
                </div>

                {exitClearance && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">From Exit Clearance</p>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Deposit Amount</span>
                        <span>{formatCurrency(exitClearance.total_refundable)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Settlement</span>
                        <span className={exitClearance.final_amount < 0 ? "text-green-600" : "text-red-600"}>
                          {exitClearance.final_amount < 0 ? "Refund " : "Due "}
                          {formatCurrency(Math.abs(exitClearance.final_amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={submitting || !formData.tenant_id || !formData.amount}>
                {submitting ? "Saving..." : "Record Refund"}
              </Button>
              <Link href="/refunds">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </PermissionGuard>
  )
}
