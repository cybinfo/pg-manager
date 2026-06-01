"use client"

import { useState, useEffect } from "react"
import { formatNumber } from "@/lib/format"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DetailHero, DetailSection } from "@/components/ui"
import { FormField } from "@/components/ui/form-components"
import { Gauge, Calculator, Zap, Droplets, Building2, Home } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/auth"
import type { ValidatorResult } from "@/lib/validation"
import { DatePicker } from "@/components/ui/date-picker"

export default function EditMeterReadingPage() {
  return (
    <PermissionGuard permission="meter_readings.edit">
      <EditMeterReadingContent />
    </PermissionGuard>
  )
}

function EditMeterReadingContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/meter-readings" })
  const params = useParams()
  const id = params.id as string
  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
  } = useFormEditPage({
    table: "meter_readings",
    id,
    select: `*, meter:meters(id, meter_number, meter_type), property:entities(id, name), room:rooms(id, room_number)`,
    initialData: {
      reading_date: "",
      reading_value: "",
      notes: "",
    },
    redirectTo: `/meter-readings/${id}`,
    successMessage: "Meter reading updated successfully!",
    errorMessage: "Failed to update meter reading",
    mapToForm: (rec) => ({
      reading_date: (rec.reading_date as string) || "",
      reading_value: rec.reading_value?.toString() || "",
      notes: (rec.notes as string) || "",
    }),
    validationSchema: {
      reading_value: (value: unknown): ValidatorResult => {
        const num = parseFloat(String(value ?? ""))
        if (!value || isNaN(num) || num < 0) {
          return { isValid: false, error: "Please enter a valid reading value" }
        }
        return null
      },
    },
    customSubmit: async (data, _userId, recordId, supabase) => {
      const readingValue = parseFloat(data.reading_value as string)

      // Get previous reading from the record
      const { data: rec } = await supabase
        .from("meter_readings")
        .select("previous_reading")
        .eq("id", recordId)
        .single()

      const previousReading = rec?.previous_reading as number | null
      if (previousReading !== null && readingValue < previousReading) {
        throw new Error("Current reading cannot be less than the previous reading")
      }

      const unitsConsumed = previousReading !== null ? readingValue - previousReading : null

      const { error } = await supabase
        .from("meter_readings")
        .update({
          reading_date: data.reading_date,
          reading_value: readingValue,
          units_consumed: unitsConsumed,
          notes: data.notes || null,
        })
        .eq("id", recordId)

      if (error) throw new Error(`Database error: ${error.message}`)
    },
  })

  // Transform joined data from record for display
  const meter = record ? transformJoin(record.meter as Record<string, unknown>) as Record<string, unknown> | null : null
  const property = record ? transformJoin(record.property as Record<string, unknown>) as Record<string, unknown> | null : null
  const room = record ? transformJoin(record.room as Record<string, unknown>) as Record<string, unknown> | null : null
  const previousReading = record?.previous_reading as number | null
  const meterType = (meter?.meter_type as string) || "electricity"

  // Calculate units consumed live
  useEffect(() => {
    if (previousReading !== null && previousReading !== undefined && formData.reading_value) {
      const currentValue = parseFloat(formData.reading_value as string)
      if (!isNaN(currentValue) && currentValue >= previousReading) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCalculatedUnits(currentValue - previousReading)
      } else {
        setCalculatedUnits(null)
      }
    } else {
      setCalculatedUnits(null)
    }
  }, [formData.reading_value, previousReading])

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Meter Reading"
        subtitle="Update reading details"
        backHref={backHref}
        backLabel="All Meter Readings"
        icon={Gauge}
        breadcrumbs={[{ label: "Meter Readings", href: "/meter-readings" }, { label: "Edit Reading" }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meter Info (Read-only) */}
        <DetailSection
          title="Meter Information"
          description="This reading is linked to the following meter"
          icon={meterType === "electricity" ? Zap : meterType === "water" ? Droplets : Gauge}
        >
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{(meter?.meter_number as string) || "Unknown Meter"}</span>
              <span className="text-sm text-muted-foreground capitalize">({meterType})</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {(property?.name as string) || "Unknown Property"}
              </div>
              <div className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                Room {(room?.room_number as string) || "Unknown"}
              </div>
            </div>
          </div>
        </DetailSection>

        {/* Reading Details */}
        <DetailSection title="Reading Details" description="Update the reading value" icon={Gauge}>
          <FormField label="Reading Date" required>
            <DatePicker
              id="reading_date"
              value={formData.reading_date as string}
              onChange={(val) => handleChange({ target: { name: "reading_date", value: val } } as React.ChangeEvent<HTMLInputElement>)}
              disabled={saving}
            />
          </FormField>

          {/* Previous Reading (Read-only) */}
          {previousReading !== null && (
            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-info">
                <strong>Previous Reading:</strong> {formatNumber(previousReading)}
              </p>
            </div>
          )}

          <FormField label="Current Reading" required error={errors.reading_value}>
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reading_value"
                name="reading_value"
                type="number"
                min={previousReading || 0}
                step="0.01"
                placeholder="e.g., 12345"
                value={formData.reading_value as string}
                onChange={handleChange}
                required
                disabled={saving}
                className="pl-9"
              />
            </div>
          </FormField>

          {/* Calculated Units */}
          {calculatedUnits !== null && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Calculator className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-success">Units Consumed</p>
                  <p className="text-2xl font-bold text-success">
                    {formatNumber(calculatedUnits)} {meterType === "electricity" ? "kWh" : meterType === "water" ? "L" : meterType === "gas" ? "m3" : "units"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <FormField label="Notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes..."
              value={formData.notes as string}
              onChange={handleChange}
              disabled={saving}
              className="min-h-[80px]"
            />
          </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/meter-readings/${id}`}>
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
