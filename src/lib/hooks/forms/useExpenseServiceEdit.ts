"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

import type {
  ServicePayment,
  ServiceProvider,
  ServiceCategory,
  ServicePaymentFormData,
  TdsSection,
  PaymentMode,
} from "@/types/expense-enhanced.types"
import { TDS_RATES } from "@/lib/constants/form-options"

export function useExpenseServiceEdit(params: Promise<{ id: string }>) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services" })
  const router = useRouter()
  const { user: _user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [payment, setPayment] = useState<ServicePayment | null>(null)

  const [formData, setFormData] = useState<ServicePaymentFormData>({
    provider_id: "",
    provider_name: "",
    category_id: "",
    category_name: "",
    service_date: "",
    description: "",
    gross_amount: 0,
    tds_applicable: false as boolean,
    tds_section: undefined,
    tds_rate: undefined,
    tds_amount: undefined,
    net_amount: undefined,
    payment_mode: undefined,
    payment_reference: "",
    payment_date: "",
    warranty_months: 0,
    notes: "",
  })

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: providersData } = await supabase
        .from("service_providers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProviders(providersData || [])

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      const { data: paymentData, error } = await supabase
        .from("service_payments")
        .select(`
          *,
          provider:service_providers(id, name),
          category:service_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !paymentData) {
        showError("Payment not found")
        router.push("/expenses/services")
        return
      }

      const transformed = {
        ...paymentData,
        provider: transformJoin(paymentData.provider),
        category: transformJoin(paymentData.category),
      } as ServicePayment

      setPayment(transformed)
      setFormData({
        provider_id: transformed.provider_id || "",
        provider_name: transformed.provider_name,
        category_id: transformed.category_id || "",
        category_name: transformed.category_name || "",
        service_date: transformed.service_date,
        description: transformed.description,
        gross_amount: transformed.gross_amount,
        tds_applicable: transformed.tds_applicable,
        tds_section: transformed.tds_section || undefined,
        tds_rate: transformed.tds_rate || undefined,
        tds_amount: transformed.tds_amount,
        net_amount: transformed.net_amount,
        payment_mode: transformed.payment_mode || undefined,
        payment_reference: transformed.payment_reference || "",
        payment_date: transformed.payment_date || "",
        warranty_months: transformed.warranty_months,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  // Recalculate TDS whenever gross_amount, tds_applicable, or tds_rate changes
  useEffect(() => {
    if (formData.tds_applicable && formData.gross_amount > 0 && formData.tds_rate) {
      const tdsAmount = (formData.gross_amount * formData.tds_rate) / 100
      const netAmount = formData.gross_amount - tdsAmount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        tds_amount: tdsAmount,
        net_amount: netAmount,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        tds_amount: 0,
        net_amount: prev.gross_amount,
      }))
    }
  }, [formData.gross_amount, formData.tds_applicable, formData.tds_rate])

  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        provider_id: providerId,
        provider_name: provider.name,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        provider_id: "",
      }))
    }
  }

  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || prev.tds_rate,
    }))
  }

  const getWarrantyExpiry = () => {
    if (formData.warranty_months && formData.warranty_months > 0 && formData.service_date) {
      const date = new Date(formData.service_date)
      date.setMonth(date.getMonth() + formData.warranty_months)
      return date.toISOString().split("T")[0]
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.provider_name.trim()) {
      showError("Provider name is required")
      return
    }

    if (!formData.description.trim()) {
      showError("Service description is required")
      return
    }

    if (formData.gross_amount <= 0) {
      showError("Amount must be greater than 0")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const warrantyExpiry = getWarrantyExpiry()

      const { error } = await supabase
        .from("service_payments")
        .update({
          provider_id: formData.provider_id || null,
          provider_name: formData.provider_name.trim(),
          category_id: formData.category_id || null,
          category_name:
            categories.find((c) => c.id === formData.category_id)?.name ||
            formData.category_name ||
            null,
          service_date: formData.service_date,
          description: formData.description.trim(),
          gross_amount: formData.gross_amount,
          tds_applicable: formData.tds_applicable,
          tds_section: formData.tds_applicable ? formData.tds_section : null,
          tds_rate: formData.tds_applicable ? formData.tds_rate : null,
          tds_amount: formData.tds_amount || 0,
          net_amount: formData.net_amount || formData.gross_amount,
          payment_mode: (formData.payment_mode as PaymentMode) || null,
          payment_reference: formData.payment_reference?.trim() || null,
          payment_date: formData.payment_date || null,
          warranty_months: formData.warranty_months || 0,
          warranty_expiry: warrantyExpiry,
          notes: formData.notes?.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Service payment updated")
      router.push(`/expenses/services/${id}`)
    } catch (error) {
      logger.error("Failed to update service payment:", { detail: error })
      showError("Failed to update")
    } finally {
      setLoading(false)
    }
  }

  return {
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
  }
}
