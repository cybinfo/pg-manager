"use client"

import Link from "next/link"
import { Wallet, User, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import { PageSkeleton } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import { DetailHero, DetailSection } from "@/components/ui"
import { formatCurrency } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { brandGradient } from "@/lib/design-tokens"
import { REFUND_TYPE_OPTIONS, REFUND_PAYMENT_MODE_OPTIONS } from "@/lib/status"
import { useRefundCreateForm } from "@/lib/hooks/forms/useRefundCreateForm"

export default function NewRefundPage() {
  return (
    <PermissionGuard permission="payments.create">
      <NewRefundContent />
    </PermissionGuard>
  )
}

function NewRefundContent() {
  const {
    loading,
    submitting,
    tenants,
    selectedTenant,
    exitClearance,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    tenantId,
  } = useRefundCreateForm()

  if (loading) return <PageSkeleton variant="form" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Record Refund"
        subtitle="Record a new refund payment to tenant"
        backHref={backHref}
        backLabel="All Refunds"
        icon={Wallet}
        breadcrumbs={[
          { label: "Refunds", href: "/refunds" },
          { label: "Record Refund" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Selection */}
        <DetailSection title="Select Tenant" icon={User}>
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
            <div className="mt-4 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar
                name={selectedTenant.name}
                src={selectedTenant.photo_url}
                size="lg"
                className={`${brandGradient.solid} text-white`}
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
          )}
        </DetailSection>

        {/* Refund Details */}
        <DetailSection title="Refund Details" description="Amount, type and payment information" icon={Wallet}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Refund Type" required>
                <Select
                  value={formData.refund_type}
                  onChange={(e) => setFormData({ ...formData, refund_type: e.target.value })}
                  options={REFUND_TYPE_OPTIONS}
                />
              </FormField>

              <FormField label="Amount" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
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
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Mode" required>
                <Select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  options={REFUND_PAYMENT_MODE_OPTIONS}
                />
              </FormField>

              <FormField label="Reference Number">
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Transaction ID / UPI Ref / Cheque No."
                />
              </FormField>
            </div>

            <FormField label="Refund Date" hint="Leave empty to mark as pending. Enter a date to mark as completed.">
              <DatePicker
                value={formData.refund_date}
                onChange={(val) => setFormData((prev) => ({ ...prev, refund_date: val }))}
              />
            </FormField>

            <FormField label="Reason">
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Security deposit refund after checkout"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                className="min-h-[80px]"
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Summary */}
        {(formData.amount || exitClearance) && (
          <DetailSection title="Summary" icon={Receipt}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Refund Amount</span>
                <span className="text-lg font-bold text-success">
                  {formData.amount ? formatCurrency(parseFloat(formData.amount)) : "₹0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{formData.refund_type.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mode</span>
                <span className="capitalize">{formData.payment_mode.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className={formData.refund_date ? "text-success font-medium" : "text-warning font-medium"}>
                  {formData.refund_date ? "Completed" : "Pending"}
                </span>
              </div>
              {exitClearance && (
                <div className="pt-3 mt-3 border-t space-y-1">
                  <p className="text-xs text-muted-foreground mb-1">From Exit Clearance</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Amount</span>
                    <span>{formatCurrency(exitClearance.total_refundable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Settlement</span>
                    <span className={exitClearance.final_amount < 0 ? "text-success" : "text-destructive"}>
                      {exitClearance.final_amount < 0 ? "Refund " : "Due "}
                      {formatCurrency(Math.abs(exitClearance.final_amount))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/refunds">
            <Button type="button" variant="outline" disabled={submitting}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting || !formData.tenant_id || !formData.amount}>
            {submitting ? "Saving..." : "Record Refund"}
          </Button>
        </div>
      </form>
    </div>
  )
}
