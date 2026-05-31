"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getTodayISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

import type {
  ServiceProvider,
  ServiceCategory,
  ServicePaymentFormData,
  TdsSection,
} from "@/types/expense-enhanced.types"
import { TDS_RATES } from "@/lib/constants/form-options"

export function useExpenseServiceCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  const [formData, setFormData] = useState<ServicePaymentFormData>({
    provider_id: "",
    provider_name: "",
    category_id: "",
    category_name: "",
    service_date: getTodayISO(),
    description: "",
    gross_amount: 0,
    tds_applicable: false as boolean,
    tds_section: undefined,
    tds_rate: undefined,
    tds_amount: undefined,
    net_amount: undefined,
    payment_mode: undefined,
    payment_reference: "",
    payment_date: getTodayISO(),
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
      setLoadingData(false)
    }

    loadData()
  }, [workspaceId])

  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        provider_id: providerId,
        provider_name: provider.name,
        category_id: provider.category_id || prev.category_id,
        tds_applicable: provider.tds_applicable,
        tds_section: provider.tds_section || undefined,
        tds_rate: provider.tds_rate || undefined,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        provider_id: "",
      }))
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || undefined,
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

  const step1Complete = !!formData.service_date
  const step2Complete = formData.description.trim().length > 0 && formData.gross_amount > 0

  const selectedCategory = categories.find((c) => c.id === formData.category_id)
  const categoryLabel = selectedCategory
    ? selectedCategory.name_hi
      ? `${selectedCategory.name} (${selectedCategory.name_hi})`
      : selectedCategory.name
    : null

  const doSubmit = async () => {
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

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const warrantyExpiry = getWarrantyExpiry()

      const paymentData = withCreatedBy(
        {
          workspace_id: workspaceId,
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
          payment_mode: formData.payment_mode || null,
          payment_reference: formData.payment_reference?.trim() || null,
          payment_date: formData.payment_date || null,
          warranty_months: formData.warranty_months || 0,
          warranty_expiry: warrantyExpiry,
          notes: formData.notes?.trim() || null,
          photos: [],
        },
        user.id
      )

      const { data, error } = await supabase
        .from("service_payments")
        .insert(paymentData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Service payment recorded")
      router.push(`/expenses/services/${data.id}`)
    } catch (error) {
      logger.error("Failed to create service payment:", { detail: error })
      showError("Failed to create service payment")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    router,
    currentStep,
    setCurrentStep,
    loading,
    loadingData,
    providers,
    categories,
    formData,
    setFormData,
    handleProviderSelect,
    handleTdsSectionChange,
    step1Complete,
    step2Complete,
    categoryLabel,
    doSubmit,
  }
}
