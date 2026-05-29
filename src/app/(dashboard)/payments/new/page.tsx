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
import { Card, CardContent } from "@/components/ui/card"
import { WorkflowStepper, WorkflowStepCard, WorkflowHeader, WorkflowStepDef } from "@/components/ui/workflow"
import {
  ArrowLeft, CreditCard, Loader2, User, IndianRupee, FileText, AlertCircle, CheckCircle2,
} from "lucide-react"
import { FormField, Select } from "@/components/ui/form-components"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency, formatMonthYear } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { getTodayISO } from "@/lib/date-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { recordPayment, PaymentRecordInput } from "@/lib/workflows/payment.workflow"
import { PAYMENT_METHODS, PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { Textarea } from "@/components/ui/textarea"
import { logger } from "@/lib/logger"
import { useFeatures } from "@/lib/features/use-features"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { DatePicker } from "@/components/ui/date-picker"

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

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Tenant", icon: User },
  { id: 2, label: "Select Bill", icon: FileText },
  { id: 3, label: "Payment Details", icon: IndianRupee },
]

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
  const [currentStep, setCurrentStep] = useState(1)

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
        const transformedTenants = ((tenantsRes.data as RawTenant[]) || []).map((tenant) => ({
          ...tenant,
          property: transformJoin(tenant.property),
          room: transformJoin(tenant.room),
        }))
        setTenants(transformedTenants)

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

  const doSubmit = async () => {
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
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

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

      const result = await recordPayment(
        workflowInput,
        user.id,
        "owner",
        user.id
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

  const selectedBill = bills.find((b) => b.id === formData.bill_id) ?? null
  const step1Complete = !!formData.tenant_id
  const step2Complete = !!formData.bill_id
  const noBills = step1Complete && bills.length === 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WorkflowHeader
        title="Record Payment"
        subtitle="Record a payment from a tenant"
        icon={CreditCard}
        onBack={() => router.push(backHref)}
        backLabel="Back to Payments"
      />

      <WorkflowStepper steps={STEPS} currentStep={currentStep} />

      {/* Step 1 — Select Tenant */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Tenant"
        description="Choose the tenant making this payment"
        icon={User}
        currentStep={currentStep}
        onEdit={() => {
          setCurrentStep(1)
          setFormData((prev) => ({ ...prev, tenant_id: "", bill_id: "" }))
          setSelectedTenant(null)
          setBills([])
        }}
        completedSummary={
          selectedTenant
            ? `${selectedTenant.name} · ${selectedTenant.property?.name ?? ""}${selectedTenant.room ? ` Rm ${selectedTenant.room.room_number}` : ""}`
            : undefined
        }
      >
        <div className="space-y-4">
          <FormField label="Tenant" required>
            <Combobox
              options={tenants.map((t): ComboboxOption => ({
                value: t.id,
                label: t.name,
                description: `${t.property?.name ?? "Unknown Property"}, Room ${t.room?.room_number ?? "N/A"}`,
              }))}
              value={formData.tenant_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, tenant_id: value, bill_id: "" }))
              }
              placeholder="Search tenant..."
              searchPlaceholder="Type tenant name..."
              disabled={loading}
            />
          </FormField>

          {selectedTenant && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Rent</span>
                <span className="font-medium">{formatCurrency(selectedTenant.monthly_rent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{selectedTenant.phone}</span>
              </div>
              {selectedTenant.property && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property / Room</span>
                  <span>
                    {selectedTenant.property.name}
                    {selectedTenant.room ? ` · Rm ${selectedTenant.room.room_number}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!formData.tenant_id}
            onClick={() => setCurrentStep(2)}
          >
            Save &amp; Continue
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 2 — Select Bill */}
      <WorkflowStepCard
        stepNum={2}
        title="Select Bill"
        description="Every payment must be linked to a bill"
        icon={FileText}
        currentStep={currentStep}
        onEdit={() => {
          setCurrentStep(2)
          setFormData((prev) => ({ ...prev, bill_id: "" }))
        }}
        completedSummary={
          selectedBill
            ? `${selectedBill.bill_number} · ${selectedBill.for_month} · ${formatCurrency(selectedBill.balance_due)} due`
            : undefined
        }
      >
        <div className="space-y-4">
          {noBills ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive text-sm">No Pending Bills</p>
                <p className="text-sm text-destructive/80 mt-1">
                  This tenant has no pending bills. Create a bill before recording a payment.
                </p>
                <Link href={`/bills/new?tenant=${selectedTenant?.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Bill First
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {bills.map((bill) => {
                const isSelected = formData.bill_id === bill.id
                return (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, bill_id: bill.id }))}
                    className={cn(
                      "w-full text-left rounded-lg border-2 p-4 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                          isSelected ? "border-primary" : "border-border"
                        )}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{bill.bill_number}</span>
                          <StatusBadge status={bill.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{bill.for_month}</span>
                          <span>·</span>
                          <span className="font-medium text-foreground">
                            Balance Due: {formatCurrency(bill.balance_due)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!noBills && (
            <Button
              className="w-full"
              disabled={!formData.bill_id}
              onClick={() => setCurrentStep(3)}
            >
              Save &amp; Continue
              <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>
      </WorkflowStepCard>

      {/* Step 3 — Payment Details */}
      <WorkflowStepCard
        stepNum={3}
        title="Payment Details"
        description="Enter the amount and payment information"
        icon={IndianRupee}
        currentStep={currentStep}
      >
        <div className="space-y-4">
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
              <DatePicker
                id="payment_date"
                value={formData.payment_date}
                onChange={(val) => setFormData((prev) => ({ ...prev, payment_date: val }))}
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
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about this payment"
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="min-h-[80px]"
            />
          </FormField>

          {/* Summary */}
          {step1Complete && step2Complete && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Payment Summary
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant</span>
                <span className="font-medium">{selectedTenant?.name}</span>
              </div>
              {selectedBill && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill</span>
                  <span className="font-medium">
                    {selectedBill.bill_number} · {selectedBill.for_month}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-primary">
                  {formData.amount ? formatCurrency(parseFloat(formData.amount)) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">
                  {PAYMENT_METHODS[formData.payment_method] ?? formData.payment_method}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href="/payments" className="flex-shrink-0">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button
              className="flex-1"
              disabled={loading || !step1Complete || !step2Complete || !formData.amount}
              onClick={doSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </WorkflowStepCard>
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
