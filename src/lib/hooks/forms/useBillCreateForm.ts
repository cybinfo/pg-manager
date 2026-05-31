"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatMonthYear } from "@/lib/format"
import { createBillWithCharges } from "@/lib/services/bills"
import { transformJoin } from "@/lib/supabase/transforms"
import { getTodayISO, parseMonthIndex } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"
import { calculateProRataAmount } from "@/lib/billing/pro-rata"
import { useFeatures } from "@/lib/features/use-features"

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

export function useBillCreateForm() {
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
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "",
        description: "",
        amount: 0,
      },
    ])
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
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

  return {
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
    pendingCharges,
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
  }
}
