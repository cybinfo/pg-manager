"use client"

import { ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useExpenseDailySpendEdit } from "@/lib/hooks/forms/useExpenseDailySpendEdit"
import { EXPENSE_DAILY_SPEND_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS, UNIT_OPTIONS } from "@/lib/status"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { Combobox } from "@/components/ui/combobox"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"

export default function EditDailySpendPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditDailySpendContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditDailySpendContent({
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
    entry,
    formData,
    setFormData,
    total,
    vendorOptions,
    productOptions,
    handleVendorSelect,
    handleProductSelect,
    handleSubmit,
  } = useExpenseDailySpendEdit(params)

  if (loadingData) {
    return <PageLoading />
  }

  if (!entry) {
    return <NotFoundState title="Entry not found" backHref="/expenses/daily-spend" backLabel="All Daily Spend" />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="Edit Entry"
        subtitle="Update expense details"
        backHref={backHref}
        backLabel="All Daily Spend"
        icon={ShoppingBag}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Daily Spend", href:"/expenses/daily-spend"}, {label:"Edit Entry"}]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Edit Entry" description="Update expense details" icon={ShoppingBag}>
          {/* Date */}
          <FormField label="Date" required>
            <DatePicker
              value={formData.spend_date}
              onChange={(val) => setFormData((prev) => ({ ...prev, spend_date: val }))}
              placeholder="Pick a date"
            />
          </FormField>

          {/* Product */}
          <FormField label="Item" required>
            <Combobox
              options={productOptions}
              value={formData.product_id}
              onValueChange={handleProductSelect}
              placeholder="Select item..."
              searchPlaceholder="Search items..."
              emptyText="No items found. Add products in Products Master."
              clearable
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <FormField label="Quantity" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))
                }
              />
            </FormField>

            {/* Unit */}
            <FormField label="Unit">
              <Select
                value={formData.unit}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                options={UNIT_OPTIONS}
              />
            </FormField>

            {/* Rate */}
            <FormField label="Rate (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.rate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))
                }
              />
            </FormField>
          </div>

          {/* Total Display */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold"><Currency amount={total} /></span>
            </div>
          </div>

          {/* Vendor */}
          <FormField label="Vendor/Shop Name">
            <Combobox
              options={vendorOptions}
              value={formData.vendor_id}
              onValueChange={handleVendorSelect}
              placeholder="Select vendor..."
              searchPlaceholder="Search vendors..."
              emptyText="No vendors found. Add vendors in Expenses → Vendors."
              clearable
            />
          </FormField>

          {/* Payment Mode */}
          <FormField label="Payment Mode">
            <Select
              value={formData.payment_mode}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_mode: e.target.value }))}
              options={PAYMENT_MODE_OPTIONS}
            />
          </FormField>

          {/* UPI Reference (conditional) */}
          {formData.payment_mode === "upi" && (
            <FormField label="UPI Reference Number">
              <Input
                value={formData.upi_ref_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, upi_ref_number: e.target.value }))
                }
                placeholder="e.g., 123456789012"
              />
            </FormField>
          )}

          {/* Notes */}
          <FormField label="Notes">
            <Textarea
              value={formData.notes}
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
            onClick={() => router.push(`/expenses/daily-spend/${id}`)}
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
