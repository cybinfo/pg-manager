/**
 * Edit Library Section Page
 *
 * Form to edit an existing section.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Grid3X3, Loader2 } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"
import { getNowISO } from "@/lib/date-helpers"
import { PermissionGuard } from "@/components/auth"

export default function EditLibrarySectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_sections.edit">
      <EditLibrarySectionContent params={params} />
    </PermissionGuard>
  )
}

function EditLibrarySectionContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-sections" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
  } = useFormEditPage({
    table: "library_sections",
    id,
    select: "*, library:libraries(id, name)",
    initialData: {
      name: "",
      section_number: "",
      floor: 0 as number,
      is_ac: false as boolean,
      has_power_outlets: true as boolean,
      hourly_rate: "",
      monthly_rate: "",
    },
    redirectTo: `/library-sections/${id}`,
    successMessage: "Section updated successfully!",
    errorMessage: "Failed to update section",
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      section_number: (rec.section_number as string) || "",
      floor: (rec.floor as number) || 0,
      is_ac: (rec.is_ac as boolean) || false,
      has_power_outlets: (rec.has_power_outlets as boolean) ?? true,
      hourly_rate: rec.hourly_rate?.toString() || "",
      monthly_rate: rec.monthly_rate?.toString() || "",
    }),
    validate: (data) => {
      if (!data.name) {
        return "Please enter section name"
      }
      return null
    },
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      section_number: data.section_number || null,
      floor: data.floor || 0,
      is_ac: data.is_ac,
      has_power_outlets: data.has_power_outlets,
      hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : null,
      monthly_rate: data.monthly_rate ? Number(data.monthly_rate) : null,
      updated_at: getNowISO(),
    }),
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  // Get library name from record for display
  const library = record ? transformJoin(record.library as Record<string, unknown>) as Record<string, unknown> | null : null

  if (loading) {
    return <PageLoading message="Loading section..." />
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
          <h1 className="text-3xl font-bold">Edit Section</h1>
          <p className="text-muted-foreground">
            {library?.name as string} • {formData.name}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Section Name" required>
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
              <FormField label="Section Number">
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

            <FormField label="Floor">
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
                <FormField label="Hourly Rate (Rs.)">
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
                <FormField label="Monthly Rate (Rs.)">
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
          <Link href={`/library-sections/${id}`}>
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
