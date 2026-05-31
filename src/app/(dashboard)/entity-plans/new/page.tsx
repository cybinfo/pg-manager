/**
 * New Library Plan Page
 *
 * Form to create a new subscription plan.
 */

"use client"

import Link from "next/link"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"
import { requiredField, requiredAmount, requiredPositiveInt } from "@/lib/validation"
import { TIME_SLOT_OPTIONS } from "@/types/library.types"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"

export default function NewLibraryPlanPage() {
  return (
    <PermissionGuard permission="entity_members.create">
      <NewLibraryPlanContent />
    </PermissionGuard>
  )
}

function NewLibraryPlanContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/entity-plans" })

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    user: _user, workspaceId,
    errors,
    validateField,
  } = useFormPage({
    table: "entity_plans",
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
    successMessage: "Plan created successfully!",
    errorMessage: "Failed to create plan",
    validationSchema: {
      name: requiredField("Plan name"),
      base_price: requiredAmount("Price"),
      validity_days: requiredPositiveInt("Validity days"),
    },
    customSubmit: async (data, userId, supabase) => {
      // Get owner_id from workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        throw new Error("Workspace not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      const planData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          name: data.name,
          description: data.description || null,
          hours_included: data.hours_included ? Number(data.hours_included) : null,
          validity_days: Number(data.validity_days),
          base_price: Number(data.base_price),
          allowed_slots: (data.allowed_slots as string[]).length > 0 ? data.allowed_slots : null,
          is_active: data.is_active,
          sort_order: Number(data.sort_order) || 0,
        },
        userId
      )

      const { error } = await supabase.from("entity_plans").insert(planData)

      if (error) {
        throw new Error(error.message)
      }
    },
  })

  const handleSlotChange = (slot: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowed_slots: checked
        ? [...(prev.allowed_slots as string[]), slot]
        : (prev.allowed_slots as string[]).filter((s: string) => s !== slot),
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Plan"
        subtitle="Create a new subscription plan"
        backHref={backHref}
        backLabel="Back to Plans"
        icon={CreditCard}
        breadcrumbs={[
          { label: "Library Plans", href: "/entity-plans" },
          { label: "Add Plan" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Plan Details" description="Define plan hours, validity, and pricing" icon={CreditCard}>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Plan Name" htmlFor="name" required error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., 9 Hours, Monthly"
                  value={formData.name as string}
                  onChange={handleChange}
                  onBlur={() => validateField("name")}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Price (₹)" htmlFor="base_price" required error={errors.base_price}>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.base_price as string}
                  onChange={handleChange}
                  onBlur={() => validateField("base_price")}
                  disabled={saving}
                  min={0}
                  step="0.01"
                />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description">
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
              <FormField label="Hours Included" htmlFor="hours_included" hint="Leave empty for unlimited hours">
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
              <FormField label="Validity (Days)" htmlFor="validity_days" required error={errors.validity_days}>
                <Input
                  id="validity_days"
                  name="validity_days"
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.validity_days as string}
                  onChange={handleChange}
                  onBlur={() => validateField("validity_days")}
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
                <FormField label="Sort Order" htmlFor="sort_order">
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
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/entity-plans">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </form>
    </div>
  )
}
