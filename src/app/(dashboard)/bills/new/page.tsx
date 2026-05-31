"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-components"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  User,
  Calendar,
  IndianRupee,
  Check,
  ClipboardList,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency, formatDate } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { parseMonthIndex } from "@/lib/date-helpers"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getProRataBreakdown } from "@/lib/billing/pro-rata"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"
import { useBillCreateForm } from "@/lib/hooks/forms/useBillCreateForm"

interface Tenant {
  id: string
  name: string
  phone: string
  monthly_rent: number
  property_id: string
  check_in_date: string | null
  property: {
    name: string
  } | null
  room: {
    room_number: string
  } | null
}

interface ChargeType {
  id: string
  name: string
  code: string
  category: string
  is_enabled: boolean
  calculation_config: {
    default_amount?: number
    source?: string
  } | null
}

interface LineItem {
  id: string
  type: string
  description: string
  amount: number
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Tenant", icon: User },
  { id: 2, label: "Bill Details", icon: Calendar },
  { id: 3, label: "Review & Create", icon: ClipboardList },
]

function NewBillContent() {
  const router = useRouter()
  const {
    backHref,
    currentStep,
    setCurrentStep,
    loading,
    loadingTenants,
    loadingCharges,
    tenants,
    chargeTypes,
    selectedChargeTypes,
    selectedTenant,
    setSelectedTenant,
    billingCycleMode,
    proRata,
    setProRata,
    formData,
    setFormData,
    lineItems,
    proRataEnabled,
    toggleChargeType,
    addLineItem,
    updateLineItem,
    removeLineItem,
    doSubmit,
    subtotal,
    total,
    proRataAmount,
    step1Complete,
    step2Complete,
    selectedTenantObj,
  } = useBillCreateForm()

  if (loadingTenants) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WorkflowHeader
        title="Generate Bill"
        subtitle="Create a new bill for a tenant"
        icon={FileText}
        onBack={() => router.push(backHref)}
        backLabel="Back to Bills"
      />

      <WorkflowStepper steps={STEPS} currentStep={currentStep} />

      {/* Step 1: Select Tenant */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Tenant"
        description="Choose the tenant for this bill"
        icon={User}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(1)}
        completedSummary={
          selectedTenantObj
            ? `${selectedTenantObj.name} — ${selectedTenantObj.property?.name}, Room ${selectedTenantObj.room?.room_number}`
            : undefined
        }
      >
        <div className="space-y-4">
          <Combobox
            options={tenants.map((tenant): ComboboxOption => ({
              value: tenant.id,
              label: `${tenant.name} - ${tenant.property?.name} (Room ${tenant.room?.room_number})`,
            }))}
            value={selectedTenant}
            onValueChange={setSelectedTenant}
            placeholder="Search and select a tenant..."
            searchPlaceholder="Type to search tenants..."
          />

          {selectedTenantObj && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Property:</span>
                  <span className="ml-2 font-medium">{selectedTenantObj.property?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Room:</span>
                  <span className="ml-2 font-medium">{selectedTenantObj.room?.room_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedTenantObj.monthly_rent)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="ml-2 font-medium">{selectedTenantObj.phone}</span>
                </div>
                {selectedTenantObj.check_in_date && (
                  <div>
                    <span className="text-muted-foreground">Check-in:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedTenantObj.check_in_date)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!step1Complete}
            onClick={() => setCurrentStep(2)}
          >
            Save & Continue
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 2: Bill Details */}
      <WorkflowStepCard
        stepNum={2}
        title="Bill Details"
        description="Set billing period, charges, and amounts"
        icon={Calendar}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          step2Complete
            ? `${formData.for_month} · ${lineItems.length} charge${lineItems.length !== 1 ? "s" : ""} · ${formatCurrency(subtotal)}`
            : undefined
        }
      >
        <div className="space-y-6">
          {/* Billing period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="For Month" required>
              <Input
                value={formData.for_month}
                onChange={(e) => setFormData({ ...formData, for_month: e.target.value })}
                placeholder="January 2024"
                required
              />
            </FormField>
            <FormField
              label="Bill Date"
              required
              hint={
                billingCycleMode === "checkin_anniversary"
                  ? "Auto-set from tenant's check-in date"
                  : "Using calendar month (1st of month)"
              }
            >
              <DatePicker
                value={formData.bill_date}
                onChange={(val) => setFormData({ ...formData, bill_date: val })}
              />
            </FormField>
          </div>

          {/* Charge type selection */}
          <div>
            <p className="text-sm font-medium mb-2">Select Charges</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {chargeTypes.map((chargeType) => {
                const isSelected = selectedChargeTypes.includes(chargeType.id)
                return (
                  <button
                    key={chargeType.id}
                    type="button"
                    onClick={() => toggleChargeType(chargeType.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded flex items-center justify-center border-2 transition-colors",
                        isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{chargeType.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {chargeType.category.replace("_", " ")}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedChargeTypes.length === 0 && (
              <p className="text-sm text-warning mt-3">
                Please select at least one charge type to include in the bill.
              </p>
            )}
          </div>

          {/* Pro-rata */}
          {proRataEnabled && selectedTenant && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="prorata-toggle"
                  checked={proRata.enabled}
                  onCheckedChange={(checked) => setProRata((p) => ({ ...p, enabled: checked === true }))}
                />
                <Label htmlFor="prorata-toggle" className="text-sm font-medium cursor-pointer">
                  Apply pro-rata calculation for this bill
                </Label>
              </div>
              {proRata.enabled && (
                <div className="space-y-3">
                  <FormField label="Tenant Join Date" required>
                    <DatePicker
                      value={proRata.joinDate}
                      onChange={(val) => setProRata((p) => ({ ...p, joinDate: val }))}
                    />
                  </FormField>
                  {proRataAmount !== null && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                      {(() => {
                        const [monthName, yearStr] = formData.for_month.split(" ")
                        const monthIndex = parseMonthIndex(monthName) + 1
                        const billingMonth = `${yearStr}-${String(monthIndex).padStart(2, "0")}`
                        const { remainingDays, daysInMonth } = getProRataBreakdown(
                          new Date(proRata.joinDate),
                          billingMonth
                        )
                        return (
                          <span className="text-muted-foreground">
                            {remainingDays} days / {daysInMonth} days ×{" "}
                            {formatCurrency(selectedTenantObj?.monthly_rent || 0)} ={" "}
                            <strong className="text-primary">{formatCurrency(proRataAmount)}</strong>
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Line Items</p>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {loadingCharges ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : lineItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No line items yet. Add items or select a tenant to auto-populate.
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        placeholder="Type (e.g., Rent)"
                        value={item.type}
                        onChange={(e) => updateLineItem(item.id, "type", e.target.value)}
                      />
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)
                          }
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview total */}
            <div className="mt-4 pt-4 border-t space-y-1.5">
              {proRata.enabled && proRataAmount !== null && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Pro-Rata Rent Applied</span>
                  <span>{formatCurrency(proRataAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!step2Complete}
            onClick={() => setCurrentStep(3)}
          >
            Save & Continue
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 3: Review & Create */}
      <WorkflowStepCard
        stepNum={3}
        title="Review & Create"
        description="Confirm details and generate the bill"
        icon={ClipboardList}
        currentStep={currentStep}
      >
        <div className="space-y-5">
          {/* Tenant summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tenant</p>
            {selectedTenantObj && (
              <div className="text-sm space-y-1">
                <p className="font-medium">{selectedTenantObj.name}</p>
                <p className="text-muted-foreground">
                  {selectedTenantObj.property?.name} · Room {selectedTenantObj.room?.room_number}
                </p>
              </div>
            )}
          </div>

          {/* Period summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Period</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Month</span>
                <span className="font-medium">{formData.for_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bill Date</span>
                <span className="font-medium">{formData.bill_date}</span>
              </div>
            </div>
          </div>

          {/* Charges summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Charges</p>
            <div className="space-y-1.5">
              {lineItems.map((item) => {
                const effectiveAmount =
                  proRata.enabled && proRataAmount !== null && item.type.toLowerCase().includes("rent")
                    ? proRataAmount
                    : item.amount
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.type}
                      {item.description ? ` — ${item.description}` : ""}
                    </span>
                    <span>{formatCurrency(effectiveAmount)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Previous Balance (if any)">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.previous_balance}
                  onChange={(e) =>
                    setFormData({ ...formData, previous_balance: parseFloat(e.target.value) || 0 })
                  }
                  className="pl-9"
                  min="0"
                />
              </div>
            </FormField>
            <FormField label="Discount">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })
                  }
                  className="pl-9"
                  min="0"
                />
              </div>
            </FormField>
          </div>

          {/* Total */}
          <div className="pt-3 border-t space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {Number(formData.previous_balance) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previous Balance</span>
                <span>{formatCurrency(Number(formData.previous_balance))}</span>
              </div>
            )}
            {Number(formData.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(Number(formData.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total Amount</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notes */}
          <FormField label="Notes (Optional)">
            <Textarea
              className="min-h-[80px] resize-none"
              placeholder="Add any notes for this bill..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

          <Button
            className="w-full"
            disabled={loading || !selectedTenant || lineItems.length === 0}
            onClick={doSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Bill
              </>
            )}
          </Button>
        </div>
      </WorkflowStepCard>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function NewBillPage() {
  return (
    <PermissionGuard permission="bills.create">
      <Suspense fallback={<LoadingFallback />}>
        <NewBillContent />
      </Suspense>
    </PermissionGuard>
  )
}
