"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useFeatures } from "@/lib/features/use-features"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatMonthYear } from "@/lib/format"
import { getTodayISO } from "@/lib/date-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { recordPayment, PaymentRecordInput } from "@/lib/workflows/payment.workflow"
import { logger } from "@/lib/logger"

export interface Tenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  monthly_rent: number
  entity_id: string
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  monthly_rent: number
  entity_id: string
  property: {
    id: string
    name: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
}

export interface Bill {
  id: string
  bill_number: string
  for_month: string
  total_amount: number
  balance_due: number
  status: string
}

export function usePaymentCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/payments" })
  const { isFeatureEnabled } = useFeatures()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenantId = searchParams.get("tenant")
  const preselectedBillId = searchParams.get("bill")

  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState({
    tenant_id: preselectedTenantId || "",
    bill_id: preselectedBillId || "",
    charge_type_id: "",
    amount: "",
    payment_method: "cash",
    payment_date: getTodayISO(),
    for_period: "",
    reference_number: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [tenantsRes, chargeTypesRes] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            *,
            property:properties(id, name),
            room:rooms(id, room_number)
          `)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("charge_types")
          .select("id, name, code")
          .eq("owner_id", user?.id)
          .eq("is_enabled", true)
          .order("display_order"),
      ])

      if (tenantsRes.error) {
        logger.error("Error fetching tenants:", { detail: tenantsRes.error })
        showError("Failed to load tenants")
      } else {
        const transformedTenants = ((tenantsRes.data as RawTenant[]) || []).map((tenant) => ({
          ...tenant,
          property: transformJoin(tenant.property),
          room: transformJoin(tenant.room),
        }))
        setTenants(transformedTenants)

        if (preselectedTenantId) {
          const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
          if (tenant) {
            setSelectedTenant(tenant)
            setFormData((prev) => ({
              ...prev,
              amount: tenant.monthly_rent.toString(),
            }))
          }
        }
      }

      if (chargeTypesRes.error) {
        logger.error("Error fetching charge types:", { detail: chargeTypesRes.error })
      } else {
        const rentType = chargeTypesRes.data?.find((ct: { code: string }) => ct.code === "rent")
        if (rentType) {
          setFormData((prev) => ({ ...prev, charge_type_id: rentType.id }))
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId, user])

  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenant(tenant || null)
      if (tenant) {
         
        setFormData((prev) => ({
          ...prev,
          amount: tenant.monthly_rent.toString(),
        }))

        const fetchBills = async () => {
          const supabase = createClient()
          const { data: billsData, error } = await supabase
            .from("bills")
            .select("id, bill_number, for_month, total_amount, balance_due, status")
            .eq("tenant_id", tenant.id)
            .in("status", ["pending", "partial", "overdue"])
            .gt("balance_due", 0)
            .order("bill_date", { ascending: false })

          if (!error && billsData) {
            setBills(billsData)
          } else {
            setBills([])
          }
        }
        fetchBills()
      }
    } else {
      setSelectedTenant(null)
      setBills([])
    }
  }, [formData.tenant_id, tenants])

  useEffect(() => {
    if (formData.bill_id) {
      const bill = bills.find((b) => b.id === formData.bill_id)
      if (bill) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({
          ...prev,
          amount: bill.balance_due.toString(),
          for_period: bill.for_month,
        }))
      }
    }
  }, [formData.bill_id, bills])

  useEffect(() => {
    const currentPeriod = formatMonthYear(new Date())
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({ ...prev, for_period: currentPeriod }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const doSubmit = async () => {
    if (!formData.tenant_id || !formData.amount || !formData.payment_method) {
      showError("Please fill in all required fields")
      return
    }

    if (!formData.bill_id) {
      showError("Payment must be linked to a bill. Please select a bill or create one first.")
      return
    }

    setLoading(true)

    try {
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const workflowInput: PaymentRecordInput = {
        tenant_id: formData.tenant_id,
        entity_id: selectedTenant?.entity_id || "",
        bill_id: formData.bill_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method as PaymentRecordInput["payment_method"],
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        is_advance: false,
        send_receipt: isFeatureEnabled("payments", "paymentReceipts"),
      }

      const result = await recordPayment(
        workflowInput,
        user.id,
        "owner",
        user.id
      )

      if (!result.success) {
        logger.error("Error recording payment:", { detail: result.errors })
        const errorMsg = result.errors?.[0]?.message || "Unknown error"
        showError(`Failed to record payment: ${errorMsg}`)
        setLoading(false)
        return
      }

      showSuccess(`Payment recorded! Receipt: ${result.data?.receipt_number || "Generated"}`)
      setLoading(false)
      router.push("/payments")
    } catch (error: unknown) {
      handleClientError(error, "Recording payment")
      setLoading(false)
    }
  }

  const handleEditStep1 = () => {
    setCurrentStep(1)
    setFormData((prev) => ({ ...prev, tenant_id: "", bill_id: "" }))
    setSelectedTenant(null)
    setBills([])
  }

  const handleEditStep2 = () => {
    setCurrentStep(2)
    setFormData((prev) => ({ ...prev, bill_id: "" }))
  }

  return {
    backHref,
    loading,
    loadingData,
    tenants,
    bills,
    selectedTenant,
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    handleChange,
    doSubmit,
    handleEditStep1,
    handleEditStep2,
  }
}
