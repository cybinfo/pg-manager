"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, FormField } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"
import {
  LogOut,
  Loader2,
  User,
  Calendar,
  IndianRupee,
  AlertCircle,
  Plus,
  Trash2,
  Bell
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { Textarea } from "@/components/ui/textarea"
import { useExitClearanceCreateForm } from "@/lib/hooks/forms/useExitClearanceCreateForm"

function InitiateCheckoutForm() {
  const {
    loading,
    loadingData,
    tenants,
    selectedTenant,
    configuredNoticePeriod,
    formData,
    setFormData,
    deductions,
    newDeduction,
    setNewDeduction,
    handleChange,
    addDeduction,
    removeDeduction,
    amounts,
    noticePeriodComparison,
    handleSubmit,
    backHref,
  } = useExitClearanceCreateForm()

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Initiate Checkout"
        subtitle="Start the exit clearance process"
        backHref={backHref}
        backLabel="Back to Exit Clearance"
        icon={LogOut}
        breadcrumbs={[
          { label: "Exit Clearance", href: "/exit-clearance" },
          { label: "Initiate Checkout" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Selection */}
        <DetailSection title="Select Tenant" description="Choose the tenant for checkout" icon={User}>
          <div className="space-y-4">
            <FormField label="Tenant" required>
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
                    label: `${tenant.name} - ${tenant.property?.name || "—"}, Room ${tenant.room?.room_number || "—"}`,
                  }))}
                />
              )}
            </FormField>

            {selectedTenant && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedTenant.name} src={selectedTenant.photo_url} size="lg" />
                  <div>
                    <p className="font-semibold">{selectedTenant.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTenant.phone}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTenant.property?.name || "—"}
                      {selectedTenant.room && ` • Room ${selectedTenant.room.room_number}`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>Rent: {formatCurrency(selectedTenant.monthly_rent)}/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Since: {formatDate(new Date(selectedTenant.check_in_date))}</span>
                  </div>
                </div>
                <p className="text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Security Deposit: </span>
                  <span className="font-medium">{formatCurrency(selectedTenant.room?.deposit_amount || 0)}</span>
                </p>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Dates */}
        <DetailSection title="Exit Details" description="Notice and exit dates" icon={Calendar}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Notice Given Date" required hint="When did the tenant give notice?">
                <DatePicker
                  id="notice_given_date"
                  value={formData.notice_given_date}
                  onChange={(val) => setFormData((prev) => ({ ...prev, notice_given_date: val }))}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Expected Exit Date" required hint="Last day of stay">
                <DatePicker
                  id="expected_exit_date"
                  value={formData.expected_exit_date}
                  onChange={(val) => setFormData((prev) => ({ ...prev, expected_exit_date: val }))}
                  disabled={loading}
                />
              </FormField>
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
                    <span className="font-medium">{formatDate(new Date(formData.notice_given_date))}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Exit Date:</span>
                    <span className="font-medium">{formatDate(new Date(formData.expected_exit_date))}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Required Notice:</span>
                    <span className="font-medium">{configuredNoticePeriod} days</span>
                  </div>
                </div>
              </div>
            )}

            <FormField label="Room Condition Notes">
              <Textarea
                id="room_condition_notes"
                name="room_condition_notes"
                placeholder="Note any damages or issues with the room..."
                value={formData.room_condition_notes}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="resize-none"
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Deductions */}
        <DetailSection title="Deductions" description="Damages, cleaning, or other charges" icon={AlertCircle}>
          <div className="space-y-4">
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
          </div>
        </DetailSection>

        {/* Settlement Summary */}
        {selectedTenant && (
          <DetailSection title="Settlement Summary" description="Calculated amounts" icon={IndianRupee}>
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
          </DetailSection>
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
