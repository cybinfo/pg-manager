"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { handleClientError } from "@/lib/error-handler"
import { withCreatedBy } from "@/lib/audit"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import type { BusinessEntityType } from "@/types/business.types"

export interface BusinessCreateFormData {
  name: string
  legal_name: string
  description: string
  business_type: BusinessEntityType | ""
  gst_number: string
  pan_number: string
  registration_number: string
  phone: string
  email: string
  website: string
}

const INITIAL_FORM_DATA: BusinessCreateFormData = {
  name: "",
  legal_name: "",
  description: "",
  business_type: "",
  gst_number: "",
  pan_number: "",
  registration_number: "",
  phone: "",
  email: "",
  website: "",
}

export function useBusinessCreateForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/businesses" })
  const { user } = useAuth()
  const router = useRouter()
  const { handleSuccess } = useFormSubmit({ redirectTo: "/businesses" })

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BusinessCreateFormData>(INITIAL_FORM_DATA)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Business name is required")
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

      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 60)

      const { error } = await supabase
        .from("businesses")
        .insert(
          withCreatedBy(
            {
              workspace_id: workspace.id,
              owner_id: user.id,
              name: formData.name.trim(),
              legal_name: formData.legal_name.trim() || null,
              description: formData.description.trim() || null,
              business_type: formData.business_type || null,
              gst_number: formData.gst_number.trim().toUpperCase() || null,
              pan_number: formData.pan_number.trim().toUpperCase() || null,
              registration_number: formData.registration_number.trim() || null,
              phone: formData.phone.trim() || null,
              email: formData.email.trim().toLowerCase() || null,
              website: formData.website.trim() || null,
              slug: slug || null,
              is_active: true,
            },
            user.id
          )
        )

      if (error) throw error

      handleSuccess({ message: "Business created successfully!" })
    } catch (error) {
      handleClientError(error, "Creating business")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    loading,
    formData,
    handleChange,
    doSubmit,
  }
}
