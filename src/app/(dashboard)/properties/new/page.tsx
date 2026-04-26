"use client"

import Link from "next/link"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-components"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { requiredField } from "@/lib/validation"

// Shared form components
import { PropertyAddressInput, CoverImageUpload, PhotoGallery } from "@/components/forms"
import { PermissionGuard } from "@/components/auth"

export default function NewPropertyPage() {
  return (
    <PermissionGuard permission="properties.create">
      <NewPropertyContent />
    </PermissionGuard>
  )
}

function NewPropertyContent() {
  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    validateField,
  } = useFormPage({
    table: "properties",
    initialData: {
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
    },
    redirectTo: "/properties",
    successMessage: "Property created successfully!",
    errorMessage: "Failed to create property",
    useCreatedBy: false,
    validationSchema: {
      name: requiredField("Property name"),
      city: requiredField("City"),
    },
    transform: (data, userId) => {
      // Combine address lines into single address field
      const fullAddress = [data.address_line1, data.address_line2]
        .filter(Boolean)
        .join(", ")

      return {
        owner_id: userId,
        created_by: userId,
        name: data.name,
        address: fullAddress || null,
        city: data.city,
        state: data.state || null,
        pincode: data.pincode || null,
        manager_name: data.manager_name || null,
        manager_phone: data.manager_phone || null,
        cover_image: data.cover_image || null,
        photos: (data.photos as string[]).length > 0 ? data.photos : null,
      }
    },
    addOwnerId: false,
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Property</h1>
          <p className="text-muted-foreground">
            Add a new PG building or property
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>
                  Enter the basic information about your property
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Property Name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Sunrise PG, Main Building"
                value={formData.name as string}
                onChange={handleChange}
                onBlur={() => validateField("name")}
                disabled={saving}
              />
            </FormField>

            {/* Address Section - Using shared component */}
            <PropertyAddressInput
              line1={formData.address_line1 as string}
              line2={formData.address_line2 as string}
              city={formData.city as string}
              state={formData.state as string}
              pincode={formData.pincode as string}
              onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              disabled={saving}
            />

            {/* Property Photos Section - Using shared components */}
            <div className="border-t pt-4 mt-4 space-y-4">
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

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Property Manager (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Manager Name" htmlFor="manager_name">
                  <Input
                    id="manager_name"
                    name="manager_name"
                    placeholder="e.g., Ramesh Kumar"
                    value={formData.manager_name as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Manager Phone" htmlFor="manager_phone">
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/properties">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Property"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
