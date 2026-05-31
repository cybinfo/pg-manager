"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"
import type { Vendor, BillCategory, VendorFormData } from "@/types/expense-enhanced.types"

export function useVendorEditForm(id: string) {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/vendors" })
  const router = useRouter()
  const { workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [vendor, setVendor] = useState<Vendor | null>(null)

  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    category_id: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    pan: "",
    upi_id: "",
    bank_name: "",
    bank_account: "",
    bank_ifsc: "",
    is_active: true as boolean,
    notes: "",
  })

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: categoriesData } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(`
          *,
          category:bill_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !vendorData) {
        showError("Vendor not found")
        router.push("/expenses/vendors")
        return
      }

      const transformed = {
        ...vendorData,
        category: transformJoin(vendorData.category),
      } as Vendor

      setVendor(transformed)
      setFormData({
        name: transformed.name,
        category_id: transformed.category_id || "",
        contact_name: transformed.contact_name || "",
        phone: transformed.phone || "",
        email: transformed.email || "",
        address: transformed.address || "",
        gstin: transformed.gstin || "",
        pan: transformed.pan || "",
        upi_id: transformed.upi_id || "",
        bank_name: transformed.bank_name || "",
        bank_account: transformed.bank_account || "",
        bank_ifsc: transformed.bank_ifsc || "",
        is_active: transformed.is_active,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Vendor name is required")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("vendors")
        .update({
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          contact_name: formData.contact_name?.trim() || null,
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          address: formData.address?.trim() || null,
          gstin: formData.gstin?.trim().toUpperCase() || null,
          pan: formData.pan?.trim().toUpperCase() || null,
          upi_id: formData.upi_id?.trim() || null,
          bank_name: formData.bank_name?.trim() || null,
          bank_account: formData.bank_account?.trim() || null,
          bank_ifsc: formData.bank_ifsc?.trim().toUpperCase() || null,
          is_active: formData.is_active ?? true,
          notes: formData.notes?.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) {
        if (error.code === "23505") {
          showError("A vendor with this name already exists")
        } else {
          throw error
        }
        return
      }

      showSuccess("Vendor updated successfully")
      router.push(`/expenses/vendors/${id}`)
    } catch (error) {
      logger.error("Failed to update vendor:", { detail: error })
      showError("Failed to update vendor")
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    loadingData,
    categories,
    vendor,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    router,
    id,
  }
}
