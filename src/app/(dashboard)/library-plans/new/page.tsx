/**
 * New Library Plan Page
 *
 * Form to create a new subscription plan.
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { TIME_SLOTS } from "@/types/library.types"

export default function NewLibraryPlanPage() {
  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    user, workspaceId,
  } = useFormPage({
    table: "library_plans",
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
    redirectTo: "/library-plans",
    successMessage: "Plan created successfully!",
    errorMessage: "Failed to create plan",
    validate: (data) => {
      if (!data.name || !data.base_price || !data.validity_days) {
        return "Please fill in required fields (Name, Price, Validity)"
      }
      return null
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

      const { error } = await supabase.from("library_plans").insert(planData)

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/library-plans">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Plan</h1>
          <p className="text-muted-foreground">
            Create a new subscription plan
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Plan Details</CardTitle>
                <CardDescription>
                  Define plan hours, validity, and pricing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., 9 Hours, Monthly"
                  value={formData.name as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_price">Price (₹) *</Label>
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of the plan..."
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours_included">Hours Included</Label>
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
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited hours
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity_days">Validity (Days) *</Label>
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
              </div>
            </div>

            {/* Time Slot Restrictions */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Allowed Time Slots</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Leave all unchecked to allow all time slots
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TIME_SLOTS.map((slot) => (
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
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
                </div>
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/library-plans">
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
              "Create Plan"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
