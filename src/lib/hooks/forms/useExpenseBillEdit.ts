"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS, EXPENSE_BILL_STATUS_OPTIONS as STATUS_OPTIONS } from "@/lib/status"
import type { BillPayment, Vendor, BillCategory, BillPaymentFormData } from "@/types/expense-enhanced.types"
import { logger } from "@/lib/logger"

export { PAYMENT_MODE_OPTIONS, STATUS_OPTIONS }

const INITIAL_FORM: BillPaymentFormData = {
  vendor_id: "",
  vendor_name: "",
  category_id: "",
  category_name: "",
  bill_number: "",
  bill_period: "",
  bill_date: "",
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

export function useExpenseBillEdit(params: Promise<{ id: string }>) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/bills" })
  const router = useRouter()
  const { user: _user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [bill, setBill] = useState<BillPayment | null>(null)
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

      const { data: billData, error } = await supabase
        .from("bill_payments")
        .select(`
          *,
          vendor:vendors(id, name),
          category:bill_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !billData) {
        showError("Bill not found")
        router.push("/expenses/bills")
        return
      }

      const transformed = {
        ...billData,
        vendor: transformJoin(billData.vendor),
        category: transformJoin(billData.category),
      } as BillPayment

      setBill(transformed)

      const hasGst = transformed.base_amount || transformed.gst_amount
      setShowGstFields(!!hasGst)

      setFormData({
        vendor_id: transformed.vendor_id || "",
        vendor_name: transformed.vendor_name,
        category_id: transformed.category_id || "",
        category_name: transformed.category_name || "",
        bill_number: transformed.bill_number || "",
        bill_period: transformed.bill_period || "",
        bill_date: transformed.bill_date || "",
        due_date: transformed.due_date || "",
        bill_amount: transformed.bill_amount,
        base_amount: transformed.base_amount || undefined,
        gst_amount: transformed.gst_amount || undefined,
        cgst: transformed.cgst || undefined,
        sgst: transformed.sgst || undefined,
        igst: transformed.igst || undefined,
        hsn_code: transformed.hsn_code || "",
        paid_amount: transformed.paid_amount || undefined,
        payment_date: transformed.payment_date || "",
        payment_mode: transformed.payment_mode || undefined,
        payment_reference: transformed.payment_reference || "",
        status: transformed.status as BillPaymentFormData["status"],
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.name || prev.vendor_name,
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

    let status = formData.status
    if (formData.paid_amount && formData.payment_date) {
      if (formData.paid_amount >= formData.bill_amount) {
        status = "paid"
      } else if (formData.paid_amount > 0) {
        status = "partial"
      }
    }

    if ((status === "pending" || status === "partial") && formData.due_date) {
      const dueDate = new Date(formData.due_date)
      if (dueDate < new Date()) {
        status = "overdue"
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("bill_payments")
        .update({
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
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Bill updated successfully")
      router.push(`/expenses/bills/${id}`)
    } catch (error) {
      logger.error("Failed to update bill:", { detail: error })
      showError("Failed to update bill")
    } finally {
      setLoading(false)
    }
  }

  return {
    id,
    backHref,
    router,
    loading,
    loadingData,
    vendors,
    categories,
    bill,
    showGstFields,
    setShowGstFields,
    formData,
    setFormData,
    handleVendorSelect,
    handleSubmit,
  }
}
