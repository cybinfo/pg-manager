/**
 * Edit Library Locker Page
 *
 * Form to edit locker details.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Lock, Loader2 } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"
import { getNowISO } from "@/lib/date-helpers"
import { PermissionGuard } from "@/components/auth"

export default function EditLibraryLockerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="library_lockers.edit">
      <EditLibraryLockerContent params={params} />
    </PermissionGuard>
  )
}

function EditLibraryLockerContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
  } = useFormEditPage({
    table: "library_lockers",
    id,
    select: "*, library:libraries(id, name)",
    initialData: {
      locker_number: "",
      size: "medium",
      floor: 0 as number,
      section: "",
      monthly_rent: "",
      deposit_amount: "",
      status: "available",
    },
    redirectTo: `/library-lockers/${id}`,
    successMessage: "Locker updated successfully!",
    errorMessage: "Failed to update locker",
    mapToForm: (rec) => ({
      locker_number: (rec.locker_number as string) || "",
      size: (rec.size as string) || "medium",
      floor: (rec.floor as number) || 0,
      section: (rec.section as string) || "",
      monthly_rent: rec.monthly_rent?.toString() || "",
      deposit_amount: rec.deposit_amount?.toString() || "",
      status: (rec.status as string) || "available",
    }),
    validate: (data) => {
      if (!data.locker_number) {
        return "Please enter locker number"
      }
      return null
    },
    transform: (data): Record<string, unknown> => ({
      locker_number: data.locker_number,
      size: data.size,
      floor: data.floor || 0,
      section: data.section || null,
      monthly_rent: data.monthly_rent ? Number(data.monthly_rent) : null,
      deposit_amount: data.deposit_amount ? Number(data.deposit_amount) : null,
      status: data.status,
      updated_at: getNowISO(),
    }),
  })

  // Get library name from record for display
  const library = record ? transformJoin(record.library as Record<string, unknown>) as Record<string, unknown> | null : null

  if (loading) {
    return <PageLoading message="Loading locker..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-lockers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Locker</h1>
          <p className="text-muted-foreground">
            #{formData.locker_number} • {library?.name as string}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Locker Details</CardTitle>
                <CardDescription>
                  Update locker information and pricing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Locker Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locker_number">Locker Number *</Label>
                <Input
                  id="locker_number"
                  name="locker_number"
                  placeholder="e.g., L-001"
                  value={formData.locker_number as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size as string}
                  onChange={handleChange}
                  name="size"
                  disabled={saving}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  placeholder="e.g., A, Main Hall"
                  value={formData.section as string}
                  onChange={handleChange}
                  disabled={saving}
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
                  { value: "maintenance", label: "Maintenance" },
                ]}
              />
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (Rs.)</Label>
                  <Input
                    id="monthly_rent"
                    name="monthly_rent"
                    type="number"
                    placeholder="e.g., 200"
                    value={formData.monthly_rent as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Deposit Amount (Rs.)</Label>
                  <Input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.deposit_amount as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-lockers/${id}`}>
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
