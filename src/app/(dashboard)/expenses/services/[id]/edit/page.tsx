"use client"

import { Hammer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useExpenseServiceEdit } from "@/lib/hooks/forms/useExpenseServiceEdit"
import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { TDS_SECTION_SERVICE_OPTIONS as TDS_SECTION_OPTIONS } from "@/lib/constants/form-options"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"

import type { PaymentMode } from "@/types/expense-enhanced.types"

export default function EditServicePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditServicePaymentContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditServicePaymentContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const {
    id,
    backHref,
    loading,
    loadingData,
    payment,
    formData,
    setFormData,
    providers,
    categories,
    handleProviderSelect,
    handleTdsSectionChange,
    handleSubmit,
  } = useExpenseServiceEdit(params)

  if (loadingData) {
    return <PageLoading />
  }

  if (!payment) {
    return <NotFoundState title="Service not found" backHref="/expenses/services" backLabel="All Services" />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="Edit Service Payment"
        subtitle="Update payment details"
        backHref={backHref}
        backLabel="All Services"
        icon={Hammer}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Services", href:"/expenses/services"}, {label:"Edit Service"}]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Edit Service Payment" description="Update payment details" icon={Hammer}>
          {/* Provider & Category */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Provider Details</h3>

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
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                options={[
                  { value: "", label: "Select category" },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.name_hi ? `${c.name} (${c.name_hi})` : c.name,
                  })),
                ]}
              />
            </FormField>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Service Details</h3>

            <FormField label="Service Date" required>
              <DatePicker
                value={formData.service_date}
                onChange={(val) => setFormData((prev) => ({ ...prev, service_date: val }))}
                placeholder="Pick a date"
              />
            </FormField>

            <FormField label="Description" required>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What work was done?"
                rows={2}
              />
            </FormField>

            <FormField label="Warranty (months)">
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
          </div>

          {/* Amount & TDS */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Amount & TDS</h3>

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

            {/* TDS Settings */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tds_applicable"
                  checked={formData.tds_applicable as boolean}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, tds_applicable: checked === true }))
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
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Payment Details</h3>

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

              <FormField label="Payment Date">
                <DatePicker
                  value={formData.payment_date || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, payment_date: val }))}
                  placeholder="Pick a date"
                />
              </FormField>
            </div>

            <FormField label="Reference Number">
              <Input
                value={formData.payment_reference || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))
                }
                placeholder="Transaction ID"
              />
            </FormField>
          </div>

          {/* Notes */}
          <FormField label="Notes">
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
            />
          </FormField>
        </DetailSection>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/expenses/services/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
