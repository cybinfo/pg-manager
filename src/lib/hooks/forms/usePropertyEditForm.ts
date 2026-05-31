"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { logger } from "@/lib/logger"
import type { TenantFeatures } from "@/types/portal.types"

interface WebsiteConfig {
  tagline: string
  description: string
  property_type: string
  established_year: string
  cover_photo_url: string
  gallery: string[]
  amenities: string[]
  house_rules: string
  google_maps_url: string
  nearby_landmarks: string[]
  contact_whatsapp: string
  contact_email: string
  show_rooms: boolean
  show_pricing: boolean
  show_contact_form: boolean
}

const defaultTenantFeatures: TenantFeatures = {
  view_bills: true,
  view_payments: true,
  submit_complaints: true,
  view_notices: true,
  request_visitors: false,
  download_receipts: true,
  update_profile: true,
}

export function usePropertyEditForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/properties" })
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "website" | "tenant">("details")
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatures>(defaultTenantFeatures)

  const [formData, setFormData] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    manager_name: "",
    manager_phone: "",
    cover_image: "",
    photos: [] as string[],
  })

  const [websiteData, setWebsiteData] = useState({
    website_slug: "",
    website_enabled: false,
    website_config: {
      tagline: "",
      description: "",
      property_type: "pg",
      established_year: "",
      cover_photo_url: "",
      gallery: [] as string[],
      amenities: [] as string[],
      house_rules: "",
      google_maps_url: "",
      nearby_landmarks: [] as string[],
      contact_whatsapp: "",
      contact_email: "",
      show_rooms: true,
      show_pricing: true,
      show_contact_form: true,
    } as WebsiteConfig,
  })

  useEffect(() => {
    const fetchProperty = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error || !data) {
        logger.error("Error fetching property:", { detail: error })
        showError("Property not found")
        router.push("/properties")
        return
      }

      setFormData({
        name: data.name || "",
        address_line1: data.address || "",
        address_line2: "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
        manager_name: data.manager_name || "",
        manager_phone: data.manager_phone || "",
        cover_image: data.cover_image || "",
        photos: data.photos || [],
      })

      setWebsiteData({
        website_slug: data.website_slug || "",
        website_enabled: data.website_enabled || false,
        website_config: {
          tagline: data.website_config?.tagline || "",
          description: data.website_config?.description || "",
          property_type: data.website_config?.property_type || "pg",
          established_year: data.website_config?.established_year?.toString() || "",
          cover_photo_url: data.website_config?.cover_photo_url || "",
          gallery: data.website_config?.gallery || [],
          amenities: data.website_config?.amenities || [],
          house_rules: data.website_config?.house_rules || "",
          google_maps_url: data.website_config?.google_maps_url || "",
          nearby_landmarks: data.website_config?.nearby_landmarks || [],
          contact_whatsapp: data.website_config?.contact_whatsapp || data.manager_phone || "",
          contact_email: data.website_config?.contact_email || "",
          show_rooms: data.website_config?.show_rooms ?? true,
          show_pricing: data.website_config?.show_pricing ?? true,
          show_contact_form: data.website_config?.show_contact_form ?? true,
        },
      })

      if (data.tenant_features) {
        setTenantFeatures({
          ...defaultTenantFeatures,
          ...data.tenant_features,
        })
      }

      setLoadingData(false)
    }

    fetchProperty()
  }, [params.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleWebsiteChange = (field: string, value: string | boolean | string[]) => {
    if (field === "website_slug" || field === "website_enabled") {
      setWebsiteData((prev) => ({
        ...prev,
        [field]: value,
      }))
    } else {
      setWebsiteData((prev) => ({
        ...prev,
        website_config: {
          ...prev.website_config,
          [field]: value,
        },
      }))
    }
  }

  const handleTenantFeatureChange = (key: keyof TenantFeatures, value: boolean) => {
    setTenantFeatures((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.city) {
      showError("Please fill in required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const fullAddress = [formData.address_line1, formData.address_line2]
        .filter(Boolean)
        .join(", ")

      const updateData: Record<string, unknown> = {
        name: formData.name,
        address: fullAddress || null,
        city: formData.city,
        state: formData.state || null,
        pincode: formData.pincode || null,
        manager_name: formData.manager_name || null,
        manager_phone: formData.manager_phone || null,
        cover_image: formData.cover_image || null,
        photos: formData.photos.length > 0 ? formData.photos : null,
      }

      if (activeTab === "website" || websiteData.website_enabled) {
        updateData.website_slug = websiteData.website_slug || null
        updateData.website_enabled = websiteData.website_enabled
        updateData.website_config = {
          ...websiteData.website_config,
          established_year: websiteData.website_config.established_year
            ? parseInt(websiteData.website_config.established_year)
            : null,
        }
      }

      updateData.tenant_features = tenantFeatures

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", params.id)

      if (error) {
        logger.error("Error updating property:", { detail: error })
        throw error
      }

      showSuccess("Property updated successfully!")
      router.push(`/properties/${params.id}`)
    } catch (error) {
      handleClientError(error, "Updating property")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    params,
    loading,
    loadingData,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    websiteData,
    tenantFeatures,
    handleChange,
    handleWebsiteChange,
    handleTenantFeatureChange,
    handleSubmit,
  }
}
