/**
 * New Library Section Page
 *
 * Form to create a new section in a library.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { requiredField, requiredSelect } from "@/lib/validation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { Grid3X3, Loader2 } from "lucide-react"
import { DetailHero } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import type { LibraryOption } from "@/types/library.types"

export default function NewLibrarySectionPage() {
  return (
    <PermissionGuard permission="library_sections.create">
      <NewLibrarySectionContent />
    </PermissionGuard>
  )
}

function NewLibrarySectionContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/library-sections" })
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "library_sections",
    initialData: {
      library_id: "",
      name: "",
      section_number: "",
      floor: 0,
      is_ac: false,
      has_power_outlets: true,
      hourly_rate: "",
      monthly_rate: "",
    },
    preSelectFields: ["library"],
    redirectTo: "/library-sections",
    successMessage: "Section created successfully!",
    errorMessage: "Failed to create section",
    validationSchema: {
      library_id: requiredSelect("Library"),
      name: requiredField("Section Name"),
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id")
        .eq("id", data.library_id)
        .single()

      if (!library) {
        throw new Error("Library not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      const sectionData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: data.library_id,
        name: data.name,
        section_number: data.section_number || null,
        floor: data.floor || 0,
        is_ac: data.is_ac,
        has_power_outlets: data.has_power_outlets,
        hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : null,
        monthly_rate: data.monthly_rate ? Number(data.monthly_rate) : null,
      }, userId)

      const { error } = await supabase.from("library_sections").insert(sectionData)

      if (error) {
        throw new Error(error.message)
      }

      // Redirect to library detail if came from there
      if (data.library_id && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("library")) {
          return `/library/${data.library_id}`
        }
      }
    },
  })

  const preselectedLibrary = searchParams.get("library")

  // Pre-fill library_id from URL param (mapped from "library" to "library_id")
  useEffect(() => {
    if (preselectedLibrary && !formData.library_id) {
      setFormData((prev) => ({ ...prev, library_id: preselectedLibrary }))
    }
  }, [preselectedLibrary, formData.library_id, setFormData])

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

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Section"
        subtitle="Create a new section in a library"
        backHref={backHref}
        backLabel="Back to Sections"
        icon={Grid3X3}
        breadcrumbs={[
          { label: "Library Sections", href: "/library-sections" },
          { label: "Add Section" },
        ]}
      />

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
            <FormField label="Library" required error={errors.library_id}>
              <Combobox
                options={libraryOptions}
                value={formData.library_id as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                searchPlaceholder="Search libraries..."
                emptyText="No libraries found"
                disabled={saving || loadingLibraries || !!preselectedLibrary}
              />
            </FormField>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Section Name" required error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., AC Hall, Silent Zone"
                  value={formData.name as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </FormField>
              <FormField label="Section Number" error={errors.section_number}>
                <Input
                  id="section_number"
                  name="section_number"
                  placeholder="e.g., A, B, C"
                  value={formData.section_number as string}
                  onChange={handleChange}
                  disabled={saving}
                  maxLength={10}
                />
              </FormField>
            </div>

            <FormField label="Floor" error={errors.floor}>
              <Input
                id="floor"
                name="floor"
                type="number"
                placeholder="e.g., 0, 1, 2"
                value={formData.floor as number}
                onChange={handleChange}
                disabled={saving}
                min={0}
              />
            </FormField>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_ac"
                    checked={formData.is_ac as boolean}
                    onCheckedChange={(checked) => handleCheckboxChange("is_ac", checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="is_ac" className="cursor-pointer">
                    Air Conditioned
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_power_outlets"
                    checked={formData.has_power_outlets as boolean}
                    onCheckedChange={(checked) => handleCheckboxChange("has_power_outlets", checked as boolean)}
                    disabled={saving}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Hourly Rate (₹)" error={errors.hourly_rate}>
                  <Input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.hourly_rate as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </FormField>
                <FormField label="Monthly Rate (₹)" error={errors.monthly_rate}>
                  <Input
                    id="monthly_rate"
                    name="monthly_rate"
                    type="number"
                    placeholder="e.g., 1000"
                    value={formData.monthly_rate as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-sections"}>
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
              "Create Section"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
