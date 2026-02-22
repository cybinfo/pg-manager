"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Building2,
  Loader2,
  Globe,
  Users,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"

import {
  PropertyDetailsTab,
  TenantPortalTab,
  WebsiteSettingsTab,
} from "./_components"

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

interface TenantFeatures {
  view_bills: boolean
  view_payments: boolean
  submit_complaints: boolean
  view_notices: boolean
  request_visitors: boolean
  download_receipts: boolean
  update_profile: boolean
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

export default function EditPropertyPage() {
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
        console.error("Error fetching property:", error)
        showError("Property not found")
        router.push("/properties")
        return
      }

      setFormData({
        name: data.name || "",
        address_line1: data.address || "", // Load existing address into line1
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

      // Load tenant features
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
    setTenantFeatures(prev => ({
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

      // Combine address lines into single address field
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

      // Add website fields if on website tab
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

      // Always save tenant features
      updateData.tenant_features = tenantFeatures

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", params.id)

      if (error) {
        console.error("Error updating property:", error)
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/properties/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Property</h1>
          <p className="text-muted-foreground">Update property details and website settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Property Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tenant")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "tenant"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Tenant Portal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("website")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "website"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4 inline mr-2" />
          Website Settings
          {websiteData.website_enabled && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
              Live
            </span>
          )}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Property Details Tab */}
        {activeTab === "details" && (
          <PropertyDetailsTab
            formData={formData}
            onChange={handleChange}
            setFormData={setFormData}
            loading={loading}
          />
        )}

        {/* Tenant Portal Tab */}
        {activeTab === "tenant" && (
          <TenantPortalTab
            tenantFeatures={tenantFeatures}
            onFeatureChange={handleTenantFeatureChange}
            loading={loading}
          />
        )}

        {/* Website Settings Tab */}
        {activeTab === "website" && (
          <WebsiteSettingsTab
            websiteData={websiteData}
            onWebsiteChange={handleWebsiteChange}
            propertyName={formData.name}
          />
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/properties/${params.id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
