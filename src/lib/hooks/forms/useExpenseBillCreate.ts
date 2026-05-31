"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getTodayISO } from "@/lib/date-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type { Vendor, BillCategory, BillPaymentFormData } from "@/types/expense-enhanced.types"
import { logger } from "@/lib/logger"

export { PAYMENT_MODE_OPTIONS }

const INITIAL_FORM: BillPaymentFormData = {
  vendor_id: "",
  vendor_name: "",
  category_id: "",
  category_name: "",
  bill_number: "",
  bill_period: "",
  bill_date: getTodayISO(),
  due_date: "",
  bill_amount: 0,
  base_amount: undefined,
  gst_amount: undefined,
  cgst: undefined,
  sgst: undefined,
  igst: undefined,
  hsn_code: "",
  paid_amount: undefined,
  payment_date: "",
  payment_mode: undefined,
  payment_reference: "",
  status: "pending",
  notes: "",
}

export function useExpenseBillCreate() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/bills" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [showGstFields, setShowGstFields] = useState(false)
  const [formData, setFormData] = useState<BillPaymentFormData>(INITIAL_FORM)

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setVendors(vendorsData || [])

      const { data: categoriesData } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])
      setLoadingData(false)
    }

    loadData()
  }, [workspaceId])

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
      category_id: vendor?.category_id || prev.category_id,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vendor_name.trim()) {
      showError("Vendor name is required")
      return
    }

    if (formData.bill_amount <= 0) {
      showError("Bill amount must be greater than 0")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    let status = formData.status
    if (formData.paid_amount && formData.payment_date) {
      if (formData.paid_amount >= formData.bill_amount) {
        status = "paid"
      } else if (formData.paid_amount > 0) {
        status = "partial"
      }
    }

    if (status === "pending" && formData.due_date) {
      const dueDate = new Date(formData.due_date)
      if (dueDate < new Date()) {
        status = "overdue"
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const billData = withCreatedBy(
        {
          workspace_id: workspaceId,
          vendor_id: formData.vendor_id || null,
          vendor_name: formData.vendor_name.trim(),
          category_id: formData.category_id || null,
          category_name:
            categories.find((c) => c.id === formData.category_id)?.name ||
            formData.category_name ||
            null,
          bill_number: formData.bill_number?.trim() || null,
          bill_period: formData.bill_period?.trim() || null,
          bill_date: formData.bill_date || null,
          due_date: formData.due_date || null,
          bill_amount: formData.bill_amount,
          base_amount: formData.base_amount || null,
          gst_amount: formData.gst_amount || null,
          cgst: formData.cgst || null,
          sgst: formData.sgst || null,
          igst: formData.igst || null,
          hsn_code: formData.hsn_code?.trim() || null,
          paid_amount: formData.paid_amount || null,
          payment_date: formData.payment_date || null,
          payment_mode: formData.payment_mode || null,
          payment_reference: formData.payment_reference?.trim() || null,
          status,
          notes: formData.notes?.trim() || null,
        },
        user.id
      )

      const { data, error } = await supabase
        .from("bill_payments")
        .insert(billData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Bill recorded successfully")
      router.push(`/expenses/bills/${data.id}`)
    } catch (error) {
      logger.error("Failed to create bill:", { detail: error })
      showError("Failed to create bill")
    } finally {
      setLoading(false)
    }
  }

  return {
    backHref,
    router,
    loading,
    loadingData,
    vendors,
    categories,
    showGstFields,
    setShowGstFields,
    formData,
    setFormData,
    handleVendorSelect,
    handleSubmit,
  }
}
