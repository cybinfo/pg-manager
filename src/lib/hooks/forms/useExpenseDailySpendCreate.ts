"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getTodayISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

import type { Product, ProductCategory, Vendor } from "@/types/expense-enhanced.types"

export interface SpendLineItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit: string
  rate: number
  total: number
}

export function useExpenseDailySpendCreate() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/daily-spend" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [_vendors, setVendors] = useState<Vendor[]>([])

  const [spendDate, setSpendDate] = useState(getTodayISO())
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

      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

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

  const handleVendorSelect = (vendor: Vendor | null) => {
    setVendorId(vendor?.id || "")
    setVendorName(vendor?.name || "")
  }

  const handleProductSelect = (index: number, product: Product | null) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          if (!product) {
            return { ...item, product_id: "", product_name: "", unit: "Kg", rate: 0, total: 0 }
          }
          const rate = product.default_rate || 0
          return {
            ...item,
            product_id: product.id,
            product_name: product.name || "",
            unit: product.default_unit || "Kg",
            rate,
            total: item.quantity * rate,
          }
        }
        return item
      })
    )
  }

  const handleProductCreated = (product: Product) => {
    setProducts((prev) => [...prev, product])
  }

  const handleLineItemChange = (
    index: number,
    field: "quantity" | "rate" | "unit" | "product_name",
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updated.total = Number(updated.quantity) * Number(updated.rate)
          }
          return updated
        }
        return item
      })
    )
  }

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

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = lineItems.filter((item) => item.product_name && item.quantity > 0)
    if (validItems.length === 0) {
      showError("Please add at least one item")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const insertData = validItems.map((item) => {
        const product = products.find((p) => p.id === item.product_id)
        return withCreatedBy(
          {
            workspace_id: workspaceId,
            spend_date: spendDate,
            product_id: item.product_id || null,
            product_name: item.product_name,
            category_name: product?.category?.name || null,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            total: item.total,
            vendor_name: vendorName || null,
            payment_mode: paymentMode,
            payment_reference: paymentMode === "upi" ? upiRefNumber || null : null,
            notes: notes || null,
          },
          user.id
        )
      })

      const { error } = await supabase.from("daily_spend").insert(insertData)
      if (error) throw error

      showSuccess(`${validItems.length} item(s) recorded successfully`)
      router.push("/expenses/daily-spend")
    } catch (error) {
      logger.error("Failed to save daily spend:", { detail: error })
      showError("Failed to save expense")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    user,
    workspaceId,
    loading,
    loadingData,
    products,
    categories,
    spendDate,
    setSpendDate,
    vendorId,
    vendorName,
    paymentMode,
    setPaymentMode,
    upiRefNumber,
    setUpiRefNumber,
    notes,
    setNotes,
    lineItems,
    grandTotal,
    handleVendorSelect,
    handleProductSelect,
    handleProductCreated,
    handleLineItemChange,
    addLineItem,
    removeLineItem,
    handleSubmit,
  }
}
