"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Globe,
  ExternalLink,
  Copy,
  CheckCircle,
  X,
  Plus,
  Sparkles,
} from "lucide-react"
import { showSuccess } from "@/lib/toast-helpers"
import { brandGradient } from "@/lib/design-tokens"
import { PROPERTY_TYPE_OPTIONS } from "@/lib/constants/form-options"

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

interface WebsiteData {
  website_slug: string
  website_enabled: boolean
  website_config: WebsiteConfig
}

const defaultAmenities = [
  "WiFi", "Parking", "Food", "CCTV", "Power Backup",
  "Water Supply", "Laundry", "Housekeeping", "Security",
  "AC Rooms", "Gym", "TV Room", "Study Room", "Terrace Access"
]

interface WebsiteSettingsTabProps {
  websiteData: WebsiteData
  onWebsiteChange: (field: string, value: string | boolean | string[]) => void
  propertyName: string
}

export function WebsiteSettingsTab({
  websiteData,
  onWebsiteChange,
  propertyName,
}: WebsiteSettingsTabProps) {
  const [copied, setCopied] = useState(false)
  const [newLandmark, setNewLandmark] = useState("")

  const toggleAmenity = (amenity: string) => {
    const current = websiteData.website_config.amenities
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity]
    onWebsiteChange("amenities", updated)
  }

  const addLandmark = () => {
    if (newLandmark.trim()) {
      onWebsiteChange("nearby_landmarks", [
        ...websiteData.website_config.nearby_landmarks,
        newLandmark.trim(),
      ])
      setNewLandmark("")
    }
  }

  const removeLandmark = (index: number) => {
    const updated = websiteData.website_config.nearby_landmarks.filter((_, i) => i !== index)
    onWebsiteChange("nearby_landmarks", updated)
  }

  const generateSlug = () => {
    const slug = propertyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50)
    onWebsiteChange("website_slug", slug)
  }

  const copyWebsiteUrl = () => {
    const url = `${window.location.origin}/pg/${websiteData.website_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showSuccess("Website URL copied!")
  }

  return (
    <div className="space-y-6">
      {/* Enable Website Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${brandGradient.solid} flex items-center justify-center`}>
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
                onChange={(e) => onWebsiteChange("website_enabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium">
                {websiteData.website_enabled ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>

          {websiteData.website_enabled && websiteData.website_slug && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <Label className="text-primary">Your Website URL</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 px-3 py-2 bg-card rounded border text-sm">
                  {typeof window !== "undefined" ? window.location.origin : ""}/pg/{websiteData.website_slug}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyWebsiteUrl}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-success" />
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
                        onWebsiteChange(
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Property Type">
                  <Select
                    value={websiteData.website_config.property_type}
                    onChange={(e) => onWebsiteChange("property_type", e.target.value)}
                    options={PROPERTY_TYPE_OPTIONS}
                  />
                </FormField>
                <FormField label="Established Year">
                  <Input
                    type="number"
                    placeholder="e.g., 2020"
                    value={websiteData.website_config.established_year}
                    onChange={(e) => onWebsiteChange("established_year", e.target.value)}
                    min="1990"
                    max={new Date().getFullYear()}
                  />
                </FormField>
              </div>

              <FormField label="Tagline">
                <Input
                  placeholder="e.g., Your Home Away From Home"
                  value={websiteData.website_config.tagline}
                  onChange={(e) => onWebsiteChange("tagline", e.target.value)}
                  maxLength={100}
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  className="w-full min-h-[120px] px-3 py-2 rounded-md border bg-background resize-none"
                  placeholder="Tell potential tenants about your PG - facilities, environment, what makes it special..."
                  value={websiteData.website_config.description}
                  onChange={(e) => onWebsiteChange("description", e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {websiteData.website_config.description.length}/1000
                </p>
              </FormField>
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
                  onChange={(e) => onWebsiteChange("cover_photo_url", e.target.value)}
                />
                {websiteData.website_config.cover_photo_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border relative h-48">
                    <Image
                      src={websiteData.website_config.cover_photo_url}
                      alt="Cover preview"
                      fill
                      className="object-cover"
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
                        ? "bg-primary text-white border-primary"
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
                onChange={(e) => onWebsiteChange("house_rules", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Google Maps URL">
                <Input
                  placeholder="https://maps.google.com/..."
                  value={websiteData.website_config.google_maps_url}
                  onChange={(e) => onWebsiteChange("google_maps_url", e.target.value)}
                />
              </FormField>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="WhatsApp Number">
                  <Input
                    type="tel"
                    placeholder="e.g., 9876543210"
                    value={websiteData.website_config.contact_whatsapp}
                    onChange={(e) => onWebsiteChange("contact_whatsapp", e.target.value)}
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="contact@yourpg.com"
                    value={websiteData.website_config.contact_email}
                    onChange={(e) => onWebsiteChange("contact_email", e.target.value)}
                  />
                </FormField>
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
                      onChange={(e) => onWebsiteChange(option.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
