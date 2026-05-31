/**
 * Edit Entity Section Page
 */

"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Checkbox } from "@/components/ui/checkbox"
import { Grid3X3 } from "lucide-react"
import { DetailHero, DetailSection } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { requiredField } from "@/lib/validation"
import { getNowISO } from "@/lib/date-helpers"
import { PermissionGuard } from "@/components/auth"

export default function EditEntitySectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="entity_sections.edit">
      <EditEntitySectionContent params={params} />
    </PermissionGuard>
  )
}

function EditEntitySectionContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/entity-sections" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    errors,
  } = useFormEditPage({
    table: "entity_sections",
    id,
    initialData: {
      name: "",
      section_number: "",
      floor: 0,
      is_ac: false,
      has_power_outlets: true,
      hourly_rate: "",
      monthly_rate: "",
    },
    redirectTo: `/entity-sections/${id}`,
    successMessage: "Section updated successfully!",
    errorMessage: "Failed to update section",
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      section_number: (rec.section_number as string) || "",
      floor: (rec.floor as number) ?? 0,
      is_ac: (rec.is_ac as boolean) ?? false,
      has_power_outlets: (rec.has_power_outlets as boolean) ?? true,
      hourly_rate: rec.hourly_rate?.toString() || "",
      monthly_rate: rec.monthly_rate?.toString() || "",
    }),
    validationSchema: {
      name: requiredField("Section Name"),
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
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  if (loading) {
    return <PageLoading message="Loading section..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Section"
        subtitle={formData.name as string}
        backHref={backHref}
        backLabel="Back to Sections"
        icon={Grid3X3}
        breadcrumbs={[
          { label: "Sections", href: "/entity-sections" },
          { label: "Edit Section" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Section Details" description="Update section configuration" icon={Grid3X3}>
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
                <Label htmlFor="is_ac" className="cursor-pointer">Air Conditioned</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_power_outlets"
                  checked={formData.has_power_outlets as boolean}
                  onCheckedChange={(checked) => handleCheckboxChange("has_power_outlets", checked as boolean)}
                  disabled={saving}
                />
                <Label htmlFor="has_power_outlets" className="cursor-pointer">Power Outlets</Label>
              </div>
            </div>
          </div>

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
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/entity-sections/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
