/**
 * Edit Library Seat Page
 *
 * Form to edit seat details.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DetailHero, DetailSection } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredField } from "@/lib/validation"
import { Armchair } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"
import { getNowISO } from "@/lib/date-helpers"
import { PermissionGuard } from "@/components/auth"
import { SEAT_STATUS_OPTIONS } from "@/lib/constants/form-options"

export default function EditLibrarySeatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_seats.edit">
      <EditLibrarySeatContent params={params} />
    </PermissionGuard>
  )
}

function EditLibrarySeatContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/library-seats" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
  } = useFormEditPage({
    table: "library_seats",
    id,
    select: "*, section:library_sections(id, name, library:libraries(id, name))",
    initialData: {
      seat_number: "",
      row_number: "",
      has_power_outlet: true as boolean,
      has_lamp: false as boolean,
      is_window_seat: false as boolean,
      status: "available",
    },
    redirectTo: `/library-seats/${id}`,
    successMessage: "Seat updated successfully!",
    errorMessage: "Failed to update seat",
    mapToForm: (rec) => ({
      seat_number: (rec.seat_number as string) || "",
      row_number: (rec.row_number as string) || "",
      has_power_outlet: (rec.has_power_outlet as boolean) ?? true,
      has_lamp: (rec.has_lamp as boolean) ?? false,
      is_window_seat: (rec.is_window_seat as boolean) ?? false,
      status: (rec.status as string) || "available",
    }),
    validationSchema: {
      seat_number: requiredField("Seat Number"),
    },
    transform: (data): Record<string, unknown> => ({
      seat_number: data.seat_number,
      row_number: data.row_number || null,
      has_power_outlet: data.has_power_outlet,
      has_lamp: data.has_lamp,
      is_window_seat: data.is_window_seat,
      status: data.status,
      updated_at: getNowISO(),
    }),
  })

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  // Get section info from record for display
  const section = record ? transformJoin(record.section as Record<string, unknown>) as Record<string, unknown> | null : null

  if (loading) {
    return <PageLoading message="Loading seat..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Seat"
        subtitle={`${formData.seat_number} • ${section?.name as string}`}
        backHref={backHref}
        backLabel="All Seats"
        icon={Armchair}
        breadcrumbs={[{ label: "Seats", href: "/library-seats" }, { label: "Edit Seat" }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Seat Details" description="Update seat information and features" icon={Armchair}>
          {/* Seat Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Seat Number" required error={errors.seat_number}>
              <Input
                id="seat_number"
                name="seat_number"
                placeholder="e.g., A-01, 101"
                value={formData.seat_number as string}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </FormField>
            <FormField label="Row">
              <Input
                id="row_number"
                name="row_number"
                placeholder="e.g., A, B, 1"
                value={formData.row_number as string}
                onChange={handleChange}
                disabled={saving}
                maxLength={10}
              />
            </FormField>
          </div>

          <FormField label="Status" htmlFor="status">
            <Select
              value={formData.status as string}
              onChange={handleChange}
              name="status"
              disabled={saving}
              options={SEAT_STATUS_OPTIONS}
            />
          </FormField>

          {/* Features */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_power_outlet"
                  checked={formData.has_power_outlet as boolean}
                  onCheckedChange={(checked) => handleCheckboxChange("has_power_outlet", checked as boolean)}
                  disabled={saving}
                />
                <Label htmlFor="has_power_outlet" className="cursor-pointer">
                  Power Outlet
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_lamp"
                  checked={formData.has_lamp as boolean}
                  onCheckedChange={(checked) => handleCheckboxChange("has_lamp", checked as boolean)}
                  disabled={saving}
                />
                <Label htmlFor="has_lamp" className="cursor-pointer">
                  Desk Lamp
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_window_seat"
                  checked={formData.is_window_seat as boolean}
                  onCheckedChange={(checked) => handleCheckboxChange("is_window_seat", checked as boolean)}
                  disabled={saving}
                />
                <Label htmlFor="is_window_seat" className="cursor-pointer">
                  Window Seat
                </Label>
              </div>
            </div>
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/library-seats/${id}`}>
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
