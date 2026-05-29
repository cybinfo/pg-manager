/**
 * New Service Payment Page — 3-step guided workflow
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Hammer, Building2, CreditCard, ClipboardCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"

import { getTodayISO } from "@/lib/date-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type {
  ServiceProvider,
  ServiceCategory,
  ServicePaymentFormData,
  TdsSection,
  PaymentMode,
} from "@/types/expense-enhanced.types"
import { TDS_SECTION_SERVICE_OPTIONS as TDS_SECTION_OPTIONS, TDS_RATES } from "@/lib/constants/form-options"
import { logger } from "@/lib/logger"

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Provider & Category", icon: Building2 },
  { id: 2, label: "Service & Payment", icon: CreditCard },
  { id: 3, label: "Confirm & Save", icon: ClipboardCheck },
]

export default function NewServicePaymentPage() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  const [formData, setFormData] = useState<ServicePaymentFormData>({
    provider_id: "",
    provider_name: "",
    category_id: "",
    category_name: "",
    service_date: getTodayISO(),
    description: "",
    gross_amount: 0,
    tds_applicable: false,
    tds_section: undefined,
    tds_rate: undefined,
    tds_amount: undefined,
    net_amount: undefined,
    payment_mode: undefined,
    payment_reference: "",
    payment_date: getTodayISO(),
    warranty_months: 0,
    notes: "",
  })

  // Load providers and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: providersData } = await supabase
        .from("service_providers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProviders(providersData || [])

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])
      setLoadingData(false)
    }

    loadData()
  }, [workspaceId])

  // Handle provider selection
  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        provider_id: providerId,
        provider_name: provider.name,
        category_id: provider.category_id || prev.category_id,
        tds_applicable: provider.tds_applicable,
        tds_section: provider.tds_section || undefined,
        tds_rate: provider.tds_rate || undefined,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        provider_id: "",
      }))
    }
  }

  // Calculate TDS when amount or rate changes
  useEffect(() => {
    if (formData.tds_applicable && formData.gross_amount > 0 && formData.tds_rate) {
      const tdsAmount = (formData.gross_amount * formData.tds_rate) / 100
      const netAmount = formData.gross_amount - tdsAmount
      setFormData((prev) => ({
        ...prev,
        tds_amount: tdsAmount,
        net_amount: netAmount,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        tds_amount: 0,
        net_amount: prev.gross_amount,
      }))
    }
  }, [formData.gross_amount, formData.tds_applicable, formData.tds_rate])

  // Handle TDS section change
  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || undefined,
    }))
  }

  // Calculate warranty expiry
  const getWarrantyExpiry = () => {
    if (formData.warranty_months && formData.warranty_months > 0 && formData.service_date) {
      const date = new Date(formData.service_date)
      date.setMonth(date.getMonth() + formData.warranty_months)
      return date.toISOString().split("T")[0]
    }
    return null
  }

  // Step completion guards
  const step1Complete = !!formData.service_date
  const step2Complete = formData.description.trim().length > 0 && formData.gross_amount > 0

  // Derived display helpers
  const selectedCategory = categories.find((c) => c.id === formData.category_id)
  const categoryLabel = selectedCategory
    ? selectedCategory.name_hi
      ? `${selectedCategory.name} (${selectedCategory.name_hi})`
      : selectedCategory.name
    : null

  const doSubmit = async () => {
    if (!formData.provider_name.trim()) {
      showError("Provider name is required")
      return
    }

    if (!formData.description.trim()) {
      showError("Service description is required")
      return
    }

    if (formData.gross_amount <= 0) {
      showError("Amount must be greater than 0")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const warrantyExpiry = getWarrantyExpiry()

      const paymentData = withCreatedBy(
        {
          workspace_id: workspaceId,
          provider_id: formData.provider_id || null,
          provider_name: formData.provider_name.trim(),
          category_id: formData.category_id || null,
          category_name:
            categories.find((c) => c.id === formData.category_id)?.name ||
            formData.category_name ||
            null,
          service_date: formData.service_date,
          description: formData.description.trim(),
          gross_amount: formData.gross_amount,
          tds_applicable: formData.tds_applicable,
          tds_section: formData.tds_applicable ? formData.tds_section : null,
          tds_rate: formData.tds_applicable ? formData.tds_rate : null,
          tds_amount: formData.tds_amount || 0,
          net_amount: formData.net_amount || formData.gross_amount,
          payment_mode: formData.payment_mode || null,
          payment_reference: formData.payment_reference?.trim() || null,
          payment_date: formData.payment_date || null,
          warranty_months: formData.warranty_months || 0,
          warranty_expiry: warrantyExpiry,
          notes: formData.notes?.trim() || null,
          photos: [],
        },
        user.id
      )

      const { data, error } = await supabase
        .from("service_payments")
        .insert(paymentData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Service payment recorded")
      router.push(`/expenses/services/${data.id}`)
    } catch (error) {
      logger.error("Failed to create service payment:", { detail: error })
      showError("Failed to create service payment")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.create">
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
                  <input
                    type="checkbox"
                    id="tds_applicable"
                    checked={formData.tds_applicable}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tds_applicable: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="tds_applicable" className="text-sm font-medium">
                    TDS Applicable
                  </label>
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
      </PermissionGuard>
    </ModuleGuard>
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
