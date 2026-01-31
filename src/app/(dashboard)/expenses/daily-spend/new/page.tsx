/**
 * New Daily Spend Entry Page
 *
 * Form to record a daily kitchen/household expense.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingBag, ArrowLeft, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { toast } from "sonner"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { PageLoading } from "@/components/ui/loading"

import type { Product, ProductCategory, Vendor } from "@/types/expense-enhanced.types"

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

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit", label: "Credit (Pay Later)" },
]

interface SpendLineItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit: string
  rate: number
  total: number
}

export default function NewDailySpendPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  // Form state
  const [spendDate, setSpendDate] = useState(new Date().toISOString().split("T")[0])
  const [vendorId, setVendorId] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [paymentMode, setPaymentMode] = useState("cash")
  const [upiRefNumber, setUpiRefNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<SpendLineItem[]>([
    {
      id: crypto.randomUUID(),
      product_id: "",
      product_name: "",
      quantity: 1,
      unit: "Kg",
      rate: 0,
      total: 0,
    },
  ])

  // Load products
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load active products
      const { data: productsData } = await supabase
        .from("products")
        .select("*, category:product_categories(id, name, name_hi)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProducts(productsData || [])

      // Load categories
      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      // Load vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setVendors(vendorsData || [])

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId])

  // Handle vendor selection
  const handleVendorSelect = (selectedVendorId: string) => {
    setVendorId(selectedVendorId)
    const vendor = vendors.find((v) => v.id === selectedVendorId)
    setVendorName(vendor?.name || "")
  }

  // Prepare vendor options for combobox
  const vendorOptions: ComboboxOption[] = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    description: v.phone || undefined,
  }))

  // Prepare product options for combobox
  const productOptions: ComboboxOption[] = products.map((p) => ({
    value: p.id,
    label: p.name_hi ? `${p.name} (${p.name_hi})` : p.name,
    description: p.category?.name || undefined,
  }))

  // Handle product selection
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const rate = product?.default_rate || 0
          return {
            ...item,
            product_id: productId,
            product_name: product?.name || "",
            unit: product?.default_unit || "Kg",
            rate,
            total: item.quantity * rate,
          }
        }
        return item
      })
    )
  }

  // Handle quantity/rate change
  const handleLineItemChange = (
    index: number,
    field: "quantity" | "rate" | "unit" | "product_name",
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          // Recalculate total
          if (field === "quantity" || field === "rate") {
            updated.total = Number(updated.quantity) * Number(updated.rate)
          }
          return updated
        }
        return item
      })
    )
  }

  // Add new line item
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: "",
        product_name: "",
        quantity: 1,
        unit: "Kg",
        rate: 0,
        total: 0,
      },
    ])
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculate grand total
  const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const validItems = lineItems.filter((item) => item.product_name && item.quantity > 0)
    if (validItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    if (!workspaceId || !user?.id) {
      toast.error("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Insert all line items
      const insertData = validItems.map((item) =>
        withCreatedBy(
          {
            workspace_id: workspaceId,
            spend_date: spendDate,
            product_id: item.product_id || null,
            product_name: item.product_name,
            category_id:
              products.find((p) => p.id === item.product_id)?.category_id || null,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            total: item.total,
            vendor_name: vendorName || null,
            payment_mode: paymentMode,
            upi_ref_number: paymentMode === "upi" ? upiRefNumber || null : null,
            notes: notes || null,
          },
          user.id
        )
      )

      const { error } = await supabase.from("daily_spend").insert(insertData)

      if (error) throw error

      toast.success(`${validItems.length} item(s) recorded successfully`)
      router.push("/expenses/daily-spend")
    } catch (error) {
      console.error("Failed to save daily spend:", error)
      toast.error("Failed to save expense")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.create">
        <div className="max-w-4xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href="/expenses/daily-spend"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Daily Spend
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>New Daily Spend</CardTitle>
                    <CardDescription>
                      Record kitchen and daily purchase expenses
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Header Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Date" required>
                    <Input
                      type="date"
                      value={spendDate}
                      onChange={(e) => setSpendDate(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Vendor/Shop Name">
                    <Combobox
                      options={vendorOptions}
                      value={vendorId}
                      onValueChange={handleVendorSelect}
                      placeholder="Select vendor..."
                      searchPlaceholder="Search vendors..."
                      emptyText="No vendors found. Add vendors in Expenses → Vendors."
                      clearable
                    />
                  </FormField>

                  <FormField label="Payment Mode">
                    <Select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      options={PAYMENT_MODE_OPTIONS}
                    />
                  </FormField>
                </div>

                {/* UPI Reference (conditional) */}
                {paymentMode === "upi" && (
                  <FormField label="UPI Reference Number">
                    <Input
                      value={upiRefNumber}
                      onChange={(e) => setUpiRefNumber(e.target.value)}
                      placeholder="e.g., 123456789012"
                    />
                  </FormField>
                )}

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg"
                      >
                        {/* Product Select */}
                        <div className="col-span-12 md:col-span-4">
                          <label className="text-xs text-muted-foreground">
                            Item
                          </label>
                          <Combobox
                            options={productOptions}
                            value={item.product_id}
                            onValueChange={(value) => handleProductSelect(index, value)}
                            placeholder="Select item..."
                            searchPlaceholder="Search items..."
                            emptyText="No items found. Add products in Products Master."
                            clearable
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Qty
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>

                        {/* Unit */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Unit
                          </label>
                          <Select
                            value={item.unit}
                            onChange={(e) =>
                              handleLineItemChange(index, "unit", e.target.value)
                            }
                            options={UNIT_OPTIONS}
                          />
                        </div>

                        {/* Rate */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Rate (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                "rate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>

                        {/* Total (readonly) */}
                        <div className="col-span-10 md:col-span-1">
                          <label className="text-xs text-muted-foreground">
                            Total
                          </label>
                          <div className="h-10 flex items-center font-medium">
                            ₹{item.total.toFixed(2)}
                          </div>
                        </div>

                        {/* Remove */}
                        <div className="col-span-2 md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length <= 1}
                            className="h-10 w-10"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-end border-t pt-4">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">
                        Grand Total:
                      </span>
                      <span className="ml-2 text-xl font-bold">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <FormField label="Notes" hint="Optional remarks">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                onClick={() => router.push("/expenses/daily-spend")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : `Save ${lineItems.filter((i) => i.product_name).length} Item(s)`}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
