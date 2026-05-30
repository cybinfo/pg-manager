"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
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
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency, formatMonthYear, formatDate } from "@/lib/format"
import { createBillWithCharges } from "@/lib/services/bills"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { transformJoin } from "@/lib/supabase/transforms"
import { DatePicker } from "@/components/ui/date-picker"
import { getTodayISO, parseMonthIndex } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { calculateProRataAmount, getProRataBreakdown } from "@/lib/billing/pro-rata"
import { useFeatures } from "@/lib/features/use-features"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"

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

interface PendingCharge {
  id: string
  amount: number
  for_period: string
  charge_type: {
    name: string
  } | null
}

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Tenant", icon: User },
  { id: 2, label: "Bill Details", icon: Calendar },
  { id: 3, label: "Review & Create", icon: ClipboardList },
]

function NewBillContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/bills" })
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenant = searchParams.get("tenant_id") || searchParams.get("tenant")

  const { isFeatureEnabled } = useFeatures()
  const proRataEnabled = isFeatureEnabled("billing", "proRataBilling")

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingCharges, setLoadingCharges] = useState(false)

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [selectedChargeTypes, setSelectedChargeTypes] = useState<string[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([])
  const [billingCycleMode, setBillingCycleMode] = useState<"calendar_month" | "checkin_anniversary">("calendar_month")

  const [proRata, setProRata] = useState({
    enabled: false,
    joinDate: "",
  })

  const [formData, setFormData] = useState({
    for_month: formatMonthYear(new Date()),
    bill_date: getTodayISO(),
    due_date: "",
    previous_balance: 0,
    discount_amount: 0,
    notes: "",
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Set default due date (5 days from bill date)
  useEffect(() => {
    const billDate = new Date(formData.bill_date)
    const dueDate = new Date(billDate)
    dueDate.setDate(dueDate.getDate() + 5)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({
      ...prev,
      due_date: dueDate.toISOString().split("T")[0],
    }))
  }, [formData.bill_date])

  // Fetch tenants and charge types
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      const supabase = createClient()
      const [tenantsRes, chargeTypesRes, configRes] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            id,
            name,
            phone,
            monthly_rent,
            property_id,
            check_in_date,
            property:properties(name),
            room:rooms(room_number)
          `)
          .eq("owner_id", user.id)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("charge_types")
          .select("*")
          .eq("owner_id", user.id)
          .eq("is_enabled", true)
          .order("display_order"),
        supabase
          .from("owner_config")
          .select("billing_cycle_mode")
          .eq("owner_id", user.id)
          .single(),
      ])

      if (tenantsRes.error) {
        logger.error("Error fetching tenants:", { detail: tenantsRes.error })
        showError("Failed to load tenants")
        return
      }

      const transformedTenants: Tenant[] = (tenantsRes.data || []).map((t: Record<string, unknown>) => ({
        ...t,
        property: transformJoin(t.property),
        room: transformJoin(t.room),
      })) as Tenant[]

      setTenants(transformedTenants)

      if (chargeTypesRes.data) {
        const chargeTypesData = chargeTypesRes.data as unknown as ChargeType[]
        setChargeTypes(chargeTypesData)
        const rentType = chargeTypesData.find((ct: ChargeType) => ct.code === "rent")
        if (rentType) {
          setSelectedChargeTypes([rentType.id])
        }
      }

      const configData = configRes?.data as { billing_cycle_mode?: string } | null
      if (configData?.billing_cycle_mode) {
        setBillingCycleMode(configData.billing_cycle_mode as "calendar_month" | "checkin_anniversary")
      }

      setLoadingTenants(false)

      if (preselectedTenant) {
        setSelectedTenant(preselectedTenant)
      }
    }

    fetchData()
  }, [router, preselectedTenant, user])

  // Build line items when tenant or selected charge types change
  useEffect(() => {
    const buildLineItems = async () => {
      if (!selectedTenant) {
        setPendingCharges([])
        setLineItems([])
        return
      }

      setLoadingCharges(true)
      const supabase = createClient()

      const { data: charges, error } = await supabase
        .from("charges")
        .select(`
          id,
          amount,
          for_period,
          charge_type:charge_types(name)
        `)
        .eq("tenant_id", selectedTenant)
        .is("bill_id", null)
        .in("status", ["pending", "partial"])
        .order("due_date")

      if (error) {
        logger.error("Error fetching charges:", { detail: error })
      }

      const transformedCharges: PendingCharge[] = (charges || []).map((c: Record<string, unknown>) => ({
        ...c,
        charge_type: transformJoin(c.charge_type),
      })) as PendingCharge[]

      setPendingCharges(transformedCharges)

      const tenant = tenants.find((t) => t.id === selectedTenant)
      const items: LineItem[] = []

      selectedChargeTypes.forEach((chargeTypeId) => {
        const chargeType = chargeTypes.find((ct) => ct.id === chargeTypeId)
        if (!chargeType) return

        let amount = 0
        const description = `${chargeType.name} - ${formData.for_month}`

        if (chargeType.code === "rent" && tenant?.monthly_rent) {
          amount = tenant.monthly_rent
        } else if (chargeType.calculation_config?.default_amount) {
          amount = chargeType.calculation_config.default_amount
        }

        items.push({
          id: crypto.randomUUID(),
          type: chargeType.name,
          description,
          amount,
        })
      })

      transformedCharges.forEach((charge) => {
        const alreadyAdded = items.some((item) => item.type === charge.charge_type?.name)
        if (!alreadyAdded) {
          items.push({
            id: charge.id,
            type: charge.charge_type?.name || "Charge",
            description: charge.for_period || "Pending charge",
            amount: Number(charge.amount),
          })
        }
      })

      setLineItems(items)
      setLoadingCharges(false)
    }

    buildLineItems()
  }, [selectedTenant, selectedChargeTypes, tenants, chargeTypes, formData.for_month])

  // Update bill date based on billing cycle mode and tenant's check-in date
  useEffect(() => {
    if (selectedTenant) {
      const tenant = tenants.find((t) => t.id === selectedTenant)
      const now = new Date()
      let billDate: Date

      if (billingCycleMode === "checkin_anniversary" && tenant?.check_in_date) {
        const checkInDay = new Date(tenant.check_in_date).getDate()
        billDate = new Date(now.getFullYear(), now.getMonth(), checkInDay)
        if (billDate > now) {
          billDate.setMonth(billDate.getMonth() - 1)
        }
      } else {
        billDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        bill_date: billDate.toISOString().split("T")[0],
      }))
    }
  }, [selectedTenant, tenants, billingCycleMode])

  const toggleChargeType = (chargeTypeId: string) => {
    setSelectedChargeTypes((prev) =>
      prev.includes(chargeTypeId)
        ? prev.filter((id) => id !== chargeTypeId)
        : [...prev, chargeTypeId]
    )
  }

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        type: "",
        description: "",
        amount: 0,
      },
    ])
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const getProRataRentAmount = (): number | null => {
    if (!proRata.enabled || !proRata.joinDate || !formData.for_month) return null
    const tenant = tenants.find((t) => t.id === selectedTenant)
    if (!tenant?.monthly_rent) return null
    const [monthName, yearStr] = formData.for_month.split(" ")
    const monthIndex = parseMonthIndex(monthName) + 1
    const billingMonth = `${yearStr}-${String(monthIndex).padStart(2, "0")}`
    const joinDate = new Date(proRata.joinDate)
    return calculateProRataAmount(tenant.monthly_rent, joinDate, billingMonth)
  }

  const calculateTotals = () => {
    const proRataAmount = getProRataRentAmount()
    const effectiveLineItems = lineItems.map((item) => {
      if (proRata.enabled && proRataAmount !== null && item.type.toLowerCase().includes("rent")) {
        return { ...item, amount: proRataAmount }
      }
      return item
    })
    const subtotal = effectiveLineItems.reduce((sum, item) => sum + Number(item.amount), 0)
    const total = subtotal + Number(formData.previous_balance) - Number(formData.discount_amount)
    return { subtotal, total, proRataAmount }
  }

  const doSubmit = async () => {
    if (!selectedTenant) {
      showError("Please select a tenant")
      return
    }

    if (lineItems.length === 0) {
      showError("Please add at least one line item")
      return
    }

    setLoading(true)

    try {
      if (!user) {
        showError("Session expired")
        router.push("/login")
        return
      }

      const tenant = tenants.find((t) => t.id === selectedTenant)
      const { subtotal, total, proRataAmount } = calculateTotals()

      const effectiveLineItems = lineItems.map((item) => {
        if (proRata.enabled && proRataAmount !== null && item.type.toLowerCase().includes("rent")) {
          return { ...item, amount: proRataAmount }
        }
        return item
      })

      const { billId } = await createBillWithCharges({
        ownerId: user.id,
        tenantId: selectedTenant,
        propertyId: tenant?.property_id,
        forMonth: formData.for_month,
        billDate: formData.bill_date,
        dueDate: formData.due_date,
        subtotal,
        discountAmount: Number(formData.discount_amount),
        previousBalance: Number(formData.previous_balance),
        totalAmount: total,
        lineItems: effectiveLineItems,
        notes: formData.notes || null,
        pendingChargeIds: pendingCharges.map((c) => c.id),
        userId: user.id,
      })

      showSuccess("Bill generated successfully!")
      router.push(`/bills/${billId}`)
    } catch (error) {
      handleClientError(error, "Generating bill")
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, total, proRataAmount } = calculateTotals()

  const step1Complete = !!selectedTenant
  const step2Complete = !!formData.for_month && lineItems.length > 0

  const selectedTenantObj = tenants.find((t) => t.id === selectedTenant)

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
