"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import type { BusinessEntityType } from "@/types/business.types"

export interface BusinessEditFormData {
  name: string
  legal_name: string
  description: string
  business_type: BusinessEntityType | ""
  gst_number: string
  pan_number: string
  registration_number: string
  reg_address: string
  reg_city: string
  reg_state: string
  reg_pincode: string
  phone: string
  email: string
  website: string
  is_active: boolean
}

export function useBusinessEditForm() {
  const params = useParams()
  const id = params.id as string
  const { backHref } = useBackNavigation({ defaultHref: `/businesses/${id}` })
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState<BusinessEditFormData>({
    name: "",
    legal_name: "",
    description: "",
    business_type: "",
    gst_number: "",
    pan_number: "",
    registration_number: "",
    reg_address: "",
    reg_city: "",
    reg_state: "",
    reg_pincode: "",
    phone: "",
    email: "",
    website: "",
    is_active: true,
  })

  useEffect(() => {
    const fetchBusiness = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        logger.error("Error fetching business for edit", { error: String(error) })
        showError("Failed to load business")
      } else if (data) {
        setFormData({
          name: data.name || "",
          legal_name: data.legal_name || "",
          description: data.description || "",
          business_type: (data.business_type as BusinessEntityType) || "",
          gst_number: data.gst_number || "",
          pan_number: data.pan_number || "",
          registration_number: data.registration_number || "",
          reg_address: data.reg_address || "",
          reg_city: data.reg_city || "",
          reg_state: data.reg_state || "",
          reg_pincode: data.reg_pincode || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          is_active: data.is_active ?? true,
        })
      }
      setLoadingData(false)
    }

    fetchBusiness()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Business name is required")
      return
    }

    if (!user) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name.trim(),
          legal_name: formData.legal_name.trim() || null,
          description: formData.description.trim() || null,
          business_type: formData.business_type || null,
          gst_number: formData.gst_number.trim().toUpperCase() || null,
          pan_number: formData.pan_number.trim().toUpperCase() || null,
          registration_number: formData.registration_number.trim() || null,
          reg_address: formData.reg_address.trim() || null,
          reg_city: formData.reg_city.trim() || null,
          reg_state: formData.reg_state.trim() || null,
          reg_pincode: formData.reg_pincode.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim().toLowerCase() || null,
          website: formData.website.trim() || null,
          is_active: formData.is_active,
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Business updated successfully!")
    } catch (error) {
      handleClientError(error, "Updating business")
    } finally {
      setLoading(false)
    }
  }

  return {
    id,
    backHref,
    loading,
    loadingData,
    formData,
    handleChange,
    handleSubmit,
  }
}
