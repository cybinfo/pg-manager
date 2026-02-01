/**
 * Edit Library Page
 *
 * Form to edit an existing library.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { ArrowLeft, Library, Loader2, MapPin, Clock, Wifi, Car, Lock } from "lucide-react"
import { toast } from "sonner"
import type { Library as LibraryType } from "@/types/library.types"

export default function EditLibraryPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [library, setLibrary] = useState<LibraryType | null>(null)

  const [formData, setFormData] = useState({
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
    has_ac: false,
    has_wifi: true,
    has_lockers: true,
    has_parking: false,
    is_active: true,
  })

  useEffect(() => {
    async function fetchLibrary() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("libraries")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error || !data) {
        toast.error("Library not found")
        router.push("/library")
        return
      }

      setLibrary(data)
      setFormData({
        name: data.name || "",
        code: data.code || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
        phone: data.phone || "",
        email: data.email || "",
        opening_time: data.opening_time?.slice(0, 5) || "06:00",
        closing_time: data.closing_time?.slice(0, 5) || "23:00",
        has_ac: data.has_ac || false,
        has_wifi: data.has_wifi || true,
        has_lockers: data.has_lockers || true,
        has_parking: data.has_parking || false,
        is_active: data.is_active !== false,
      })
      setLoading(false)
    }

    fetchLibrary()
  }, [params.id, router])

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

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("libraries")
        .update({
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
          is_active: formData.is_active,
        })
        .eq("id", params.id)

      if (error) {
        console.error("Error updating library:", error)
        toast.error(`Failed to update library: ${error.message}`)
        return
      }

      toast.success("Library updated successfully!")
      router.push(`/library/${params.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update library. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading library..." />
  }

  if (!library) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library/${params.id}`}>
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
                  disabled={saving}
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
                  disabled={saving}
                  maxLength={10}
                />
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
                    placeholder="e.g., 123, Main Street"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={saving}
                      type="tel"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="e.g., library@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={saving}
                    type="email"
                  />
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                  <Label htmlFor="has_ac" className="cursor-pointer">
                    Air Conditioning
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_wifi"
                    checked={formData.has_wifi}
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
                    checked={formData.has_lockers}
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
                    checked={formData.has_parking}
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
                  checked={formData.is_active}
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
          <Link href={`/library/${params.id}`}>
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
