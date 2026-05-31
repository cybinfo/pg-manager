"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { withCreatedBy } from "@/lib/audit"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import type { Business } from "@/types/business.types"

export interface LocationCreateFormData {
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
}

const INITIAL_FORM_DATA: LocationCreateFormData = {
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
}

export function useLocationCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/locations" })
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessIdFromUrl = searchParams.get("business_id")
  const { handleSuccess } = useFormSubmit({ redirectTo: "/locations" })

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [businesses, setBusinesses] = useState<Pick<Business, "id" | "name">[]>([])
  const [formData, setFormData] = useState<LocationCreateFormData>({
    ...INITIAL_FORM_DATA,
    business_id: businessIdFromUrl || "",
  })

  useEffect(() => {
    const fetchBusinesses = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("businesses")
        .select("id, name")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name")

      setBusinesses(data || [])
      if (!formData.business_id && data && data.length === 1) {
        setFormData((prev) => ({ ...prev, business_id: data[0].id }))
      }
      setLoadingData(false)
    }

    fetchBusinesses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.business_id) {
      showError("Please select a business")
      return
    }
    if (!formData.name.trim()) {
      showError("Location name is required")
      return
    }

    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", user.id)
        .single()

      if (!workspace) {
        showError("Workspace not found")
        return
      }

      const { error } = await supabase
        .from("locations")
        .insert(
          withCreatedBy(
            {
              workspace_id: workspace.id,
              owner_id: user.id,
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
              is_active: true,
            },
            user.id
          )
        )

      if (error) throw error

      handleSuccess({ message: "Location created successfully!" })
    } catch (error) {
      handleClientError(error, "Creating location")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    loading,
    loadingData,
    businesses,
    formData,
    handleChange,
    doSubmit,
  }
}
