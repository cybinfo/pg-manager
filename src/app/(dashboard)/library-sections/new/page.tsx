/**
 * New Library Section Page
 *
 * Form to create a new section in a library.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { ArrowLeft, Grid3X3, Loader2 } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"

interface Library {
  id: string
  name: string
  code: string | null
}

export default function NewLibrarySectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(true)

  const preselectedLibrary = searchParams.get("library")

  const [formData, setFormData] = useState({
    library_id: preselectedLibrary || "",
    name: "",
    section_number: "",
    floor: 0,
    is_ac: false,
    has_power_outlets: true,
    hourly_rate: "",
    monthly_rate: "",
  })

  useEffect(() => {
    async function fetchLibraries() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("libraries")
        .select("id, name, code")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (!error && data) {
        setLibraries(data)
      }
      setLoadingLibraries(false)
    }

    fetchLibraries()
  }, [])

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

    if (!formData.library_id || !formData.name) {
      showError("Please select a library and enter section name")
      return
    }

    if (!user || !workspaceId) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id")
        .eq("id", formData.library_id)
        .single()

      if (!library) {
        showError("Library not found")
        setLoading(false)
        return
      }

      const sectionData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: formData.library_id,
        name: formData.name,
        section_number: formData.section_number || null,
        floor: formData.floor || 0,
        is_ac: formData.is_ac,
        has_power_outlets: formData.has_power_outlets,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
        monthly_rate: formData.monthly_rate ? Number(formData.monthly_rate) : null,
      }, user.id)

      const { error } = await supabase.from("library_sections").insert(sectionData)

      if (error) {
        console.error("Error creating section:", error)
        showError(`Failed to create section: ${error.message}`)
        return
      }

      showSuccess("Section created successfully!")

      if (preselectedLibrary) {
        router.push(`/library/${preselectedLibrary}`)
      } else {
        router.push("/library-sections")
      }
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to create section. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-sections"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Section</h1>
          <p className="text-muted-foreground">
            Create a new section in a library
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
                  Enter section information and seating configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Library Selection */}
            <div className="space-y-2">
              <Label>Library *</Label>
              <Combobox
                options={libraryOptions}
                value={formData.library_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                searchPlaceholder="Search libraries..."
                emptyText="No libraries found"
                disabled={loading || loadingLibraries || !!preselectedLibrary}
              />
            </div>

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
          <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-sections"}>
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
              "Create Section"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
