"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"
import { ArrowLeft, Building2, Loader2, Image } from "lucide-react"
import { toast } from "sonner"
import { showDetailedError } from "@/lib/error-utils"

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

            {/* Address Section - Unified style matching tenant address */}
            <div className="space-y-3">
              <Label>Property Address</Label>
              <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <Input
                  name="address_line1"
                  placeholder="Address Line 1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  disabled={loading}
                />
                <Input
                  name="address_line2"
                  placeholder="Address Line 2 (optional)"
                  value={formData.address_line2}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    name="city"
                    placeholder="City *"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <Input
                    name="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Input
                    name="pincode"
                    placeholder="PIN Code"
                    value={formData.pincode}
                    onChange={handleChange}
                    disabled={loading}
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Property Photos Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Property Photos</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <p className="text-sm text-muted-foreground">
                    Main photo shown in property listings
                  </p>
                  <FileUpload
                    bucket="property-photos"
                    folder="covers"
                    value={formData.cover_image}
                    onChange={(url) => {
                      const urlStr = Array.isArray(url) ? url[0] : url
                      setFormData(prev => ({ ...prev, cover_image: urlStr || "" }))
                    }}
                    accept="image/*"
                  />
                  {formData.cover_image && (
                    <div className="mt-2">
                      <img
                        src={formData.cover_image}
                        alt="Cover preview"
                        className="w-32 h-24 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Gallery Photos</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional photos of the property (up to 10)
                  </p>
                  <FileUpload
                    bucket="property-photos"
                    folder="gallery"
                    value={formData.photos}
                    onChange={(urls) => {
                      const urlArr = Array.isArray(urls) ? urls : urls ? [urls] : []
                      setFormData(prev => ({
                        ...prev,
                        photos: urlArr.slice(0, 10)
                      }))
                    }}
                    multiple
                    accept="image/*"
                  />
                  {formData.photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.photos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={photo}
                            alt={`Gallery ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== idx)
                              }))
                            }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
