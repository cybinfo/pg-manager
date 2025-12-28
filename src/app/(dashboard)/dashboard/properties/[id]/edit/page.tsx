"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  Loader2,
  Globe,
  ExternalLink,
  Copy,
  CheckCircle,
  X,
  Plus,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"

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

const defaultAmenities = [
  "WiFi", "Parking", "Food", "CCTV", "Power Backup",
  "Water Supply", "Laundry", "Housekeeping", "Security",
  "AC Rooms", "Gym", "TV Room", "Study Room", "Terrace Access"
]

export default function EditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "website">("details")
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    manager_name: "",
    manager_phone: "",
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

  const [newLandmark, setNewLandmark] = useState("")

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
        toast.error("Property not found")
        router.push("/dashboard/properties")
        return
      }

      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
        manager_name: data.manager_name || "",
        manager_phone: data.manager_phone || "",
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

  const toggleAmenity = (amenity: string) => {
    const current = websiteData.website_config.amenities
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity]
    handleWebsiteChange("amenities", updated)
  }

  const addLandmark = () => {
    if (newLandmark.trim()) {
      handleWebsiteChange("nearby_landmarks", [
        ...websiteData.website_config.nearby_landmarks,
        newLandmark.trim(),
      ])
      setNewLandmark("")
    }
  }

  const removeLandmark = (index: number) => {
    const updated = websiteData.website_config.nearby_landmarks.filter((_, i) => i !== index)
    handleWebsiteChange("nearby_landmarks", updated)
  }

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50)
    handleWebsiteChange("website_slug", slug)
  }

  const copyWebsiteUrl = () => {
    const url = `${window.location.origin}/pg/${websiteData.website_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Website URL copied!")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.city) {
      toast.error("Please fill in required fields")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const updateData: Record<string, unknown> = {
        name: formData.name,
        address: formData.address || null,
        city: formData.city,
        state: formData.state || null,
        pincode: formData.pincode || null,
        manager_name: formData.manager_name || null,
        manager_phone: formData.manager_phone || null,
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

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", params.id)

      if (error) {
        console.error("Error updating property:", error)
        throw error
      }

      toast.success("Property updated successfully!")
      router.push(`/dashboard/properties/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update property. Please try again.")
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
        <Link href={`/dashboard/properties/${params.id}`}>
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
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
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
          onClick={() => setActiveTab("website")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "website"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4 inline mr-2" />
          Website Settings
          {websiteData.website_enabled && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Live
            </span>
          )}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Property Details Tab */}
        {activeTab === "details" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>Update the property information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Sunrise PG, Main Building"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="e.g., 123, MG Road, Near Metro Station"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g., Bangalore"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="e.g., Karnataka"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder="e.g., 560001"
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Property Manager (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manager_name">Manager Name</Label>
                    <Input
                      id="manager_name"
                      name="manager_name"
                      placeholder="e.g., Ramesh Kumar"
                      value={formData.manager_name}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager_phone">Manager Phone</Label>
                    <Input
                      id="manager_phone"
                      name="manager_phone"
                      placeholder="e.g., 9876543210"
                      value={formData.manager_phone}
                      onChange={handleChange}
                      disabled={loading}
                      type="tel"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Website Settings Tab */}
        {activeTab === "website" && (
          <div className="space-y-6">
            {/* Enable Website Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Public PG Website</h3>
                      <p className="text-sm text-muted-foreground">
                        Get a beautiful website to showcase your PG
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={websiteData.website_enabled}
                      onChange={(e) => handleWebsiteChange("website_enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    <span className="ml-3 text-sm font-medium">
                      {websiteData.website_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>

                {websiteData.website_enabled && websiteData.website_slug && (
                  <div className="mt-4 p-4 bg-teal-50 rounded-lg">
                    <Label className="text-teal-700">Your Website URL</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 px-3 py-2 bg-white rounded border text-sm">
                        {typeof window !== "undefined" ? window.location.origin : ""}/pg/{websiteData.website_slug}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyWebsiteUrl}
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Link
                        href={`/pg/${websiteData.website_slug}`}
                        target="_blank"
                      >
                        <Button type="button" variant="outline" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {websiteData.website_enabled && (
              <>
                {/* URL Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">URL Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Website Slug</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center">
                          <span className="px-3 py-2 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                            /pg/
                          </span>
                          <Input
                            value={websiteData.website_slug}
                            onChange={(e) =>
                              handleWebsiteChange(
                                "website_slug",
                                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                              )
                            }
                            placeholder="your-pg-name"
                            className="rounded-l-none"
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={generateSlug}>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use lowercase letters, numbers, and hyphens only
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Property Type</Label>
                        <select
                          className="w-full h-10 px-3 rounded-md border bg-background"
                          value={websiteData.website_config.property_type}
                          onChange={(e) => handleWebsiteChange("property_type", e.target.value)}
                        >
                          <option value="pg">PG (Paying Guest)</option>
                          <option value="hostel">Hostel</option>
                          <option value="coliving">Co-Living Space</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Established Year</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 2020"
                          value={websiteData.website_config.established_year}
                          onChange={(e) => handleWebsiteChange("established_year", e.target.value)}
                          min="1990"
                          max={new Date().getFullYear()}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input
                        placeholder="e.g., Your Home Away From Home"
                        value={websiteData.website_config.tagline}
                        onChange={(e) => handleWebsiteChange("tagline", e.target.value)}
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <textarea
                        className="w-full min-h-[120px] px-3 py-2 rounded-md border bg-background resize-none"
                        placeholder="Tell potential tenants about your PG - facilities, environment, what makes it special..."
                        value={websiteData.website_config.description}
                        onChange={(e) => handleWebsiteChange("description", e.target.value)}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {websiteData.website_config.description.length}/1000
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cover Photo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cover Photo</CardTitle>
                    <CardDescription>
                      Add a URL to your PG&apos;s main photo (upload to Imgur, Google Drive, etc.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Input
                        placeholder="https://example.com/your-pg-photo.jpg"
                        value={websiteData.website_config.cover_photo_url}
                        onChange={(e) => handleWebsiteChange("cover_photo_url", e.target.value)}
                      />
                      {websiteData.website_config.cover_photo_url && (
                        <div className="mt-3 rounded-lg overflow-hidden border">
                          <img
                            src={websiteData.website_config.cover_photo_url}
                            alt="Cover preview"
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Amenities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Amenities</CardTitle>
                    <CardDescription>Select the facilities available at your PG</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {defaultAmenities.map((amenity) => (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-4 py-2 rounded-full border transition-colors ${
                            websiteData.website_config.amenities.includes(amenity)
                              ? "bg-teal-500 text-white border-teal-500"
                              : "bg-background hover:bg-muted"
                          }`}
                        >
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* House Rules */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">House Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background resize-none"
                      placeholder="1. No smoking inside premises&#10;2. Visitors allowed till 8 PM&#10;3. Maintain silence after 10 PM"
                      value={websiteData.website_config.house_rules}
                      onChange={(e) => handleWebsiteChange("house_rules", e.target.value)}
                    />
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Location Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Google Maps URL</Label>
                      <Input
                        placeholder="https://maps.google.com/..."
                        value={websiteData.website_config.google_maps_url}
                        onChange={(e) => handleWebsiteChange("google_maps_url", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nearby Landmarks</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Metro Station - 500m"
                          value={newLandmark}
                          onChange={(e) => setNewLandmark(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLandmark())}
                        />
                        <Button type="button" variant="outline" onClick={addLandmark}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {websiteData.website_config.nearby_landmarks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {websiteData.website_config.nearby_landmarks.map((landmark, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                            >
                              {landmark}
                              <button
                                type="button"
                                onClick={() => removeLandmark(i)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>WhatsApp Number</Label>
                        <Input
                          type="tel"
                          placeholder="e.g., 9876543210"
                          value={websiteData.website_config.contact_whatsapp}
                          onChange={(e) => handleWebsiteChange("contact_whatsapp", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="contact@yourpg.com"
                          value={websiteData.website_config.contact_email}
                          onChange={(e) => handleWebsiteChange("contact_email", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Display Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Display Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "show_rooms", label: "Show Rooms Section", desc: "Display available rooms on website" },
                      { key: "show_pricing", label: "Show Pricing", desc: "Display room prices publicly" },
                      { key: "show_contact_form", label: "Show Contact Form", desc: "Allow inquiries via form" },
                    ].map((option) => (
                      <div key={option.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={websiteData.website_config[option.key as keyof WebsiteConfig] as boolean}
                            onChange={(e) => handleWebsiteChange(option.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/dashboard/properties/${params.id}`}>
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
