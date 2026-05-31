"use client"

import { Hammer, Building2, CreditCard, ClipboardCheck } from "lucide-react"
import { useExpenseServiceCreateForm } from "@/lib/hooks/forms/useExpenseServiceCreateForm"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"

import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type { PaymentMode } from "@/types/expense-enhanced.types"
import { TDS_SECTION_SERVICE_OPTIONS as TDS_SECTION_OPTIONS } from "@/lib/constants/form-options"

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Provider & Category", icon: Building2 },
  { id: 2, label: "Service & Payment", icon: CreditCard },
  { id: 3, label: "Confirm & Save", icon: ClipboardCheck },
]

export default function NewServicePaymentPage() {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.create">
        <NewServicePaymentContent />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function NewServicePaymentContent() {
  const {
    backHref,
    router,
    currentStep,
    setCurrentStep,
    loading,
    loadingData,
    providers,
    categories,
    formData,
    setFormData,
    handleProviderSelect,
    handleTdsSectionChange,
    step1Complete,
    step2Complete,
    categoryLabel,
    doSubmit,
  } = useExpenseServiceCreateForm()

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
          {/* Header */}
          <WorkflowHeader
            title="New Service Payment"
            subtitle="Record a maintenance, repair, or service expense"
            icon={Hammer}
            iconClassName="bg-success/10"
            onBack={() => router.push(backHref)}
            backLabel="Back to Services"
          />

          {/* Step indicator */}
          <WorkflowStepper steps={STEPS} currentStep={currentStep} />

          {/* ── Step 1: Provider & Category ──────────────────────────────── */}
          <WorkflowStepCard
            stepNum={1}
            title="Provider & Category"
            description="Who did the work, and what type of service?"
            icon={Building2}
            currentStep={currentStep}
            onEdit={() => setCurrentStep(1)}
            completedSummary={
              (formData.provider_name || "No provider") +
              (categoryLabel ? ` · ${categoryLabel}` : "") +
              ` · ${formData.service_date}`
            }
          >
            <div className="space-y-4">
              <FormField label="Service Provider">
                <Select
                  value={formData.provider_id || ""}
                  onChange={(e) => handleProviderSelect(e.target.value)}
                  options={[
                    { value: "", label: "Select provider or enter name below" },
                    ...providers.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
                {!formData.provider_id && (
                  <Input
                    value={formData.provider_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, provider_name: e.target.value }))
                    }
                    placeholder="Or enter provider name"
                    className="mt-2"
                  />
                )}
              </FormField>

              <FormField label="Category">
                <Select
                  value={formData.category_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                  }
                  options={[
                    { value: "", label: "Select category" },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: c.name_hi ? `${c.name} (${c.name_hi})` : c.name,
                    })),
                  ]}
                />
              </FormField>

              <FormField label="Service Date" required>
                <DatePicker
                  value={formData.service_date}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, service_date: val }))
                  }
                  placeholder="Pick a date"
                />
              </FormField>

              <Button
                className="w-full"
                onClick={() => setCurrentStep(2)}
                disabled={!step1Complete}
              >
                Continue
              </Button>
            </div>
          </WorkflowStepCard>

          {/* ── Step 2: Service & Payment ─────────────────────────────────── */}
          <WorkflowStepCard
            stepNum={2}
            title="Service & Payment"
            description="Describe the work done and record the payment."
            icon={CreditCard}
            currentStep={currentStep}
            onEdit={() => setCurrentStep(2)}
            completedSummary={
              formData.description
                ? `${formData.description.slice(0, 40)}${formData.description.length > 40 ? "…" : ""} · ₹${formData.gross_amount}`
                : undefined
            }
          >
            <div className="space-y-4">
              <FormField label="Description" required hint="What work was done?">
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="e.g., Fixed leaking tap in Room 101, replaced washer"
                  rows={2}
                />
              </FormField>

              <FormField label="Gross Amount" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.gross_amount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      gross_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </FormField>

              {/* TDS */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tds_applicable"
                    checked={formData.tds_applicable as boolean}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        tds_applicable: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="tds_applicable" className="text-sm font-medium cursor-pointer">
                    TDS Applicable
                  </Label>
                </div>

                {formData.tds_applicable && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="TDS Section">
                        <Select
                          value={formData.tds_section || ""}
                          onChange={(e) => handleTdsSectionChange(e.target.value)}
                          options={[
                            { value: "", label: "Select section" },
                            ...TDS_SECTION_OPTIONS,
                          ]}
                        />
                      </FormField>

                      <FormField label="TDS Rate (%)">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.tds_rate || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              tds_rate: parseFloat(e.target.value) || undefined,
                            }))
                          }
                          placeholder="0.0"
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">TDS Deducted</div>
                        <div className="font-medium">
                          <Currency amount={formData.tds_amount || 0} />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Net Payable</div>
                        <div className="font-bold text-success">
                          <Currency amount={formData.net_amount || formData.gross_amount} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Payment mode + reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Payment Mode">
                  <Select
                    value={formData.payment_mode || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_mode: e.target.value as PaymentMode,
                      }))
                    }
                    options={[
                      { value: "", label: "Select mode" },
                      ...PAYMENT_MODE_OPTIONS,
                    ]}
                  />
                </FormField>

                <FormField label="Reference Number">
                  <Input
                    value={formData.payment_reference || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_reference: e.target.value,
                      }))
                    }
                    placeholder="Transaction ID"
                  />
                </FormField>
              </div>

              <FormField label="Warranty (months)" hint="0 if no warranty">
                <Input
                  type="number"
                  min="0"
                  value={formData.warranty_months || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      warranty_months: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </FormField>

              <Button
                className="w-full"
                onClick={() => setCurrentStep(3)}
                disabled={!step2Complete}
              >
                Continue
              </Button>
            </div>
          </WorkflowStepCard>

          {/* ── Step 3: Confirm & Save ────────────────────────────────────── */}
          <WorkflowStepCard
            stepNum={3}
            title="Confirm & Save"
            description="Review the details and record the service payment."
            icon={ClipboardCheck}
            currentStep={currentStep}
          >
            <div className="space-y-4">
              {/* Summary table */}
              <div className="rounded-lg border divide-y text-sm">
                <SummaryRow label="Provider" value={formData.provider_name || "—"} />
                <SummaryRow label="Category" value={categoryLabel || "—"} />
                <SummaryRow label="Service Date" value={formData.service_date} />
                <SummaryRow label="Description" value={formData.description || "—"} />
                <SummaryRow
                  label="Gross Amount"
                  value={<Currency amount={formData.gross_amount} />}
                />
                {formData.tds_applicable && (
                  <>
                    <SummaryRow
                      label="TDS"
                      value={
                        <span className="text-destructive">
                          − <Currency amount={formData.tds_amount || 0} />
                          {formData.tds_section && (
                            <span className="text-muted-foreground ml-1">
                              ({formData.tds_section} @ {formData.tds_rate}%)
                            </span>
                          )}
                        </span>
                      }
                    />
                    <SummaryRow
                      label="Net Payable"
                      value={
                        <span className="font-bold text-success">
                          <Currency amount={formData.net_amount || formData.gross_amount} />
                        </span>
                      }
                    />
                  </>
                )}
                {(formData.warranty_months ?? 0) > 0 && (
                  <SummaryRow label="Warranty" value={`${formData.warranty_months} months`} />
                )}
                {formData.payment_mode && (
                  <SummaryRow label="Payment Mode" value={formData.payment_mode} />
                )}
                {formData.payment_reference && (
                  <SummaryRow label="Reference" value={formData.payment_reference} />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep(2)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={doSubmit} disabled={loading}>
                  {loading ? "Saving..." : "Record Service Payment"}
                </Button>
              </div>
            </div>
          </WorkflowStepCard>
    </div>
  )
}

// ─── Summary row helper ───────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
