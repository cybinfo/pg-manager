"use client"

import Link from "next/link"
import { useState } from "react"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBusinessOptions } from "@/lib/hooks/useBusinessOptions"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField, Select } from "@/components/ui/form-components"
import { Checkbox } from "@/components/ui/checkbox"
import { requiredField } from "@/lib/validation"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { PropertyAddressInput, CoverImageUpload, PhotoGallery } from "@/components/forms"
import { withCreatedBy } from "@/lib/audit"
import { ENTITY_TYPE_OPTIONS } from "@/types/entity.types"
import type { EntityType } from "@/types/entity.types"
import {
  Building2,
  Library,
  Clock,
  Wifi,
  Car,
  Lock,
  MapPin,
  User,
} from "lucide-react"

export default function NewEntityPage() {
  return (
    <PermissionGuard permission="properties.create">
      <NewEntityContent />
    </PermissionGuard>
  )
}

function NewEntityContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/entities" })
  const businessOptions = useBusinessOptions()
  const { workspaceId } = useAuthContext()
  const [entityType, setEntityType] = useState<EntityType>("pg")

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    validateField,
  } = useFormPage({
    table: "entities",
    initialData: {
      name: "",
      business_id: "",
      code: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      manager_name: "",
      manager_phone: "",
      cover_image: "",
      photos: [] as string[],
      opening_time: "06:00",
      closing_time: "23:00",
      has_ac: false as boolean,
      has_wifi: true as boolean,
      has_lockers: true as boolean,
      has_parking: false as boolean,
    },
    redirectTo: "/entities",
    successMessage: "Entity created successfully!",
    errorMessage: "Failed to create entity",
    useCreatedBy: false,
    validationSchema: {
      name: requiredField("Name"),
      city: requiredField("City"),
    },
    transform: (data, userId) => {
      const fullAddress = [data.address_line1, data.address_line2]
        .filter(Boolean)
        .join(", ")

      const isPG = entityType === "pg"
      const isLibrary = entityType === "library"

      const settings: Record<string, unknown> = {}
      if (isLibrary) {
        settings.has_ac = data.has_ac
        settings.has_wifi = data.has_wifi
        settings.has_lockers = data.has_lockers
        settings.has_parking = data.has_parking
        settings.time_slots = ["Morning", "Evening", "Night", "24 Hours"]
        settings.default_hours_per_month = 9
        settings.grace_period_minutes = 15
      }

      return withCreatedBy({
        owner_id: userId,
        workspace_id: workspaceId,
        type: entityType,
        business_id: (data.business_id as string) || null,
        name: data.name,
        code: (data.code as string) || null,
        address: fullAddress || null,
        city: data.city,
        state: (data.state as string) || null,
        pincode: (data.pincode as string) || null,
        phone: (data.phone as string) || null,
        email: (data.email as string) || null,
        manager_name: isPG ? ((data.manager_name as string) || null) : null,
        manager_phone: isPG ? ((data.manager_phone as string) || null) : null,
        cover_image: isPG ? ((data.cover_image as string) || null) : null,
        photos: isPG && (data.photos as string[]).length > 0 ? data.photos : null,
        opening_time: isLibrary ? ((data.opening_time as string) || null) : null,
        closing_time: isLibrary ? ((data.closing_time as string) || null) : null,
        settings: Object.keys(settings).length > 0 ? settings : {},
        is_active: true,
      }, userId) as unknown as Record<string, unknown>
    },
    addOwnerId: false,
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const isPG = entityType === "pg"
  const isLibrary = entityType === "library"

  const EntityIcon = isLibrary ? Library : Building2

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Entity"
        subtitle="Add a new PG property, library, or other business location"
        backHref={backHref}
        backLabel="All Entities"
        icon={Building2}
        breadcrumbs={[
          { label: "Entities", href: "/entities" },
          { label: "Add Entity" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity Type Selector */}
        <DetailSection title="Entity Type" description="What kind of location is this?" icon={Building2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ENTITY_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.value === "library" ? Library : Building2
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEntityType(opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    entityType === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </DetailSection>

        {/* Basic Details */}
        <DetailSection title="Basic Details" description={`Enter the basic information about your ${entityType === "pg" ? "property" : entityType}`} icon={EntityIcon}>
          <FormField label="Business" hint="Which business does this entity belong to?">
            <Select
              name="business_id"
              value={formData.business_id as string}
              onChange={handleChange}
              placeholder="Select business"
              disabled={saving}
              options={businessOptions}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder={isPG ? "e.g., Sunrise PG" : isLibrary ? "e.g., City Study Library" : "e.g., FitZone Gym"}
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>
            <FormField label="Short Code" hint="Used for codes and references" error={errors.code}>
              <Input
                id="code"
                name="code"
                placeholder="e.g., CSL"
                value={formData.code as string}
                onChange={handleChange}
                disabled={saving}
                maxLength={10}
              />
            </FormField>
          </div>

          {/* Location */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            {isPG ? (
              <PropertyAddressInput
                line1={formData.address_line1 as string}
                line2={formData.address_line2 as string}
                city={formData.city as string}
                state={formData.state as string}
                pincode={formData.pincode as string}
                onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                disabled={saving}
              />
            ) : (
              <div className="space-y-4">
                <FormField label="Address" error={errors.address_line1}>
                  <Input
                    name="address_line1"
                    placeholder="e.g., 123, Main Street, Near Railway Station"
                    value={formData.address_line1 as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="City" required error={errors.city}>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g., Lucknow"
                      value={formData.city as string}
                      onChange={handleChange}
                      onBlur={() => validateField("city")}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="State" error={errors.state}>
                    <Input
                      id="state"
                      name="state"
                      placeholder="e.g., Uttar Pradesh"
                      value={formData.state as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Pincode" error={errors.pincode}>
                    <Input
                      id="pincode"
                      name="pincode"
                      placeholder="e.g., 226001"
                      value={formData.pincode as string}
                      onChange={handleChange}
                      disabled={saving}
                      maxLength={6}
                    />
                  </FormField>
                  <FormField label="Phone" error={errors.phone}>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="e.g., 9876543210"
                      value={formData.phone as string}
                      onChange={handleChange}
                      disabled={saving}
                      type="tel"
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* PG-specific: Manager info + Photos */}
          {isPG && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Property Manager (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Manager Name">
                    <Input
                      id="manager_name"
                      name="manager_name"
                      placeholder="e.g., Ramesh Kumar"
                      value={formData.manager_name as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Manager Phone">
                    <Input
                      id="manager_phone"
                      name="manager_phone"
                      placeholder="e.g., 9876543210"
                      value={formData.manager_phone as string}
                      onChange={handleChange}
                      disabled={saving}
                      type="tel"
                    />
                  </FormField>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <CoverImageUpload
                  value={formData.cover_image as string}
                  onChange={(url) => setFormData(prev => ({ ...prev, cover_image: url }))}
                  label="Cover Image"
                  description="Main photo shown in property listings"
                  bucket="property-photos"
                  folder="covers"
                  disabled={saving}
                />
                <PhotoGallery
                  photos={formData.photos as string[]}
                  onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                  label="Gallery Photos"
                  description="Additional photos of the property (up to 10)"
                  maxPhotos={10}
                  bucket="property-photos"
                  folder="gallery"
                  disabled={saving}
                />
              </div>
            </>
          )}

          {/* Library-specific: Hours + Amenities */}
          {isLibrary && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Operating Hours
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Opening Time">
                    <Input
                      id="opening_time"
                      name="opening_time"
                      type="time"
                      value={formData.opening_time as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Closing Time">
                    <Input
                      id="closing_time"
                      name="closing_time"
                      type="time"
                      value={formData.closing_time as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Amenities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_ac"
                      checked={formData.has_ac as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange("has_ac", checked as boolean)}
                      disabled={saving}
                    />
                    <Label htmlFor="has_ac" className="cursor-pointer">Air Conditioning</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_wifi"
                      checked={formData.has_wifi as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange("has_wifi", checked as boolean)}
                      disabled={saving}
                    />
                    <Label htmlFor="has_wifi" className="flex items-center gap-2 cursor-pointer">
                      <Wifi className="h-4 w-4" />
                      WiFi
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_lockers"
                      checked={formData.has_lockers as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange("has_lockers", checked as boolean)}
                      disabled={saving}
                    />
                    <Label htmlFor="has_lockers" className="flex items-center gap-2 cursor-pointer">
                      <Lock className="h-4 w-4" />
                      Lockers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_parking"
                      checked={formData.has_parking as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange("has_parking", checked as boolean)}
                      disabled={saving}
                    />
                    <Label htmlFor="has_parking" className="flex items-center gap-2 cursor-pointer">
                      <Car className="h-4 w-4" />
                      Parking
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/entities">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Entity"}
          </Button>
        </div>
      </form>
    </div>
  )
}
