"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { showDetailedError } from "@/lib/error-utils"

// Shared form components
import { PropertyAddressInput, CoverImageUpload, PhotoGallery } from "@/components/forms"

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Combine address lines into single address field
      const fullAddress = [formData.address_line1, formData.address_line2]
        .filter(Boolean)
        .join(", ")

      const { error } = await supabase.from("properties").insert({
        owner_id: user.id,
        name: formData.name,
        address: fullAddress || null,
        city: formData.city,
        state: formData.state || null,
        pincode: formData.pincode || null,
        manager_name: formData.manager_name || null,
        manager_phone: formData.manager_phone || null,
        cover_image: formData.cover_image || null,
        photos: formData.photos.length > 0 ? formData.photos : null,
      })

      if (error) {
        console.error("Error creating property:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      toast.success("Property created successfully!")
      router.push("/dashboard/properties")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error?.message || "Failed to create property. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/properties">
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

            {/* Address Section - Using shared component */}
            <PropertyAddressInput
              line1={formData.address_line1}
              line2={formData.address_line2}
              city={formData.city}
              state={formData.state}
              pincode={formData.pincode}
              onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              disabled={loading}
            />

            {/* Property Photos Section - Using shared components */}
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

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/dashboard/properties">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
