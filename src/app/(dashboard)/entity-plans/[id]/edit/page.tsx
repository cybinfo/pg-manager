/**
 * Edit Library Plan Page
 *
 * Form to edit a subscription plan.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { useFormEditPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { getNowISO } from "@/lib/date-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-components"
import { requiredField, requiredAmount } from "@/lib/validation"
import { DetailHero, DetailSection } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { CreditCard } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { TIME_SLOT_OPTIONS } from "@/types/library.types"
import { PermissionGuard } from "@/components/auth"

export default function EditLibraryPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="entity_members.edit">
      <EditLibraryPlanContent params={params} />
    </PermissionGuard>
  )
}

function EditLibraryPlanContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/entity-plans" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    loading,
    saving,
    record,
    errors,
  } = useFormEditPage({
    table: "entity_plans",
    id,
    initialData: {
      name: "",
      description: "",
      hours_included: "",
      validity_days: "30",
      base_price: "",
      allowed_slots: [] as string[],
      is_active: true as boolean,
      sort_order: "0",
    },
    redirectTo: "/entity-plans",
    successMessage: "Plan updated successfully!",
    errorMessage: "Failed to update plan",
    mapToForm: (rec) => ({
      name: (rec.name as string) || "",
      description: (rec.description as string) || "",
      hours_included: rec.hours_included?.toString() || "",
      validity_days: rec.validity_days?.toString() || "30",
      base_price: rec.base_price?.toString() || "",
      allowed_slots: (rec.allowed_slots as string[]) || [],
      is_active: (rec.is_active as boolean) ?? true,
      sort_order: rec.sort_order?.toString() || "0",
    }),
    validationSchema: {
      name: requiredField("Plan Name"),
      base_price: requiredAmount("Price"),
      validity_days: requiredField("Validity"),
    },
    transform: (data): Record<string, unknown> => ({
      name: data.name,
      description: data.description || null,
      hours_included: data.hours_included ? Number(data.hours_included) : null,
      validity_days: Number(data.validity_days),
      base_price: Number(data.base_price),
      allowed_slots: (data.allowed_slots as string[]).length > 0 ? data.allowed_slots : null,
      is_active: data.is_active,
      sort_order: Number(data.sort_order) || 0,
      updated_at: getNowISO(),
    }),
  })

  const handleSlotChange = (slot: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowed_slots: checked
        ? [...(prev.allowed_slots as string[]), slot]
        : (prev.allowed_slots as string[]).filter((s) => s !== slot),
    }))
  }

  if (loading) {
    return <PageLoading message="Loading plan..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Plan"
        subtitle={record?.name as string}
        backHref={backHref}
        backLabel="All Plans"
        icon={CreditCard}
        breadcrumbs={[{ label: "Plans", href: "/entity-plans" }, { label: "Edit Plan" }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Plan Details" description="Update plan hours, validity, and pricing" icon={CreditCard}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Plan Name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                placeholder="e.g., 9 Hours, Monthly"
                value={formData.name as string}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </FormField>
            <FormField label="Price (Rs.)" required error={errors.base_price}>
              <Input
                id="base_price"
                name="base_price"
                type="number"
                placeholder="e.g., 1000"
                value={formData.base_price as string}
                onChange={handleChange}
                required
                disabled={saving}
                min={0}
                step="0.01"
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the plan..."
              value={formData.description as string}
              onChange={handleChange}
              disabled={saving}
              rows={2}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Hours Included" hint="Leave empty for unlimited hours">
              <Input
                id="hours_included"
                name="hours_included"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.hours_included as string}
                onChange={handleChange}
                disabled={saving}
                min={1}
              />
            </FormField>
            <FormField label="Validity (Days)" required error={errors.validity_days}>
              <Input
                id="validity_days"
                name="validity_days"
                type="number"
                placeholder="e.g., 30"
                value={formData.validity_days as string}
                onChange={handleChange}
                required
                disabled={saving}
                min={1}
              />
            </FormField>
          </div>

          {/* Time Slot Restrictions */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Allowed Time Slots</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Leave all unchecked to allow all time slots
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIME_SLOT_OPTIONS.map((slot) => (
                <div key={slot.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`slot-${slot.value}`}
                    checked={(formData.allowed_slots as string[]).includes(slot.value)}
                    onCheckedChange={(checked) => handleSlotChange(slot.value, checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor={`slot-${slot.value}`} className="cursor-pointer text-sm">
                    {slot.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Order */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Sort Order">
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  placeholder="e.g., 0, 1, 2"
                  value={formData.sort_order as string}
                  onChange={handleChange}
                  disabled={saving}
                  min={0}
                />
              </FormField>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active as boolean}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked as boolean }))}
                  disabled={saving}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Plan is active
                </Label>
              </div>
            </div>
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/entity-plans">
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
