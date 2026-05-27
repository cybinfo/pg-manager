/**
 * Edit Meter Page
 *
 * Form to edit meter details (not assignment - that's handled on detail page)
 */

"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { getNowISO } from "@/lib/date-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  DetailSection,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import { Select, FormField } from "@/components/ui/form-components"
import {
  Gauge,
  Zap,
  Droplets,
  Building2,
  Save,
  Loader2,
} from "lucide-react"
import { PermissionGuard } from "@/components/auth"
import {
  MeterType,
  METER_TYPES,
  METER_STATUSES,
  METER_TYPE_CONFIG,
} from "@/types/meters.types"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import type { PropertyOption } from "@/types/properties.types"

export default function EditMeterPage() {
  const params = useParams()
  const id = params.id as string
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/meters", defaultLabel: "All Meters" })
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const {
    formData,
    handleSubmit,
    loading,
    saving,
    record,
    setFormData,
  } = useFormEditPage({
    table: "meters",
    id,
    select: "*, property:properties(id, name)",
    initialData: {
      property_id: "",
      meter_number: "",
      meter_type: "electricity" as string,
      status: "active" as string,
      initial_reading: "0",
      make: "",
      model: "",
      installation_date: "",
      notes: "",
    },
    redirectTo: `/meters/${id}`,
    successMessage: "Meter updated successfully",
    errorMessage: "Failed to update meter",
    mapToForm: (rec) => ({
      property_id: (rec.property_id as string) || "",
      meter_number: (rec.meter_number as string) || "",
      meter_type: (rec.meter_type as string) || "electricity",
      status: (rec.status as string) || "active",
      initial_reading: rec.initial_reading?.toString() || "0",
      make: (rec.make as string) || "",
      model: (rec.model as string) || "",
      installation_date: (rec.installation_date as string) || "",
      notes: (rec.notes as string) || "",
    }),
    validate: (data) => {
      const newErrors: Record<string, string> = {}
      if (!data.property_id) newErrors.property_id = "Property is required"
      if (!(data.meter_number as string).trim()) newErrors.meter_number = "Meter number is required"
      setErrors(newErrors)
      if (Object.keys(newErrors).length > 0) return "Please fix the errors before submitting"
      return null
    },
    customSubmit: async (data, userId, recordId, supabase) => {
      // Check for duplicate meter number (excluding current meter)
      if (data.meter_number !== record?.meter_number) {
        const { data: existing } = await supabase
          .from("meters")
          .select("id, meter_number")
          .eq("owner_id", record?.owner_id as string)
          .eq("meter_number", (data.meter_number as string).trim())
          .neq("id", recordId)
          .single()

        if (existing) {
          throw new Error(`A meter with number "${data.meter_number}" already exists`)
        }
      }

      const { error } = await supabase
        .from("meters")
        .update({
          property_id: data.property_id,
          meter_number: (data.meter_number as string).trim(),
          meter_type: data.meter_type,
          status: data.status,
          initial_reading: parseFloat(data.initial_reading as string) || 0,
          make: (data.make as string).trim() || null,
          model: (data.model as string).trim() || null,
          installation_date: data.installation_date || null,
          notes: (data.notes as string).trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", recordId)

      if (error) throw new Error("Failed to update meter")
    },
  })

  // Fetch properties for dropdown
  useEffect(() => {
    const fetchProperties = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("properties").select("id, name").order("name")
      if (data) setProperties(data)
    }
    fetchProperties()
  }, [])

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (loading) {
    return <PageLoading message="Loading meter details..." />
  }

  const typeConfig = METER_TYPE_CONFIG[formData.meter_type as MeterType] || METER_TYPE_CONFIG.electricity
  const TypeIcon = formData.meter_type === "water" ? Droplets : formData.meter_type === "gas" ? Gauge : Zap

  return (
    <PermissionGuard permission="meters.edit">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Hero Header */}
        <DetailHero
          title="Edit Meter"
          subtitle={record?.meter_number as string}
          backHref={backHref}
          backLabel={backLabel}
          avatar={
            <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
              <TypeIcon className={`h-8 w-8 ${typeConfig.color}`} />
            </div>
          }
        />

        {/* Basic Information */}
        <DetailSection
          title="Meter Information"
          description="Basic meter details"
          icon={Gauge}
        >
          <div className="space-y-4">
            <FormField label="Property" required error={errors.property_id}>
              <Select
                value={formData.property_id as string}
                onChange={(e) => updateField("property_id", e.target.value)}
                options={[
                  { value: "", label: "Select property" },
                  ...properties.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Meter Number" required error={errors.meter_number}>
                <Input
                  id="meter_number"
                  value={formData.meter_number as string}
                  onChange={(e) => updateField("meter_number", e.target.value)}
                  placeholder="e.g., E-001, W-101"
                />
              </FormField>

              <FormField label="Meter Type" required>
                <Select
                  value={formData.meter_type as string}
                  onChange={(e) => updateField("meter_type", e.target.value)}
                  options={METER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Status">
                <Select
                  value={formData.status as string}
                  onChange={(e) => updateField("status", e.target.value)}
                  options={METER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </FormField>

              <FormField label="Initial Reading">
                <Input
                  id="initial_reading"
                  type="number"
                  value={formData.initial_reading as string}
                  onChange={(e) => updateField("initial_reading", e.target.value)}
                  placeholder="0"
                />
              </FormField>
            </div>
          </div>
        </DetailSection>

        {/* Additional Details */}
        <DetailSection
          title="Additional Details"
          description="Optional meter information"
          icon={Building2}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Make / Manufacturer">
                <Input
                  id="make"
                  value={formData.make as string}
                  onChange={(e) => updateField("make", e.target.value)}
                  placeholder="e.g., Secure, HPL"
                />
              </FormField>

              <FormField label="Model">
                <Input
                  id="model"
                  value={formData.model as string}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="e.g., Sprint 350"
                />
              </FormField>
            </div>

            <FormField label="Installation Date">
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date as string}
                onChange={(e) => updateField("installation_date", e.target.value)}
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                id="notes"
                value={formData.notes as string}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Any additional notes about this meter..."
                rows={3}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href={`/meters/${id}`}>
            <Button type="button" variant="outline">
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
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  )
}
