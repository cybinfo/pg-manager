"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Card, CardContent } from "@/components/ui/card"
import { WorkflowStepper, WorkflowStepCard, WorkflowHeader, WorkflowStepDef } from "@/components/ui/workflow"
import {
  ArrowLeft, CreditCard, Loader2, User, IndianRupee, FileText, AlertCircle, CheckCircle2,
} from "lucide-react"
import { FormField, Select } from "@/components/ui/form-components"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { PAYMENT_METHODS, PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { DatePicker } from "@/components/ui/date-picker"
import { usePaymentCreateForm } from "@/lib/hooks/forms/usePaymentCreateForm"

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Tenant", icon: User },
  { id: 2, label: "Select Bill", icon: FileText },
  { id: 3, label: "Payment Details", icon: IndianRupee },
]

function NewPaymentForm() {
  const router = useRouter()
  const {
    backHref,
    loading,
    loadingData,
    tenants,
    bills,
    selectedTenant,
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    handleChange,
    doSubmit,
    handleEditStep1,
    handleEditStep2,
  } = usePaymentCreateForm()

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
        onEdit={handleEditStep1}
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
            <div className="mt-2 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar name={selectedTenant.name} src={selectedTenant.photo_url} size="lg" />
              <div className="flex-1">
                <p className="font-semibold">{selectedTenant.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTenant.phone}</p>
                {selectedTenant.property && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTenant.property.name}
                    {selectedTenant.room && ` • Rm ${selectedTenant.room.room_number}`}
                  </p>
                )}
              </div>
              <p className="text-sm font-medium shrink-0">{formatCurrency(selectedTenant.monthly_rent)}/mo</p>
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
        onEdit={handleEditStep2}
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
