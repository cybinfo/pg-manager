/**
 * New Library Page
 *
 * Form to create a new study library.
 */

"use client"

import Link from "next/link"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Library, Loader2, MapPin, Clock, Wifi, Car, Lock } from "lucide-react"
import { PermissionGuard } from "@/components/auth"

export default function NewLibraryPage() {
  return (
    <PermissionGuard permission="library.create">
      <NewLibraryContent />
    </PermissionGuard>
  )
}

function NewLibraryContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/library" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    workspaceId,
  } = useFormPage({
    table: "libraries",
    initialData: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "Uttar Pradesh",
      pincode: "",
      phone: "",
      email: "",
      opening_time: "06:00",
      closing_time: "23:00",
      has_ac: false as boolean,
      has_wifi: true as boolean,
      has_lockers: true as boolean,
      has_parking: false as boolean,
    },
    redirectTo: "/library",
    successMessage: "Library created successfully!",
    errorMessage: "Failed to create library",
    validate: (data) => {
      if (!data.name || !data.city) {
        return "Please fill in required fields (Name, City)"
      }
      return null
    },
    transform: (data, userId): Record<string, unknown> => ({
      owner_id: userId,
      workspace_id: workspaceId,
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
      settings: {
        time_slots: ["Morning", "Evening", "Night", "24 Hours"],
        default_hours_per_month: 9,
        grace_period_minutes: 15,
      },
    }),
    addOwnerId: false,
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
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
          <h1 className="text-3xl font-bold">Add Library</h1>
          <p className="text-muted-foreground">
            Add a new study library or reading room
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
                  Enter the basic information about your library
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Library Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., City Study Library"
                  value={formData.name as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Short Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., CSL"
                  value={formData.code as string}
                  onChange={handleChange}
                  disabled={saving}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Used for member codes</p>
              </div>
            </div>

            {/* Location */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="e.g., 123, Main Street, Near Railway Station"
                    value={formData.address as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g., Lucknow"
                      value={formData.city as string}
                      onChange={handleChange}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="e.g., Uttar Pradesh"
                      value={formData.state as string}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      placeholder="e.g., 226001"
                      value={formData.pincode as string}
                      onChange={handleChange}
                      disabled={saving}
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="e.g., 9876543210"
                      value={formData.phone as string}
                      onChange={handleChange}
                      disabled={saving}
                      type="tel"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Operating Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    name="opening_time"
                    type="time"
                    value={formData.opening_time as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    name="closing_time"
                    type="time"
                    value={formData.closing_time as string}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
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
                  <Label htmlFor="has_ac" className="flex items-center gap-2 cursor-pointer">
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/library">
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
              "Create Library"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
