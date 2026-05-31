"use client"

import { use } from "react"
import { Package } from "lucide-react"
import { useExpenseProductEditForm } from "@/lib/hooks/forms/useExpenseProductEditForm"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input, Label, Select, FormField } from "@/components/ui"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"

import { UNIT_OPTIONS } from "@/lib/status"

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditProductContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditProductContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    backHref,
    router,
    loading,
    loadingData,
    categories,
    product,
    formData,
    setFormData,
    handleSubmit,
  } = useExpenseProductEditForm(id)

  if (loadingData) {
    return <PageLoading />
  }

  if (!product) {
    return <NotFoundState title="Product not found" backHref="/expenses/products" backLabel="All Products" />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="Edit Product"
        subtitle="Update product details"
        backHref={backHref}
        backLabel="All Products"
        icon={Package}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Products", href:"/expenses/products"}, {label:"Edit Product"}]}
      />

          <form onSubmit={handleSubmit} className="space-y-6">
            <DetailSection title="Edit Product" description="Update product details" icon={Package}>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active as boolean}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked === true }))
                    }
                  />
                  <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">Active (available for selection)</Label>
                </div>
            </DetailSection>

            {/* Actions */}
            <div className="flex justify-end gap-3">
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
  )
}
