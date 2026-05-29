/**
 * Edit Daily Spend Entry Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingBag, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Currency } from "@/components/ui/currency"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { DatePicker } from "@/components/ui/date-picker"

import { EXPENSE_DAILY_SPEND_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS, UNIT_OPTIONS } from "@/lib/status"
import type { Product, DailySpend, Vendor } from "@/types/expense-enhanced.types"
import { logger } from "@/lib/logger"

interface FormData {
  spend_date: string
  product_id: string
  product_name: string
  quantity: number
  unit: string
  rate: number
  vendor_id: string
  vendor_name: string
  payment_mode: string
  upi_ref_number: string
  notes: string
}

export default function EditDailySpendPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditDailySpendContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditDailySpendContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/daily-spend" })
  const router = useRouter()
  const { user: _user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [entry, setEntry] = useState<DailySpend | null>(null)

  const [formData, setFormData] = useState<FormData>({
    spend_date: "",
    product_id: "",
    product_name: "",
    quantity: 1,
    unit: "Kg",
    rate: 0,
    vendor_id: "",
    vendor_name: "",
    payment_mode: "cash",
    upi_ref_number: "",
    notes: "",
  })

  // Load entry and products
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("*, category:product_categories(id, name, name_hi)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProducts(productsData || [])

      // Load vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setVendors(vendorsData || [])

      // Load entry
      const { data: entryData, error } = await supabase
        .from("daily_spend")
        .select(`
          *,
          product:products(id, name, name_hi, category:product_categories(id, name, name_hi))
        `)
        .eq("id", id)
        .single()

      if (error || !entryData) {
        showError("Entry not found")
        router.push("/expenses/daily-spend")
        return
      }

      // Get category from product's nested category
      const product = transformJoin(entryData.product)
      const category = product?.category ? transformJoin(product.category) : null

      const transformed = {
        ...entryData,
        product,
        category,
      } as DailySpend

      setEntry(transformed)

      // Try to match vendor by name
      const matchedVendor = vendorsData?.find(
        (v: Vendor) => v.name.toLowerCase() === transformed.vendor_name?.toLowerCase()
      )

      setFormData({
        spend_date: transformed.spend_date,
        product_id: transformed.product_id || "",
        product_name: transformed.product_name,
        quantity: transformed.quantity,
        unit: transformed.unit,
        rate: transformed.rate,
        vendor_id: matchedVendor?.id || "",
        vendor_name: transformed.vendor_name || "",
        payment_mode: transformed.payment_mode,
        upi_ref_number: transformed.payment_reference || "",
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  // Prepare combobox options
  const vendorOptions: ComboboxOption[] = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    description: v.phone || undefined,
  }))

  const productOptions: ComboboxOption[] = products.map((p) => ({
    value: p.id,
    label: p.name_hi ? `${p.name} (${p.name_hi})` : p.name,
    description: p.category?.name || undefined,
  }))

  // Handle vendor selection
  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
    }))
  }

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        product_name: product.name,
        unit: product.default_unit || prev.unit,
        rate: product.default_rate || prev.rate,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        product_id: "",
        product_name: "",
      }))
    }
  }

  // Calculate total
  const total = formData.quantity * formData.rate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_name.trim()) {
      showError("Item name is required")
      return
    }

    if (formData.quantity <= 0) {
      showError("Quantity must be greater than 0")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("daily_spend")
        .update({
          spend_date: formData.spend_date,
          product_id: formData.product_id || null,
          product_name: formData.product_name.trim(),
          category_id:
            products.find((p) => p.id === formData.product_id)?.category_id || entry?.category_id,
          quantity: formData.quantity,
          unit: formData.unit,
          rate: formData.rate,
          total,
          vendor_name: formData.vendor_name.trim() || null,
          payment_mode: formData.payment_mode,
          payment_reference:
            formData.payment_mode === "upi"
              ? formData.upi_ref_number.trim() || null
              : null,
          notes: formData.notes.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Entry updated successfully")
      router.push(`/expenses/daily-spend/${id}`)
    } catch (error) {
      logger.error("Failed to update entry:", { detail: error })
      showError("Failed to update entry")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (!entry) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Entry not found"
          description="The expense entry you're looking for doesn't exist."
          action={{
            label: "Back to Daily Spend",
            href: "/expenses/daily-spend",
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Entry
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Edit Entry</CardTitle>
                    <CardDescription>Update expense details</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Date */}
                <FormField label="Date" required>
                  <DatePicker
                    value={formData.spend_date}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        spend_date: val,
                      }))
                    }
                    placeholder="Pick a date"
                  />
                </FormField>

                {/* Product */}
                <FormField label="Item" required>
                  <Combobox
                    options={productOptions}
                    value={formData.product_id}
                    onValueChange={handleProductSelect}
                    placeholder="Select item..."
                    searchPlaceholder="Search items..."
                    emptyText="No items found. Add products in Products Master."
                    clearable
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quantity */}
                  <FormField label="Quantity" required>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </FormField>

                  {/* Unit */}
                  <FormField label="Unit">
                    <Select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, unit: e.target.value }))
                      }
                      options={UNIT_OPTIONS}
                    />
                  </FormField>

                  {/* Rate */}
                  <FormField label="Rate (₹)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          rate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </FormField>
                </div>

                {/* Total Display */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-xl font-bold"><Currency amount={total} /></span>
                  </div>
                </div>

                {/* Vendor */}
                <FormField label="Vendor/Shop Name">
                  <Combobox
                    options={vendorOptions}
                    value={formData.vendor_id}
                    onValueChange={handleVendorSelect}
                    placeholder="Select vendor..."
                    searchPlaceholder="Search vendors..."
                    emptyText="No vendors found. Add vendors in Expenses → Vendors."
                    clearable
                  />
                </FormField>

                {/* Payment Mode */}
                <FormField label="Payment Mode">
                  <Select
                    value={formData.payment_mode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_mode: e.target.value,
                      }))
                    }
                    options={PAYMENT_MODE_OPTIONS}
                  />
                </FormField>

                {/* UPI Reference (conditional) */}
                {formData.payment_mode === "upi" && (
                  <FormField label="UPI Reference Number">
                    <Input
                      value={formData.upi_ref_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          upi_ref_number: e.target.value,
                        }))
                      }
                      placeholder="e.g., 123456789012"
                    />
                  </FormField>
                )}

                {/* Notes */}
                <FormField label="Notes">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/expenses/daily-spend/${id}`)}
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
