"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useBusinessOptions } from "@/lib/hooks/useBusinessOptions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField, Select } from "@/components/ui/form-components"
import { Checkbox } from "@/components/ui/checkbox"
import { requiredField } from "@/lib/validation"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { PageLoading } from "@/components/ui/loading"
import { TableBadge } from "@/components/ui/data-table"
import { PropertyAddressInput, CoverImageUpload, PhotoGallery } from "@/components/forms"
import { ENTITY_TYPE_LABELS } from "@/types/entity.types"
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

export default function EditEntityPage() {
  return (
    <PermissionGuard permission="properties.edit">
      <EditEntityContent />
    </PermissionGuard>
  )
}

function EditEntityContent() {
  const params = useParams()
  const id = params.id as string
  const { backHref } = useBackNavigation({ defaultHref: `/entities/${id}` })
  const businessOptions = useBusinessOptions()

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    errors,
    validateField,
  } = useFormEditPage({
    table: "entities",
    id,
    initialData: {
      name: "",
      type: "pg" as EntityType,
      business_id: "",
      code: "",
      address_line1: "",
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
      has_wifi: false as boolean,
      has_lockers: false as boolean,
      has_parking: false as boolean,
      is_active: true as boolean,
    },
    redirectTo: `/entities/${id}`,
    successMessage: "Entity updated successfully!",
    errorMessage: "Failed to update entity",
    mapToForm: (record) => {
      const settings = (record.settings as Record<string, unknown>) || {}
      return {
        name: (record.name as string) || "",
        type: (record.type as EntityType) || "pg",
        business_id: (record.business_id as string) || "",
        code: (record.code as string) || "",
        address_line1: (record.address as string) || "",
        city: (record.city as string) || "",
        state: (record.state as string) || "",
        pincode: (record.pincode as string) || "",
        phone: (record.phone as string) || "",
        email: (record.email as string) || "",
        manager_name: (record.manager_name as string) || "",
        manager_phone: (record.manager_phone as string) || "",
        cover_image: (record.cover_image as string) || "",
        photos: (record.photos as string[]) || [],
        opening_time: (record.opening_time as string)?.slice(0, 5) || "06:00",
        closing_time: (record.closing_time as string)?.slice(0, 5) || "23:00",
        has_ac: (settings.has_ac as boolean) ?? false,
        has_wifi: (settings.has_wifi as boolean) ?? false,
        has_lockers: (settings.has_lockers as boolean) ?? false,
        has_parking: (settings.has_parking as boolean) ?? false,
        is_active: (record.is_active as boolean) !== false,
      }
    },
    validationSchema: {
      name: requiredField("Name"),
      city: requiredField("City"),
    },
    transform: (data): Record<string, unknown> => {
      const entityType = data.type as EntityType
      const isPG = entityType === "pg"
      const isLibrary = entityType === "library"

      const settings: Record<string, unknown> = {}
      if (isLibrary) {
        settings.has_ac = data.has_ac
        settings.has_wifi = data.has_wifi
        settings.has_lockers = data.has_lockers
        settings.has_parking = data.has_parking
      }

      return {
        name: data.name,
        business_id: (data.business_id as string) || null,
        code: (data.code as string) || null,
        address: (data.address_line1 as string) || null,
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
        is_active: data.is_active,
      }
    },
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  if (loading) {
    return <PageLoading message="Loading entity..." />
  }

  const entityType = formData.type as EntityType
  const isPG = entityType === "pg"
  const isLibrary = entityType === "library"
  const EntityIcon = isLibrary ? Library : Building2

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Entity"
        subtitle={
          <span className="flex items-center gap-2">
            {(formData.name as string) || "Update entity details"}
            <TableBadge variant={isLibrary ? "success" : "info"}>
              {ENTITY_TYPE_LABELS[entityType] || entityType}
            </TableBadge>
          </span>
        }
        backHref={backHref}
        backLabel="Entity Details"
        icon={EntityIcon}
        breadcrumbs={[
          { label: "Entities", href: "/entities" },
          { label: (formData.name as string) || "Entity", href: `/entities/${id}` },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Entity Details" description="Update entity information" icon={EntityIcon}>
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
                placeholder="Entity name"
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>
            <FormField label="Short Code" error={errors.code}>
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
                line2=""
                city={formData.city as string}
                state={formData.state as string}
                pincode={formData.pincode as string}
                onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                disabled={saving}
              />
            ) : (
              <div className="space-y-4">
                <FormField label="Address">
                  <Input
                    name="address_line1"
                    placeholder="Street address"
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
                      placeholder="City"
                      value={formData.city as string}
                      onChange={handleChange}
                      onBlur={() => validateField("city")}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="State">
                    <Input
                      id="state"
                      name="state"
                      placeholder="State"
                      value={formData.state as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Pincode">
                    <Input
                      id="pincode"
                      name="pincode"
                      placeholder="Pincode"
                      value={formData.pincode as string}
                      onChange={handleChange}
                      disabled={saving}
                      maxLength={6}
                    />
                  </FormField>
                  <FormField label="Phone">
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Phone"
                      value={formData.phone as string}
                      onChange={handleChange}
                      disabled={saving}
                      type="tel"
                    />
                  </FormField>
                </div>
                <FormField label="Email">
                  <Input
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email as string}
                    onChange={handleChange}
                    disabled={saving}
                    type="email"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* PG: Manager + Photos */}
          {isPG && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Property Manager
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Manager Name">
                    <Input
                      id="manager_name"
                      name="manager_name"
                      placeholder="Manager name"
                      value={formData.manager_name as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Manager Phone">
                    <Input
                      id="manager_phone"
                      name="manager_phone"
                      placeholder="Manager phone"
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
                  description="Additional photos (up to 10)"
                  maxPhotos={10}
                  bucket="property-photos"
                  folder="gallery"
                  disabled={saving}
                />
              </div>
            </>
          )}

          {/* Library: Hours + Amenities */}
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

          {/* Status */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active as boolean}
                onCheckedChange={(checked) => handleCheckboxChange("is_active", checked as boolean)}
                disabled={saving}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Entity is active and operational
              </Label>
            </div>
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/entities/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
