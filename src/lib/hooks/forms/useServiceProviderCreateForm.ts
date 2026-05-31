"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { TDS_RATES } from "@/lib/constants/form-options"
import { logger } from "@/lib/logger"
import type { ServiceCategory, ServiceProviderFormData, TdsSection } from "@/types/expense-enhanced.types"

export function useServiceProviderCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services/providers" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  const [formData, setFormData] = useState<ServiceProviderFormData>({
    name: "",
    category_id: "",
    phone: "",
    alternate_phone: "",
    email: "",
    address: "",
    pan: "",
    gstin: "",
    upi_id: "",
    tds_applicable: false as boolean,
    tds_section: undefined,
    tds_rate: undefined,
    is_active: true as boolean,
    notes: "",
  })

  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      if (error) {
        logger.error("Failed to load categories:", { detail: error })
      } else {
        setCategories(data || [])
      }
      setLoadingData(false)
    }

    loadCategories()
  }, [workspaceId])

  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || undefined,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Provider name is required")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const providerData = withCreatedBy(
        {
          workspace_id: workspaceId,
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          phone: formData.phone?.trim() || null,
          alternate_phone: formData.alternate_phone?.trim() || null,
          email: formData.email?.trim() || null,
          address: formData.address?.trim() || null,
          pan: formData.pan?.trim().toUpperCase() || null,
          gstin: formData.gstin?.trim().toUpperCase() || null,
          upi_id: formData.upi_id?.trim() || null,
          tds_applicable: formData.tds_applicable || false,
          tds_section: formData.tds_applicable ? formData.tds_section : null,
          tds_rate: formData.tds_applicable ? formData.tds_rate : null,
          is_active: formData.is_active ?? true,
          notes: formData.notes?.trim() || null,
        },
        user.id
      )

      const { data, error } = await supabase
        .from("service_providers")
        .insert(providerData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Provider created successfully")
      router.push(`/expenses/services/providers/${data.id}`)
    } catch (error) {
      logger.error("Failed to create provider:", { detail: error })
      showError("Failed to create provider")
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    loadingData,
    categories,
    formData,
    setFormData,
    handleTdsSectionChange,
    handleSubmit,
    backHref,
    router,
  }
}
