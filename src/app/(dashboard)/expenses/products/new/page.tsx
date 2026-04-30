/**
 * New Product Page
 *
 * Form to create a new product in the Product Master.
 * Uses useFormPage hook + FormPageTemplate for consistent layout.
 */

"use client"

import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { requiredField } from "@/lib/validation"
import { PermissionGuard } from "@/components/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { UNIT_OPTIONS } from "@/lib/status"

import {
  FormPageTemplate,
  FormGrid,
  FormField,
  Input,
  Select,
  Label,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import type { ProductCategory } from "@/types/expense-enhanced.types"
import { logger } from "@/lib/logger"


export default function NewProductPage() {
  return (
    <PermissionGuard permission="expenses.create">
      <NewProductContent />
    </PermissionGuard>
  )
}

function NewProductContent() {
  const { workspaceId } = useAuthContext()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses/products", defaultLabel: "Products" })
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const {
    formData,
    setFormData,
    handleSubmit,
    saving,
    errors,
    validateField,
    user,
    router,
  } = useFormPage({
    table: "products",
    initialData: {
      name: "",
      name_hi: "",
      category_id: "",
      default_unit: "Kg",
      default_rate: undefined as number | undefined,
      is_active: true as boolean,
    },
    redirectTo: "/expenses/products",
    addOwnerId: false,
    selectAfterInsert: true,
    successMessage: "Product created successfully",
    errorMessage: "Failed to create product",
    validationSchema: {
      name: requiredField("Product name"),
    },
    transform: (data) => ({
      workspace_id: workspaceId,
      name: String(data.name).trim(),
      name_hi: data.name_hi ? String(data.name_hi).trim() : null,
      category_id: data.category_id || null,
      default_unit: data.default_unit || null,
      default_rate: data.default_rate || null,
      is_active: data.is_active ?? true,
    }),
    onSuccess: (data) => {
      if (data?.id) return `/expenses/products/${data.id}`
    },
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
        logger.error("Failed to load categories:", { detail: error })
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
        logger.error("Failed to seed categories:", { detail: error })
      } else {
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

  if (loadingCategories) {
    return <PageLoading />
  }

  return (
    <FormPageTemplate
      title="New Product"
      description="Add a new item to your product master"
      icon={Package}
      iconColor="blue"
      backHref={backHref}
      backLabel={backLabel}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/expenses/products")}
      submitLabel="Create Product"
      loading={saving}
      loadingLabel="Creating..."
      permission="expenses.create"
      module="expenses"
    >
      {/* Product Name */}
      <FormField label="Product Name" required error={errors.name}>
        <Input
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={() => validateField("name")}
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

      <FormGrid cols={2}>
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
        <FormField label="Default Rate" hint="per unit">
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
      </FormGrid>

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
    </FormPageTemplate>
  )
}
