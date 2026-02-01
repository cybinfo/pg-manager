/**
 * New Library Page
 *
 * Form to create a new study library.
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Library, Loader2, MapPin, Clock, Wifi, Car, Lock } from "lucide-react"
import { toast } from "sonner"
import { withCreatedBy } from "@/lib/audit"

export default function NewLibraryPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
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
    has_ac: false,
    has_wifi: true,
    has_lockers: true,
    has_parking: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.city) {
      toast.error("Please fill in required fields (Name, City)")
      return
    }

    if (!user || !workspaceId) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const libraryData = withCreatedBy({
        owner_id: user.id,
        workspace_id: workspaceId,
        name: formData.name,
        code: formData.code || null,
        address: formData.address || null,
        city: formData.city,
        state: formData.state || null,
        pincode: formData.pincode || null,
        phone: formData.phone || null,
        email: formData.email || null,
        opening_time: formData.opening_time || null,
        closing_time: formData.closing_time || null,
        has_ac: formData.has_ac,
        has_wifi: formData.has_wifi,
        has_lockers: formData.has_lockers,
        has_parking: formData.has_parking,
        settings: {
          time_slots: ["Morning", "Evening", "Night", "24 Hours"],
          default_hours_per_month: 9,
          grace_period_minutes: 15,
        },
      }, user.id)

      const { error } = await supabase.from("libraries").insert(libraryData)

      if (error) {
        console.error("Error creating library:", error)
        toast.error(`Failed to create library: ${error.message}`)
        return
      }

      toast.success("Library created successfully!")
      router.push("/library")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create library. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/library">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Library Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., City Study Library"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Short Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., CSL"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={loading}
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
                      placeholder="e.g., Lucknow"
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
                      placeholder="e.g., Uttar Pradesh"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      placeholder="e.g., 226001"
                      value={formData.pincode}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="e.g., 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={loading}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    name="opening_time"
                    type="time"
                    value={formData.opening_time}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    name="closing_time"
                    type="time"
                    value={formData.closing_time}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Amenities</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_ac"
                    checked={formData.has_ac}
                    onCheckedChange={(checked) => handleCheckboxChange("has_ac", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_ac" className="flex items-center gap-2 cursor-pointer">
                    Air Conditioning
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_wifi"
                    checked={formData.has_wifi}
                    onCheckedChange={(checked) => handleCheckboxChange("has_wifi", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_wifi" className="flex items-center gap-2 cursor-pointer">
                    <Wifi className="h-4 w-4" />
                    WiFi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_lockers"
                    checked={formData.has_lockers}
                    onCheckedChange={(checked) => handleCheckboxChange("has_lockers", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_lockers" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Lockers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_parking"
                    checked={formData.has_parking}
                    onCheckedChange={(checked) => handleCheckboxChange("has_parking", checked as boolean)}
                    disabled={loading}
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
              "Create Library"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
