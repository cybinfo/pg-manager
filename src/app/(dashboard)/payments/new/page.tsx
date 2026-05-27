"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CreditCard, Loader2, User, IndianRupee, FileText } from "lucide-react"
import { FormField, Select } from "@/components/ui/form-components"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency, formatMonthYear } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { getTodayISO } from "@/lib/date-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { recordPayment, PaymentRecordInput } from "@/lib/workflows/payment.workflow"
import { PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { logger } from "@/lib/logger"
import { useFeatures } from "@/lib/features/use-features"

interface Tenant {
  id: string
  name: string
  phone: string
  monthly_rent: number
  property_id: string
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  phone: string
  monthly_rent: number
  property_id: string
  property: {
    id: string
    name: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
}

interface ChargeType {
  id: string
  name: string
  code: string
}

interface Bill {
  id: string
  bill_number: string
  for_month: string
  total_amount: number
  balance_due: number
  status: string
}

function NewPaymentForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/payments" })
  const { isFeatureEnabled } = useFeatures()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenantId = searchParams.get("tenant")
  const preselectedBillId = searchParams.get("bill")

  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const [formData, setFormData] = useState({
    tenant_id: preselectedTenantId || "",
    bill_id: preselectedBillId || "",
    charge_type_id: "",
    amount: "",
    payment_method: "cash",
    payment_date: getTodayISO(),
    for_period: "",
    reference_number: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [tenantsRes, chargeTypesRes] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            *,
            property:properties(id, name),
            room:rooms(id, room_number)
          `)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("charge_types")
          .select("id, name, code")
          .eq("owner_id", user?.id)
          .eq("is_enabled", true)
          .order("display_order"),
      ])

      if (tenantsRes.error) {
        logger.error("Error fetching tenants:", { detail: tenantsRes.error })
        showError("Failed to load tenants")
      } else {
        // Transform the data from arrays to single objects
        const transformedTenants = ((tenantsRes.data as RawTenant[]) || []).map((tenant) => ({
          ...tenant,
          property: transformJoin(tenant.property),
          room: transformJoin(tenant.room),
        }))
        setTenants(transformedTenants)

        // If preselected tenant, set it
        if (preselectedTenantId) {
          const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
          if (tenant) {
            setSelectedTenant(tenant)
            setFormData((prev) => ({
              ...prev,
              amount: tenant.monthly_rent.toString(),
            }))
          }
        }
      }

      if (chargeTypesRes.error) {
        logger.error("Error fetching charge types:", { detail: chargeTypesRes.error })
      } else {
        setChargeTypes(chargeTypesRes.data || [])
        // Default to "Rent" if available
        const rentType = chargeTypesRes.data?.find((ct: { code: string }) => ct.code === "rent")
        if (rentType) {
          setFormData((prev) => ({ ...prev, charge_type_id: rentType.id }))
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId, user])

  // Update selected tenant and fetch bills when tenant changes
  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenant(tenant || null)
      if (tenant) {
        setFormData((prev) => ({
          ...prev,
          amount: tenant.monthly_rent.toString(),
        }))

        // Fetch pending bills for this tenant
        const fetchBills = async () => {
          const supabase = createClient()
          const { data: billsData, error } = await supabase
            .from("bills")
            .select("id, bill_number, for_month, total_amount, balance_due, status")
            .eq("tenant_id", tenant.id)
            .in("status", ["pending", "partial", "overdue"])
            .gt("balance_due", 0)
            .order("bill_date", { ascending: false })

          if (!error && billsData) {
            setBills(billsData)
          } else {
            setBills([])
          }
        }
        fetchBills()
      }
    } else {
      setSelectedTenant(null)
      setBills([])
    }
  }, [formData.tenant_id, tenants])

  // Update amount when bill is selected
  useEffect(() => {
    if (formData.bill_id) {
      const bill = bills.find((b) => b.id === formData.bill_id)
      if (bill) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({
          ...prev,
          amount: bill.balance_due.toString(),
          for_period: bill.for_month,
        }))
      }
    }
  }, [formData.bill_id, bills])

  // Generate current month period
  useEffect(() => {
    const currentPeriod = formatMonthYear(new Date())
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({ ...prev, for_period: currentPeriod }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.amount || !formData.payment_method) {
      showError("Please fill in all required fields")
      return
    }

    if (!formData.bill_id) {
      showError("Payment must be linked to a bill. Please select a bill or create one first.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Build workflow input
      const workflowInput: PaymentRecordInput = {
        tenant_id: formData.tenant_id,
        property_id: selectedTenant?.property_id || "",
        bill_id: formData.bill_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method as PaymentRecordInput["payment_method"],
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        is_advance: false,
        send_receipt: isFeatureEnabled("payments", "paymentReceipts"),
      }

      // Execute the workflow
      const result = await recordPayment(
        workflowInput,
        user.id,
        "owner",
        user.id // workspace_id is same as owner_id
      )

      if (!result.success) {
        logger.error("Error recording payment:", { detail: result.errors })
        const errorMsg = result.errors?.[0]?.message || "Unknown error"
        showError(`Failed to record payment: ${errorMsg}`)
        setLoading(false)
        return
      }

      showSuccess(`Payment recorded! Receipt: ${result.data?.receipt_number || "Generated"}`)
      setLoading(false)
      router.push("/payments")
    } catch (error: unknown) {
      handleClientError(error, "Recording payment")
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (tenants.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Record Payment</h1>
            <p className="text-muted-foreground">Record a payment from a tenant</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No active tenants</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to add tenants before recording payments
            </p>
            <Link href="/tenants/new">
              <Button>Add Tenant First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">Record a payment from a tenant</p>
        </div>
      </div>

      {/* Form */}
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
                <CardDescription>Choose the tenant making this payment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Tenant" required>
              <Combobox
                options={tenants.map((t): ComboboxOption => ({
                  value: t.id,
                  label: t.name,
                  description: `${t.property?.name || 'Unknown Property'}, Room ${t.room?.room_number || 'N/A'}`,
                }))}
                value={formData.tenant_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tenant_id: value }))}
                placeholder="Search tenant..."
                searchPlaceholder="Type tenant name..."
                disabled={loading}
              />
            </FormField>

            {selectedTenant && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium">{formatCurrency(selectedTenant.monthly_rent)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{selectedTenant.phone}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bill Selection - REQUIRED */}
        {selectedTenant && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <FileText className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <CardTitle>Select Bill *</CardTitle>
                  <CardDescription>Every payment must be linked to a bill</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bills.length > 0 ? (
                <>
                  <FormField label="Pending Bill" required>
                    <Combobox
                      options={bills.map((b): ComboboxOption => ({
                        value: b.id,
                        label: `${b.bill_number} - ${b.for_month}`,
                        description: `Balance Due: ${formatCurrency(b.balance_due)}`,
                      }))}
                      value={formData.bill_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, bill_id: value }))}
                      placeholder="Select a bill..."
                      searchPlaceholder="Search bills..."
                      disabled={loading}
                    />
                  </FormField>

                  {formData.bill_id && (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                      <p className="text-warning">
                        Payment will be linked to this bill and automatically update the bill status.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h4 className="font-medium text-destructive">No Pending Bills</h4>
                      <p className="text-sm text-destructive/80 mt-1">
                        This tenant has no pending bills. You must create a bill before recording a payment.
                      </p>
                      <Link href={`/bills/new?tenant=${selectedTenant.id}`}>
                        <Button variant="outline" size="sm" className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10">
                          <FileText className="mr-2 h-4 w-4" />
                          Create Bill First
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <IndianRupee className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Enter the payment information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Amount (₹)" required>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 8000"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </FormField>
              <FormField label="Payment Date" required>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment For">
                <Select
                  id="charge_type_id"
                  name="charge_type_id"
                  value={formData.charge_type_id}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Select type"
                  options={chargeTypes.map((ct) => ({
                    value: ct.id,
                    label: ct.name,
                  }))}
                />
              </FormField>
              <FormField label="For Period">
                <Input
                  id="for_period"
                  name="for_period"
                  placeholder="e.g., January 2024"
                  value={formData.for_period}
                  onChange={handleChange}
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Method" required>
                <Select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </FormField>
              <FormField label="Reference Number">
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="UPI Ref / Cheque No."
                  value={formData.reference_number}
                  onChange={handleChange}
                  disabled={loading}
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this payment"
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/payments">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.tenant_id || !formData.bill_id}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewPaymentPage() {
  return (
    <PermissionGuard permission="payments.create">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <NewPaymentForm />
      </Suspense>
    </PermissionGuard>
  )
}
