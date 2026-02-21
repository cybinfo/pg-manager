/**
 * Product Selector Component
 *
 * A reusable component for selecting an existing product or creating a new one inline.
 * Thin wrapper around EntitySelector with product-specific rendering and category quick-create.
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import {
  X,
  Package,
} from "lucide-react"
import { showInfo, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"
import type { Product, ProductCategory } from "@/types/expense-enhanced.types"
import {
  EntitySelector,
  type EntitySelectorConfig,
} from "@/components/ui/entity-selector"

// ============================================================================
// PROPS (preserved exactly as before)
// ============================================================================

interface ProductSelectorProps {
  workspaceId: string
  userId: string
  selectedProductId?: string | null
  onSelect: (product: Product | null) => void
  onCreate?: (product: Product) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  allowQuickCreate?: boolean
  /** Categories for quick create form */
  categories?: ProductCategory[]
  /** Compact mode for inline/table use - shows simpler selected state */
  compact?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRODUCT_SELECT = "*, category:product_categories(id, name, name_hi)"

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

// ============================================================================
// HELPER RENDERERS
// ============================================================================

/** Render a product in the dropdown list */
function ProductDropdownItem({ product }: { product: Product }) {
  return (
    <>
      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Package className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{product.name}</span>
          {product.name_hi && (
            <span className="text-muted-foreground text-sm">({product.name_hi})</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {product.category?.name && <span>{product.category.name}</span>}
          {product.default_rate && <span>· ₹{product.default_rate}</span>}
        </div>
      </div>
    </>
  )
}

/** Render selected product - full card mode */
function ProductSelectedCard({
  product,
  onClear,
  disabled,
  error,
}: {
  product: Product
  onClear: () => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Card className={cn(
        "border-2",
        error ? "border-red-300" : "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{product.name}</span>
                  {product.name_hi && (
                    <span className="text-muted-foreground">({product.name_hi})</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {product.category?.name && (
                    <span>{product.category.name}</span>
                  )}
                  {product.default_unit && (
                    <span>Unit: {product.default_unit}</span>
                  )}
                  {product.default_rate && (
                    <span>₹{product.default_rate}</span>
                  )}
                </div>
              </div>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

/** Render selected product - compact mode */
function ProductSelectedCompact({
  product,
  onClear,
  disabled,
  error,
}: {
  product: Product
  onClear: () => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <div className={cn(
        "h-10 flex items-center justify-between gap-2 px-3 rounded-lg border",
        error ? "border-red-300" : "border-primary/30 bg-primary/5"
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium truncate text-sm">
            {product.name}
            {product.name_hi && ` (${product.name_hi})`}
          </span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductSelector({
  workspaceId,
  userId,
  selectedProductId,
  onSelect,
  onCreate,
  placeholder = "Search products by name...",
  disabled = false,
  required = false,
  error,
  allowQuickCreate = true,
  categories = [],
  compact = false,
}: ProductSelectorProps) {
  const [localCategories, setLocalCategories] = useState<ProductCategory[]>(categories)

  // Load categories if not provided
  useEffect(() => {
    if (categories.length === 0 && workspaceId) {
      const loadCategories = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("product_categories")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .order("sort_order")

        if (data) {
          setLocalCategories(data)
        }
      }
      loadCategories()
    }
  }, [workspaceId, categories])

  // Build config with memoization
  const config: EntitySelectorConfig<Product> = useMemo(() => ({
    table: "products",
    select: PRODUCT_SELECT,
    searchColumns: ["name", "name_hi"],
    orderBy: "name",
    limit: 20,
    minSearchLength: 0,
    scopeColumn: "workspace_id",
    staticFilters: [
      { column: "is_active", op: "eq" as const, value: true },
      { column: "deleted_at", op: "is" as const, value: null },
    ],
    entityLabel: "Product",

    renderItem: (product: Product) => <ProductDropdownItem product={product} />,

    renderSelected: (
      product: Product,
      opts: { onClear: () => void; disabled: boolean; error?: string }
    ) => (
      <ProductSelectedCard
        product={product}
        onClear={opts.onClear}
        disabled={opts.disabled}
        error={opts.error}
      />
    ),

    renderCompact: (
      product: Product,
      opts: { onClear: () => void; disabled: boolean; error?: string }
    ) => (
      <ProductSelectedCompact
        product={product}
        onClear={opts.onClear}
        disabled={opts.disabled}
        error={opts.error}
      />
    ),

    getDisplayName: (product: Product) => product.name,

    // Quick create fields with custom category and unit selects
    quickCreateFields: [
      {
        key: "name",
        placeholder: "Product Name (English) *",
        required: true,
        className: "col-span-2 md:col-span-1",
      },
      {
        key: "name_hi",
        placeholder: "Hindi Name (Optional)",
        className: "col-span-2 md:col-span-1",
      },
      {
        key: "category_id",
        placeholder: "Select Category",
        render: (value: string, onChange: (v: string) => void) => (
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            options={[
              { value: "", label: "Select Category" },
              ...localCategories.map((c: ProductCategory) => ({ value: c.id, label: c.name })),
            ]}
          />
        ),
      },
      {
        key: "default_unit",
        placeholder: "Unit",
        render: (value: string, onChange: (v: string) => void) => (
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            options={UNIT_OPTIONS}
          />
        ),
      },
      {
        key: "default_rate",
        placeholder: "Default Rate (₹)",
        type: "number",
        className: "col-span-2",
      },
    ],
    quickCreateGrid: true,
    quickCreateDefaults: {
      name: "",
      name_hi: "",
      category_id: "",
      default_unit: "Kg",
      default_rate: "",
    },

    prefillNameFromSearch: () => true,

    // Quick create handler
    onQuickCreate: async (formData, supabase, uid, scopeId) => {
      // Check for existing product with same name
      const { data: existing } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("workspace_id", scopeId)
        .ilike("name", formData.name.trim())
        .is("deleted_at", null)
        .maybeSingle()

      if (existing) {
        showInfo("Product already exists with this name")
        return existing as Product
      }

      // Create new product
      const { data: newProduct, error: createError } = await supabase
        .from("products")
        .insert(
          withCreatedBy({
            workspace_id: scopeId,
            name: formData.name.trim(),
            name_hi: formData.name_hi || null,
            category_id: formData.category_id || null,
            default_unit: formData.default_unit || "Kg",
            default_rate: formData.default_rate ? parseFloat(formData.default_rate) : null,
            is_active: true,
          }, uid)
        )
        .select(PRODUCT_SELECT)
        .single()

      if (createError) {
        console.error("Create error:", createError)
        showError("Failed to create product")
        return null
      }

      onCreate?.(newProduct as Product)
      return newProduct as Product
    },

    noResultsMessage: (search: string) => `No products found matching "${search}"`,
    emptyMessage: "No products yet. Add one below.",
  }), [localCategories, onCreate])

  return (
    <EntitySelector<Product>
      config={config}
      scopeId={workspaceId}
      userId={userId}
      selectedId={selectedProductId}
      onSelect={onSelect}
      onCreate={onCreate}
      allowQuickCreate={allowQuickCreate}
      compact={compact}
      disabled={disabled}
      error={error}
      required={required}
      placeholder={placeholder}
    />
  )
}

export default ProductSelector
