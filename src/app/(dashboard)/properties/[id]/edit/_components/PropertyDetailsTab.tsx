"use client"

import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import { PropertyAddressInput, CoverImageUpload, PhotoGallery } from "@/components/forms"
import { useBusinessOptions } from "@/lib/hooks/useBusinessOptions"

interface PropertyFormData {
  name: string
  business_id: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  manager_name: string
  manager_phone: string
  cover_image: string
  photos: string[]
}

interface PropertyDetailsTabProps {
  formData: PropertyFormData
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  setFormData: (updater: (prev: PropertyFormData) => PropertyFormData) => void
  loading: boolean
}

export function PropertyDetailsTab({ formData, onChange, setFormData, loading }: PropertyDetailsTabProps) {
  const businessOptions = useBusinessOptions()

  return (
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
        <FormField label="Business" htmlFor="business_id" hint="Which business does this property belong to?">
          <Select
            name="business_id"
            value={formData.business_id}
            onChange={onChange}
            placeholder="Select business"
            disabled={loading}
            options={businessOptions}
          />
        </FormField>

        <FormField label="Property Name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            placeholder="e.g., Sunrise PG, Main Building"
            value={formData.name}
            onChange={onChange}
            required
            disabled={loading}
          />
        </FormField>

        <PropertyAddressInput
          line1={formData.address_line1}
          line2={formData.address_line2}
          city={formData.city}
          state={formData.state}
          pincode={formData.pincode}
          onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          disabled={loading}
        />

        <div className="border-t pt-4 mt-4 space-y-4">
          <CoverImageUpload
            value={formData.cover_image}
            onChange={(url) => setFormData(prev => ({ ...prev, cover_image: url }))}
            label="Cover Image"
            description="Main photo shown in property listings"
            bucket="property-photos"
            folder="covers"
            disabled={loading}
          />

          <PhotoGallery
            photos={formData.photos}
            onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
            label="Gallery Photos"
            description="Additional photos of the property (up to 10)"
            maxPhotos={10}
            bucket="property-photos"
            folder="gallery"
            disabled={loading}
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
                value={formData.manager_name}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
            <FormField label="Manager Phone" htmlFor="manager_phone">
              <Input
                id="manager_phone"
                name="manager_phone"
                placeholder="e.g., 9876543210"
                value={formData.manager_phone}
                onChange={onChange}
                disabled={loading}
                type="tel"
              />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
