/**
 * Edit Library Page
 *
 * Form to edit an existing library.
 */

"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { ArrowLeft, Library, Loader2, MapPin, Clock, Wifi, Car, Lock } from "lucide-react"
import { PermissionGuard } from "@/components/auth"

export default function EditLibraryPage() {
  return (
    <PermissionGuard permission="library.edit">
      <EditLibraryContent />
    </PermissionGuard>
  )
}

function EditLibraryContent() {
  const params = useParams()
  const id = params.id as string
  const { backHref } = useBackNavigation({ defaultHref: "/library" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    errors,
  } = useFormEditPage({
    table: "libraries",
    id,
    initialData: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      opening_time: "06:00",
      closing_time: "23:00",
      has_ac: false as boolean,
      has_wifi: true as boolean,
      has_lockers: true as boolean,
      has_parking: false as boolean,
      is_active: true as boolean,
    },
    redirectTo: `/library/${id}`,
    successMessage: "Library updated successfully!",
    errorMessage: "Failed to update library",
    mapToForm: (record) => ({
      name: (record.name as string) || "",
      code: (record.code as string) || "",
      address: (record.address as string) || "",
      city: (record.city as string) || "",
      state: (record.state as string) || "",
      pincode: (record.pincode as string) || "",
      phone: (record.phone as string) || "",
      email: (record.email as string) || "",
      opening_time: (record.opening_time as string)?.slice(0, 5) || "06:00",
      closing_time: (record.closing_time as string)?.slice(0, 5) || "23:00",
      has_ac: (record.has_ac as boolean) || false,
      has_wifi: (record.has_wifi as boolean) || true,
      has_lockers: (record.has_lockers as boolean) || true,
      has_parking: (record.has_parking as boolean) || false,
      is_active: (record.is_active as boolean) !== false,
    }),
    validate: (data) => {
      if (!data.name || !data.city) {
        return "Please fill in required fields (Name, City)"
      }
      return null
    },
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      code: data.code || null,
      address: data.address || null,
      city: data.city,
      state: data.state || null,
      pincode: data.pincode || null,
      phone: data.phone || null,
      email: data.email || null,
      opening_time: data.opening_time || null,
      closing_time: data.closing_time || null,
      has_ac: data.has_ac,
      has_wifi: data.has_wifi,
      has_lockers: data.has_lockers,
      has_parking: data.has_parking,
      is_active: data.is_active,
    }),
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  if (loading) {
    return <PageLoading message="Loading library..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Library</h1>
          <p className="text-muted-foreground">
            Update library information
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Library Details</CardTitle>
                <CardDescription>
                  Update the library information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Library Name" required error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., City Study Library"
                  value={formData.name as string}
                  onChange={handleChange}
                  required
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
              <div className="space-y-4">
                <FormField label="Address" error={errors.address}>
                  <Input
                    id="address"
                    name="address"
                    placeholder="e.g., 123, Main Street"
                    value={formData.address as string}
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
                      required
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
                <FormField label="Email" error={errors.email}>
                  <Input
                    id="email"
                    name="email"
                    placeholder="e.g., library@example.com"
                    value={formData.email as string}
                    onChange={handleChange}
                    disabled={saving}
                    type="email"
                  />
                </FormField>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Operating Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Opening Time" error={errors.opening_time}>
                  <Input
                    id="opening_time"
                    name="opening_time"
                    type="time"
                    value={formData.opening_time as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Closing Time" error={errors.closing_time}>
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

            {/* Features */}
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
                  <Label htmlFor="has_ac" className="cursor-pointer">
                    Air Conditioning
                  </Label>
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
                  Library is active and accepting members
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
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
