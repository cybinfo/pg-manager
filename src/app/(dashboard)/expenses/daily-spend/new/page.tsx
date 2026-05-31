"use client"

import { ShoppingBag, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useExpenseDailySpendCreate } from "@/lib/hooks/forms/useExpenseDailySpendCreate"
import { EXPENSE_DAILY_SPEND_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS, UNIT_OPTIONS } from "@/lib/status"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { DetailHero, DetailSection } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"
import { VendorSelector } from "@/components/expenses/vendor-selector"
import { ProductSelector } from "@/components/expenses/product-selector"

export default function NewDailySpendPage() {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.create">
        <NewDailySpendContent />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function NewDailySpendContent() {
  const router = useRouter()
  const {
    backHref,
    user,
    workspaceId,
    loading,
    loadingData,
    categories,
    spendDate,
    setSpendDate,
    vendorId,
    paymentMode,
    setPaymentMode,
    upiRefNumber,
    setUpiRefNumber,
    notes,
    setNotes,
    lineItems,
    grandTotal,
    handleVendorSelect,
    handleProductSelect,
    handleProductCreated,
    handleLineItemChange,
    addLineItem,
    removeLineItem,
    handleSubmit,
  } = useExpenseDailySpendCreate()

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="New Daily Spend"
        subtitle="Record kitchen and daily purchase expenses"
        backHref={backHref}
        backLabel="All Daily Spend"
        icon={ShoppingBag}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Daily Spend", href:"/expenses/daily-spend"}, {label:"Add Entry"}]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="New Daily Spend" description="Record kitchen and daily purchase expenses" icon={ShoppingBag}>
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Date" required>
              <DatePicker
                value={spendDate}
                onChange={(val) => setSpendDate(val)}
                placeholder="Pick a date"
              />
            </FormField>

            <FormField label="Vendor/Shop">
              <VendorSelector
                workspaceId={workspaceId || ""}
                userId={user?.id || ""}
                selectedVendorId={vendorId}
                onSelect={handleVendorSelect}
                allowQuickCreate
                compact
              />
            </FormField>

            <FormField label="Payment Mode">
              <Select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                options={PAYMENT_MODE_OPTIONS}
              />
            </FormField>
          </div>

          {/* UPI Reference (conditional) */}
          {paymentMode === "upi" && (
            <FormField label="UPI Reference Number">
              <Input
                value={upiRefNumber}
                onChange={(e) => setUpiRefNumber(e.target.value)}
                placeholder="e.g., 123456789012"
              />
            </FormField>
          )}

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg"
                >
                  {/* Product Select */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-muted-foreground">Product</label>
                    <ProductSelector
                      workspaceId={workspaceId || ""}
                      userId={user?.id || ""}
                      selectedProductId={item.product_id}
                      onSelect={(product) => handleProductSelect(index, product)}
                      onCreate={handleProductCreated}
                      categories={categories}
                      placeholder="Search products..."
                      allowQuickCreate
                      compact
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        handleLineItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <Select
                      value={item.unit}
                      onChange={(e) => handleLineItemChange(index, "unit", e.target.value)}
                      options={UNIT_OPTIONS}
                    />
                  </div>

                  {/* Rate */}
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Rate (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={item.rate || ""}
                      onChange={(e) =>
                        handleLineItemChange(index, "rate", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Total (readonly) */}
                  <div className="col-span-10 md:col-span-1">
                    <label className="text-xs text-muted-foreground">Total</label>
                    <div className="h-10 flex items-center font-medium">
                      <Currency amount={item.total} />
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="col-span-2 md:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length <= 1}
                      className="h-10 w-10"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Grand Total:</span>
                <span className="ml-2 text-xl font-bold">
                  <Currency amount={grandTotal} />
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <FormField label="Notes" hint="Optional remarks">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            onClick={() => router.push("/expenses/daily-spend")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : `Save ${lineItems.filter((i) => i.product_name).length} Item(s)`}
          </Button>
        </div>
      </form>
    </div>
  )
}
