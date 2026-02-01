/**
 * Product Selector Component
 *
 * A reusable component for selecting an existing product or creating a new one inline.
 * Follows the same pattern as PersonSelector for consistent UX.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import {
  Search,
  Plus,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"
import type { Product, ProductCategory } from "@/types/expense-enhanced.types"

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

interface QuickCreateForm {
  name: string
  name_hi: string
  category_id: string
  default_unit: string
  default_rate: string
}

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
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateForm, setQuickCreateForm] = useState<QuickCreateForm>({
    name: "",
    name_hi: "",
    category_id: "",
    default_unit: "Kg",
    default_rate: "",
  })
  const [creating, setCreating] = useState(false)
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

  // Fetch selected product details if ID provided
  useEffect(() => {
    if (selectedProductId && !selectedProduct) {
      const fetchProduct = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("products")
          .select("*, category:product_categories(id, name, name_hi)")
          .eq("id", selectedProductId)
          .single()

        if (data) {
          setSelectedProduct(data)
        }
      }
      fetchProduct()
    }
  }, [selectedProductId, selectedProduct])

  // Search for products
  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: searchError } = await supabase
      .from("products")
      .select("*, category:product_categories(id, name, name_hi)")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .or(`name.ilike.%${query}%,name_hi.ilike.%${query}%`)
      .order("name")
      .limit(10)

    if (searchError) {
      console.error("Search error:", searchError)
      setResults([])
    } else {
      setResults(data || [])
    }

    setLoading(false)
  }, [workspaceId])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        searchProducts(search)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, isOpen, searchProducts])

  // Handle product selection
  const handleSelect = (product: Product) => {
    setSelectedProduct(product)
    onSelect(product)
    setIsOpen(false)
    setSearch("")
  }

  // Handle quick create
  const handleQuickCreate = async () => {
    if (!quickCreateForm.name.trim()) {
      toast.error("Product name is required")
      return
    }

    setCreating(true)
    const supabase = createClient()

    // Check for existing product with same name
    const { data: existing } = await supabase
      .from("products")
      .select("*, category:product_categories(id, name, name_hi)")
      .eq("workspace_id", workspaceId)
      .ilike("name", quickCreateForm.name.trim())
      .is("deleted_at", null)
      .maybeSingle()

    if (existing) {
      toast.info("Product already exists with this name")
      handleSelect(existing)
      setCreating(false)
      setShowQuickCreate(false)
      return
    }

    // Create new product
    const { data: newProduct, error: createError } = await supabase
      .from("products")
      .insert(
        withCreatedBy({
          workspace_id: workspaceId,
          name: quickCreateForm.name.trim(),
          name_hi: quickCreateForm.name_hi || null,
          category_id: quickCreateForm.category_id || null,
          default_unit: quickCreateForm.default_unit || "Kg",
          default_rate: quickCreateForm.default_rate ? parseFloat(quickCreateForm.default_rate) : null,
          is_active: true,
        }, userId)
      )
      .select("*, category:product_categories(id, name, name_hi)")
      .single()

    if (createError) {
      console.error("Create error:", createError)
      toast.error("Failed to create product")
      setCreating(false)
      return
    }

    toast.success("Product created successfully")
    handleSelect(newProduct)
    onCreate?.(newProduct)
    setCreating(false)
    setShowQuickCreate(false)
    setQuickCreateForm({ name: "", name_hi: "", category_id: "", default_unit: "Kg", default_rate: "" })
  }

  // Clear selection
  const handleClear = () => {
    setSelectedProduct(null)
    setSearch("")
    onSelect(null)
  }

  // If product is selected, show selection card (or compact display)
  if (selectedProduct) {
    // Compact mode - simple inline display matching input height
    if (compact) {
      return (
        <div className="space-y-2">
          <div className={cn(
            "h-10 flex items-center justify-between gap-2 px-3 rounded-lg border",
            error ? "border-red-300" : "border-primary/30 bg-primary/5"
          )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Package className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium truncate text-sm">
                {selectedProduct.name}
                {selectedProduct.name_hi && ` (${selectedProduct.name_hi})`}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
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

    // Full card mode
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
                    <span className="font-medium truncate">{selectedProduct.name}</span>
                    {selectedProduct.name_hi && (
                      <span className="text-muted-foreground">({selectedProduct.name_hi})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedProduct.category?.name && (
                      <span>{selectedProduct.category.name}</span>
                    )}
                    {selectedProduct.default_unit && (
                      <span>Unit: {selectedProduct.default_unit}</span>
                    )}
                    {selectedProduct.default_rate && (
                      <span>₹{selectedProduct.default_rate}</span>
                    )}
                  </div>
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
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

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className={cn("pl-10 pr-10", error && "border-red-300")}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && isOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-64 overflow-hidden">
            <CardContent className="p-0">
              {results.length > 0 ? (
                <div className="max-h-56 overflow-y-auto">
                  {results.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                      onClick={() => handleSelect(product)}
                    >
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
                      <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : search.length >= 2 && !loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No products found matching "{search}"
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}

              {/* Quick Create Option */}
              {allowQuickCreate && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowQuickCreate(true)
                      setIsOpen(false)
                      // Pre-fill name from search
                      if (search) {
                        setQuickCreateForm((prev) => ({ ...prev, name: search }))
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Create Form */}
      {showQuickCreate && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Product</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", name_hi: "", category_id: "", default_unit: "Kg", default_rate: "" })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Product Name (English) *"
                value={quickCreateForm.name}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                className="col-span-2 md:col-span-1"
              />
              <Input
                placeholder="Hindi Name (Optional)"
                value={quickCreateForm.name_hi}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, name_hi: e.target.value }))}
                className="col-span-2 md:col-span-1"
              />
              <Select
                value={quickCreateForm.category_id}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, category_id: e.target.value }))}
                options={[
                  { value: "", label: "Select Category" },
                  ...localCategories.map((c) => ({ value: c.id, label: c.name }))
                ]}
              />
              <Select
                value={quickCreateForm.default_unit}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, default_unit: e.target.value }))}
                options={UNIT_OPTIONS}
              />
              <Input
                type="number"
                placeholder="Default Rate (₹)"
                value={quickCreateForm.default_rate}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, default_rate: e.target.value }))}
                className="col-span-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", name_hi: "", category_id: "", default_unit: "Kg", default_rate: "" })
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleQuickCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create & Select
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default ProductSelector
