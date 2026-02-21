/**
 * Edit Library Section Page
 *
 * Form to edit an existing section.
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Grid3X3, Loader2 } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageLoading } from "@/components/ui/loading"

interface SectionData {
  id: string
  library_id: string
  name: string
  section_number: string | null
  floor: number
  is_ac: boolean
  has_power_outlets: boolean
  hourly_rate: number | null
  monthly_rate: number | null
  library?: { id: string; name: string } | null
}

export default function EditLibrarySectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [section, setSection] = useState<SectionData | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    section_number: "",
    floor: 0,
    is_ac: false,
    has_power_outlets: true,
    hourly_rate: "",
    monthly_rate: "",
  })

  useEffect(() => {
    async function fetchSection() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_sections")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        showError("Section not found")
        router.push("/library-sections")
        return
      }

      setSection(data)
      setFormData({
        name: data.name || "",
        section_number: data.section_number || "",
        floor: data.floor || 0,
        is_ac: data.is_ac || false,
        has_power_outlets: data.has_power_outlets ?? true,
        hourly_rate: data.hourly_rate?.toString() || "",
        monthly_rate: data.monthly_rate?.toString() || "",
      })
      setLoadingData(false)
    }

    fetchSection()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? (value === "" ? "" : Number(value)) : value,
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

    if (!formData.name) {
      showError("Please enter section name")
      return
    }

    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const updateData = {
        name: formData.name,
        section_number: formData.section_number || null,
        floor: formData.floor || 0,
        is_ac: formData.is_ac,
        has_power_outlets: formData.has_power_outlets,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
        monthly_rate: formData.monthly_rate ? Number(formData.monthly_rate) : null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("library_sections")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("Error updating section:", error)
        showError(`Failed to update section: ${error.message}`)
        return
      }

      showSuccess("Section updated successfully!")
      router.push(`/library-sections/${id}`)
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to update section. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading section..." />
  }

  if (!section) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-sections/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Section</h1>
          <p className="text-muted-foreground">
            {section.library?.name} • {section.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Section Details</CardTitle>
                <CardDescription>
                  Update section information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Section Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., AC Hall, Silent Zone"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section_number">Section Number</Label>
                <Input
                  id="section_number"
                  name="section_number"
                  placeholder="e.g., A, B, C"
                  value={formData.section_number}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                name="floor"
                type="number"
                placeholder="e.g., 0, 1, 2"
                value={formData.floor}
                onChange={handleChange}
                disabled={loading}
                min={0}
              />
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Features</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_ac"
                    checked={formData.is_ac}
                    onCheckedChange={(checked) => handleCheckboxChange("is_ac", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="is_ac" className="cursor-pointer">
                    Air Conditioned
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_power_outlets"
                    checked={formData.has_power_outlets}
                    onCheckedChange={(checked) => handleCheckboxChange("has_power_outlets", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_power_outlets" className="cursor-pointer">
                    Power Outlets
                  </Label>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Pricing (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
                  <Input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_rate">Monthly Rate (₹)</Label>
                  <Input
                    id="monthly_rate"
                    name="monthly_rate"
                    type="number"
                    placeholder="e.g., 1000"
                    value={formData.monthly_rate}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-sections/${id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
