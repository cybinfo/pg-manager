"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { TDS_RATES } from "@/lib/constants/form-options"
import { logger } from "@/lib/logger"
import type { ServiceProvider, ServiceCategory, ServiceProviderFormData, TdsSection } from "@/types/expense-enhanced.types"

export function useServiceProviderEditForm(id: string) {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services/providers" })
  const router = useRouter()
  const { workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [provider, setProvider] = useState<ServiceProvider | null>(null)

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
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      const { data: providerData, error } = await supabase
        .from("service_providers")
        .select(`
          *,
          category:service_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !providerData) {
        showError("Provider not found")
        router.push("/expenses/services/providers")
        return
      }

      const transformed = {
        ...providerData,
        category: transformJoin(providerData.category),
      } as ServiceProvider

      setProvider(transformed)
      setFormData({
        name: transformed.name,
        category_id: transformed.category_id || "",
        phone: transformed.phone || "",
        alternate_phone: transformed.alternate_phone || "",
        email: transformed.email || "",
        address: transformed.address || "",
        pan: transformed.pan || "",
        gstin: transformed.gstin || "",
        upi_id: transformed.upi_id || "",
        tds_applicable: transformed.tds_applicable,
        tds_section: transformed.tds_section || undefined,
        tds_rate: transformed.tds_rate || undefined,
        is_active: transformed.is_active,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || prev.tds_rate,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Provider name is required")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("service_providers")
        .update({
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
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Provider updated successfully")
      router.push(`/expenses/services/providers/${id}`)
    } catch (error) {
      logger.error("Failed to update provider:", { detail: error })
      showError("Failed to update provider")
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    loadingData,
    categories,
    provider,
    formData,
    setFormData,
    handleTdsSectionChange,
    handleSubmit,
    backHref,
    router,
    id,
  }
}
