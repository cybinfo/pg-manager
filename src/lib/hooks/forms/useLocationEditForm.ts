"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import type { Business } from "@/types/business.types"

export interface LocationEditFormData {
  business_id: string
  name: string
  description: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  opening_time: string
  closing_time: string
  is_primary: boolean
  is_active: boolean
}

export function useLocationEditForm() {
  const params = useParams()
  const id = params.id as string
  const { backHref } = useBackNavigation({ defaultHref: `/locations/${id}` })
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [businesses, setBusinesses] = useState<Pick<Business, "id" | "name">[]>([])
  const [formData, setFormData] = useState<LocationEditFormData>({
    business_id: "",
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    opening_time: "",
    closing_time: "",
    is_primary: false,
    is_active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [locationRes, businessesRes] = await Promise.all([
        supabase.from("locations").select("*").eq("id", id).single(),
        supabase.from("businesses").select("id, name").is("deleted_at", null).order("name"),
      ])

      if (locationRes.error) {
        logger.error("Error fetching location for edit", { error: String(locationRes.error) })
        showError("Failed to load location")
      } else if (locationRes.data) {
        const d = locationRes.data
        setFormData({
          business_id: d.business_id || "",
          name: d.name || "",
          description: d.description || "",
          address: d.address || "",
          city: d.city || "",
          state: d.state || "",
          pincode: d.pincode || "",
          phone: d.phone || "",
          email: d.email || "",
          opening_time: d.opening_time || "",
          closing_time: d.closing_time || "",
          is_primary: d.is_primary ?? false,
          is_active: d.is_active ?? true,
        })
      }

      setBusinesses(businessesRes.data || [])
      setLoadingData(false)
    }

    fetchData()
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
      showError("Location name is required")
      return
    }
    if (!formData.business_id) {
      showError("Please select a business")
      return
    }

    if (!user) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("locations")
        .update({
          business_id: formData.business_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          pincode: formData.pincode.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim().toLowerCase() || null,
          opening_time: formData.opening_time || null,
          closing_time: formData.closing_time || null,
          is_primary: formData.is_primary,
          is_active: formData.is_active,
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Location updated successfully!")
    } catch (error) {
      handleClientError(error, "Updating location")
    } finally {
      setLoading(false)
    }
  }

  return {
    id,
    backHref,
    loading,
    loadingData,
    businesses,
    formData,
    handleChange,
    handleSubmit,
  }
}
