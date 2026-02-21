/**
 * Edit Library Seat Page
 *
 * Form to edit seat details.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Armchair, Loader2 } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"

export default function EditLibrarySeatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
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
    validate: (data) => {
      if (!data.seat_number) {
        return "Please enter seat number"
      }
      return null
    },
    transform: (data): Record<string, unknown> => ({
      seat_number: data.seat_number,
      row_number: data.row_number || null,
      has_power_outlet: data.has_power_outlet,
      has_lamp: data.has_lamp,
      is_window_seat: data.is_window_seat,
      status: data.status,
      updated_at: new Date().toISOString(),
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-seats/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Seat</h1>
          <p className="text-muted-foreground">
            {formData.seat_number} • {section?.name as string}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Armchair className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Seat Details</CardTitle>
                <CardDescription>
                  Update seat information and features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seat Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seat_number">Seat Number *</Label>
                <Input
                  id="seat_number"
                  name="seat_number"
                  placeholder="e.g., A-01, 101"
                  value={formData.seat_number as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="row_number">Row</Label>
                <Input
                  id="row_number"
                  name="row_number"
                  placeholder="e.g., A, B, 1"
                  value={formData.row_number as string}
                  onChange={handleChange}
                  disabled={saving}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status as string}
                onChange={handleChange}
                name="status"
                disabled={saving}
                options={[
                  { value: "available", label: "Available" },
                  { value: "occupied", label: "Occupied" },
                  { value: "reserved", label: "Reserved" },
                  { value: "maintenance", label: "Maintenance" },
                ]}
              />
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Features</h3>
              <div className="grid grid-cols-3 gap-4">
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-seats/${id}`}>
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
