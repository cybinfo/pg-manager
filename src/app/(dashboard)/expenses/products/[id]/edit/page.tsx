/**
 * Edit Product Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Package, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Label, Select, FormField } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { Product, ProductFormData, ProductCategory } from "@/types/expense-enhanced.types"
import { UNIT_OPTIONS } from "@/lib/status"

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [product, setProduct] = useState<Product | null>(null)

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    name_hi: "",
    category_id: "",
    default_unit: "",
    default_rate: undefined,
    is_active: true,
  })

  // Load product and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load categories
      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      // Load product
      const { data: productData, error } = await supabase
        .from("products")
        .select(`
          *,
          category:product_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !productData) {
        showError("Product not found")
        router.push("/expenses/products")
        return
      }

      const transformed = {
        ...productData,
        category: transformJoin(productData.category),
      } as Product

      setProduct(transformed)
      setFormData({
        name: transformed.name,
        name_hi: transformed.name_hi || "",
        category_id: transformed.category_id || "",
        default_unit: transformed.default_unit || "",
        default_rate: transformed.default_rate || undefined,
        is_active: transformed.is_active,
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Product name is required")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name.trim(),
          name_hi: formData.name_hi?.trim() || null,
          category_id: formData.category_id || null,
          default_unit: formData.default_unit || null,
          default_rate: formData.default_rate || null,
          is_active: formData.is_active ?? true,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) {
        if (error.code === "23505") {
          showError("A product with this name already exists")
        } else {
          throw error
        }
        return
      }

      showSuccess("Product updated successfully")
      router.push(`/expenses/products/${id}`)
    } catch (error) {
      console.error("Failed to update product:", error)
      showError("Failed to update product")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (!product) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Product not found"
          description="The product you're looking for doesn't exist."
          action={{
            label: "Back to Products",
            href: "/expenses/products",
          }}
        />
      </div>
    )
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.edit">
        <div className="max-w-2xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href={`/expenses/products/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Product
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Edit Product</CardTitle>
                    <CardDescription>
                      Update product details
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
                onClick={() => router.push(`/expenses/products/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
