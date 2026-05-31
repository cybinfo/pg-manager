"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

import type { Product, ProductFormData, ProductCategory } from "@/types/expense-enhanced.types"

export function useExpenseProductEditForm(id: string) {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/products" })
  const router = useRouter()
  const { user: _user, workspaceId } = useAuthContext()

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
    is_active: true as boolean,
  })

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

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
      logger.error("Failed to update product:", { detail: error })
      showError("Failed to update product")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    router,
    loading,
    loadingData,
    categories,
    product,
    formData,
    setFormData,
    handleSubmit,
  }
}
