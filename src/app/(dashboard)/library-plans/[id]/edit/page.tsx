/**
 * Edit Library Plan Page
 *
 * Form to edit a subscription plan.
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageLoading } from "@/components/ui/loading"
import { TIME_SLOTS } from "@/types/library.types"

interface PlanData {
  id: string
  name: string
  description: string | null
  hours_included: number | null
  validity_days: number
  base_price: number
  allowed_slots: string[] | null
  is_active: boolean
  sort_order: number
}

export default function EditLibraryPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [plan, setPlan] = useState<PlanData | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hours_included: "",
    validity_days: "30",
    base_price: "",
    allowed_slots: [] as string[],
    is_active: true,
    sort_order: "0",
  })

  useEffect(() => {
    async function fetchPlan() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_plans")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        toast.error("Plan not found")
        router.push("/library-plans")
        return
      }

      setPlan(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        hours_included: data.hours_included?.toString() || "",
        validity_days: data.validity_days?.toString() || "30",
        base_price: data.base_price?.toString() || "",
        allowed_slots: data.allowed_slots || [],
        is_active: data.is_active ?? true,
        sort_order: data.sort_order?.toString() || "0",
      })
      setLoadingData(false)
    }

    fetchPlan()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSlotChange = (slot: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowed_slots: checked
        ? [...prev.allowed_slots, slot]
        : prev.allowed_slots.filter((s) => s !== slot),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.base_price || !formData.validity_days) {
      toast.error("Please fill in required fields (Name, Price, Validity)")
      return
    }

    if (!user) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const updateData = {
        name: formData.name,
        description: formData.description || null,
        hours_included: formData.hours_included ? Number(formData.hours_included) : null,
        validity_days: Number(formData.validity_days),
        base_price: Number(formData.base_price),
        allowed_slots: formData.allowed_slots.length > 0 ? formData.allowed_slots : null,
        is_active: formData.is_active,
        sort_order: Number(formData.sort_order) || 0,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("library_plans")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("Error updating plan:", error)
        toast.error(`Failed to update plan: ${error.message}`)
        return
      }

      toast.success("Plan updated successfully!")
      router.push("/library-plans")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update plan. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading plan..." />
  }

  if (!plan) {
    return null
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
          <h1 className="text-3xl font-bold">Edit Plan</h1>
          <p className="text-muted-foreground">
            {plan.name}
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
                  Update plan hours, validity, and pricing
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
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_price">Price (₹) *</Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.base_price}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
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
                  value={formData.hours_included}
                  onChange={handleChange}
                  disabled={loading}
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
                  value={formData.validity_days}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
                      checked={formData.allowed_slots.includes(slot.value)}
                      onCheckedChange={(checked) => handleSlotChange(slot.value, checked as boolean)}
                      disabled={loading}
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
                    value={formData.sort_order}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked as boolean }))}
                    disabled={loading}
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
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
