"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

import type { Product, DailySpend, Vendor } from "@/types/expense-enhanced.types"
import type { ComboboxOption } from "@/components/ui/combobox"

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

export function useExpenseDailySpendEdit(params: Promise<{ id: string }>) {
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

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: productsData } = await supabase
        .from("products")
        .select("*, category:product_categories(id, name, name_hi)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProducts(productsData || [])

      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setVendors(vendorsData || [])

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

      const product = transformJoin(entryData.product)
      const category = product?.category ? transformJoin(product.category) : null

      const transformed = {
        ...entryData,
        product,
        category,
      } as DailySpend

      setEntry(transformed)

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

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
    }))
  }

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

  return {
    id,
    backHref,
    loading,
    loadingData,
    entry,
    formData,
    setFormData,
    total,
    vendorOptions,
    productOptions,
    handleVendorSelect,
    handleProductSelect,
    handleSubmit,
  }
}
