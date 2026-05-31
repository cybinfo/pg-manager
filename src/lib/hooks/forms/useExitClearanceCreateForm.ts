"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { initiateExitClearance, ExitClearanceInput } from "@/lib/workflows/exit.workflow"
import { getTodayISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

interface TenantRaw {
  id: string
  name: string
  phone: string
  photo_url: string | null
  monthly_rent: number
  check_in_date: string
  notice_date: string | null
  expected_exit_date: string | null
  status: string
  entity_id: string
  room_id: string
  property: { id: string; name: string }[] | null
  room: { id: string; room_number: string; deposit_amount: number }[] | null
}

export interface ExitClearanceTenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  monthly_rent: number
  check_in_date: string
  notice_date: string | null
  expected_exit_date: string | null
  status: string
  entity_id: string
  room_id: string
  property: {
    id: string
    name: string
  }
  room: {
    id: string
    room_number: string
    deposit_amount: number
  }
}

export interface Deduction {
  id: string
  reason: string
  amount: number
}

export interface NoticePeriodComparison {
  actualDays: number
  configuredDays: number
  difference: number
  status: "short" | "exact" | "long"
  message: string
  colorClass: string
}

export interface ExitClearanceAmounts {
  totalDues: number
  totalRefundable: number
  totalDeductions: number
  finalAmount: number
}

export function useExitClearanceCreateForm() {
  const { user } = useAuth()
  const { backHref } = useBackNavigation({ defaultHref: "/exit-clearance" })
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenantId = searchParams.get("tenant")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [tenants, setTenants] = useState<ExitClearanceTenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<ExitClearanceTenant | null>(null)
  const [configuredNoticePeriod, setConfiguredNoticePeriod] = useState(30)

  const [formData, setFormData] = useState({
    tenant_id: preselectedTenantId || "",
    notice_given_date: getTodayISO(),
    expected_exit_date: "",
    room_condition_notes: "",
  })

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [newDeduction, setNewDeduction] = useState({ reason: "", amount: "" })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: configData } = await supabase
        .from("owner_config")
        .select("default_notice_period")
        .single()

      if (configData?.default_notice_period) {
        setConfiguredNoticePeriod(configData.default_notice_period)
      }

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          monthly_rent,
          check_in_date,
          notice_date,
          expected_exit_date,
          status,
          entity_id,
          room_id,
          property:properties(id, name),
          photo_url,
          room:rooms(id, room_number, deposit_amount)
        `)
        .eq("status", "notice_period")
        .order("name")

      if (error) {
        logger.error("Error fetching tenants:", { detail: error })
        showError("Failed to load tenants")
        setLoadingData(false)
        return
      }

      const transformedTenants: ExitClearanceTenant[] = ((data as TenantRaw[]) || [])
        .map((t) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          monthly_rent: t.monthly_rent,
          check_in_date: t.check_in_date,
          notice_date: t.notice_date,
          expected_exit_date: t.expected_exit_date,
          status: t.status,
          photo_url: t.photo_url,
          entity_id: t.entity_id,
          room_id: t.room_id,
          property: transformJoin(t.property),
          room: transformJoin(t.room),
        }))
        .filter((t): t is ExitClearanceTenant => t.property !== null && t.room !== null)
      setTenants(transformedTenants)

      if (preselectedTenantId && transformedTenants.length > 0) {
        const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
        if (tenant) {
          setSelectedTenant(tenant)
          const noticeDate = tenant.notice_date || getTodayISO()
          const exitDate = tenant.expected_exit_date || (() => {
            const date = new Date()
            date.setDate(date.getDate() + 30)
            return date.toISOString().split("T")[0]
          })()
          setFormData((prev) => ({
            ...prev,
            notice_given_date: noticeDate,
            expected_exit_date: exitDate,
          }))
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId])

  // Update selected tenant when selection changes
  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenant(tenant || null)

      if (tenant) {
        const noticeDate = tenant.notice_date || getTodayISO()
        const exitDate = tenant.expected_exit_date || (() => {
          const date = new Date()
          date.setDate(date.getDate() + 30)
          return date.toISOString().split("T")[0]
        })()
        setFormData((prev) => ({
          ...prev,
          notice_given_date: noticeDate,
          expected_exit_date: exitDate,
        }))
      }
    } else {
      setSelectedTenant(null)
    }
  }, [formData.tenant_id, tenants])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const addDeduction = () => {
    if (!newDeduction.reason || !newDeduction.amount) {
      showError("Please enter reason and amount")
      return
    }

    setDeductions([
      ...deductions,
      {
        id: Date.now().toString(),
        reason: newDeduction.reason,
        amount: parseFloat(newDeduction.amount),
      },
    ])
    setNewDeduction({ reason: "", amount: "" })
  }

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id))
  }

  const calculateAmounts = (): ExitClearanceAmounts => {
    if (!selectedTenant) {
      return { totalDues: 0, totalRefundable: 0, totalDeductions: 0, finalAmount: 0 }
    }

    const depositAmount = selectedTenant.room.deposit_amount || 0
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
    const totalRefundable = depositAmount
    const totalDues = 0 // This would come from pending charges in a real app
    const finalAmount = totalDues - totalRefundable + totalDeductions

    return { totalDues, totalRefundable, totalDeductions, finalAmount }
  }

  const calculateNoticePeriodComparison = (): NoticePeriodComparison | null => {
    if (!formData.notice_given_date || !formData.expected_exit_date) {
      return null
    }

    const noticeDate = new Date(formData.notice_given_date)
    const exitDate = new Date(formData.expected_exit_date)
    const actualDays = Math.ceil((exitDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24))
    const difference = actualDays - configuredNoticePeriod

    let status: "short" | "exact" | "long"
    let message: string
    let colorClass: string

    if (difference < 0) {
      status = "short"
      message = `${Math.abs(difference)} days SHORT of required ${configuredNoticePeriod} days notice`
      colorClass = "text-destructive bg-destructive/10 border-destructive/20"
    } else if (difference === 0) {
      status = "exact"
      message = `Exactly ${configuredNoticePeriod} days notice (as required)`
      colorClass = "text-success bg-success/10 border-success/20"
    } else {
      status = "long"
      message = `${difference} days MORE than required ${configuredNoticePeriod} days notice`
      colorClass = "text-info bg-info/10 border-info/20"
    }

    return { actualDays, configuredDays: configuredNoticePeriod, difference, status, message, colorClass }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.expected_exit_date) {
      showError("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      if (!user || !selectedTenant) {
        showError("Session expired. Please login again.")
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const workflowInput: ExitClearanceInput = {
        tenant_id: formData.tenant_id,
        entity_id: selectedTenant.entity_id,
        room_id: selectedTenant.room_id,
        requested_exit_date: formData.expected_exit_date,
        exit_reason: "notice_period",
        notice_date: formData.notice_given_date || undefined,
        deductions: deductions.map((d) => ({
          description: d.reason,
          amount: d.amount,
        })),
        notes: formData.room_condition_notes || undefined,
      }

      const result = await initiateExitClearance(
        workflowInput,
        user.id,
        "owner",
        user.id,
        accessToken
      )

      if (!result.success) {
        logger.error("Error initiating exit:", { detail: result.errors })
        const errorMsg = result.errors?.[0]?.message || "Unknown error"
        showError(`Failed to initiate checkout: ${errorMsg}`)
        setLoading(false)
        return
      }

      showSuccess("Exit clearance initiated")
      router.push(`/exit-clearance/${result.data?.clearance_id}`)
    } catch (error: unknown) {
      handleClientError(error, "Initiating checkout")
    } finally {
      setLoading(false)
    }
  }

  return {
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
    amounts: calculateAmounts(),
    noticePeriodComparison: calculateNoticePeriodComparison(),
    handleSubmit,
    backHref,
  }
}
