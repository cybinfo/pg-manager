/**
 * New Product Page
 *
 * Form to create a new product in the Product Master.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Package, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Label, Select, FormField } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import Link from "next/link"

import type { ProductFormData, ProductCategory } from "@/types/expense-enhanced.types"

// Common units for kitchen items
const UNIT_OPTIONS = [
  { value: "Kg", label: "Kilogram (Kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "Ltr", label: "Litre (Ltr)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "Pcs", label: "Pieces (Pcs)" },
  { value: "Dozen", label: "Dozen" },
  { value: "Packet", label: "Packet" },
  { value: "Box", label: "Box" },
  { value: "Bundle", label: "Bundle" },
  { value: "Bottle", label: "Bottle" },
]

export default function NewProductPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    name_hi: "",
    category_id: "",
    default_unit: "Kg",
    default_rate: undefined,
    is_active: true,
  })

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      if (error) {
        console.error("Failed to load categories:", error)
        showError("Failed to load categories")
      } else {
        setCategories(data || [])

        // If no categories exist, create defaults
        if (!data || data.length === 0) {
          await seedDefaultCategories()
        }
      }
      setLoadingCategories(false)
    }

    async function seedDefaultCategories() {
      if (!workspaceId || !user?.id) return

      const supabase = createClient()
      const { error } = await supabase.rpc("seed_expense_categories", {
        p_workspace_id: workspaceId,
        p_user_id: user.id,
      })

      if (error) {
        console.error("Failed to seed categories:", error)
      } else {
        // Reload categories after seeding
        const { data } = await supabase
          .from("product_categories")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .order("sort_order")

        setCategories(data || [])
      }
    }

    loadCategories()
  }, [workspaceId, user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Product name is required")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const productData = withCreatedBy(
        {
          workspace_id: workspaceId,
          name: formData.name.trim(),
          name_hi: formData.name_hi?.trim() || null,
          category_id: formData.category_id || null,
          default_unit: formData.default_unit || null,
          default_rate: formData.default_rate || null,
          is_active: formData.is_active ?? true,
        },
        user.id
      )

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          showError("A product with this name already exists")
        } else {
          throw error
        }
        return
      }

      showSuccess("Product created successfully")
      router.push(`/expenses/products/${data.id}`)
    } catch (error) {
      console.error("Failed to create product:", error)
      showError("Failed to create product")
    } finally {
      setLoading(false)
    }
  }

  if (loadingCategories) {
    return <PageLoading />
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.create">
        <div className="max-w-2xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href="/expenses/products"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Products
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle>New Product</CardTitle>
                    <CardDescription>
                      Add a new item to your product master
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Product Name */}
                <FormField label="Product Name" required>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Tomato, Rice, Milk"
                    autoFocus
                  />
                </FormField>

                {/* Hindi Name */}
                <FormField label="Hindi Name" hint="Optional - helps with voice entry">
                  <Input
                    value={formData.name_hi || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name_hi: e.target.value }))
                    }
                    placeholder="e.g., टमाटर, चावल, दूध"
                  />
                </FormField>

                {/* Category */}
                <FormField label="Category">
                  <Select
                    value={formData.category_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                    }
                    options={[
                      { value: "", label: "Select category" },
                      ...categories.map((cat) => ({
                        value: cat.id,
                        label: cat.name_hi ? `${cat.name} (${cat.name_hi})` : cat.name,
                      })),
                    ]}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  {/* Default Unit */}
                  <FormField label="Default Unit">
                    <Select
                      value={formData.default_unit || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, default_unit: e.target.value }))
                      }
                      options={[
                        { value: "", label: "Select unit" },
                        ...UNIT_OPTIONS,
                      ]}
                    />
                  </FormField>

                  {/* Default Rate */}
                  <FormField label="Default Rate" hint="₹ per unit">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.default_rate || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          default_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </FormField>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="is_active">Active (available for selection)</Label>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/expenses/products")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
