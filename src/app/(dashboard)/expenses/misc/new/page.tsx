/**
 * New Miscellaneous Transaction Page
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import {
  FormPageTemplate,
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import type { MiscTransactionCategory, MiscTransactionFormData, MiscPaymentMode } from "@/types/expense-enhanced.types"

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "paytm", label: "Paytm" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
]

export default function NewMiscTransactionPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])

  const [formData, setFormData] = useState<MiscTransactionFormData>({
    transaction_type: "in",
    category_id: "",
    person_name: "",
    description: "",
    amount: 0,
    transaction_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    payment_reference: "",
    notes: "",
  })

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from("misc_transaction_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")

      if (error) {
        console.error("Failed to load categories:", error)
      } else {
        setCategories(data || [])
      }
      setLoadingData(false)
    }

    loadCategories()
  }, [workspaceId])

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    (cat) => cat.default_type === "both" || cat.default_type === formData.transaction_type
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.amount <= 0) {
      showError("Amount must be greater than 0")
      return
    }

    if (!formData.person_name?.trim() && !formData.description?.trim()) {
      showError("Please enter person name or description")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const selectedCategory = categories.find((c) => c.id === formData.category_id)

      const transactionData = withCreatedBy(
        {
          workspace_id: workspaceId,
          transaction_type: formData.transaction_type,
          category_id: formData.category_id || null,
          category_name: selectedCategory?.name || null,
          person_name: formData.person_name?.trim() || null,
          description: formData.description?.trim() || null,
          amount: formData.amount,
          transaction_date: formData.transaction_date,
          payment_mode: formData.payment_mode || "cash",
          payment_reference: formData.payment_reference?.trim() || null,
          notes: formData.notes?.trim() || null,
        },
        user.id
      )

      const { data, error } = await supabase
        .from("misc_transactions")
        .insert(transactionData)
        .select()
        .single()

      if (error) throw error

      showSuccess(
        formData.transaction_type === "in"
          ? "Money In recorded"
          : "Money Out recorded"
      )
      router.push(`/expenses/misc/${data.id}`)
    } catch (error) {
      console.error("Failed to create transaction:", error)
      showError("Failed to create transaction")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FormPageTemplate
      title="New Transaction"
      description="Record money in or money out"
      icon={ArrowLeftRight}
      iconColor="blue"
      backHref="/expenses/misc"
      backLabel="Back to Transactions"
      onSubmit={handleSubmit}
      onCancel={() => router.push("/expenses/misc")}
      submitLabel={formData.transaction_type === "in" ? "Record Money In" : "Record Money Out"}
      loading={loading}
      loadingLabel="Saving..."
      permission="expenses.create"
      feature="expenses"
    >
      {/* Transaction Type */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, transaction_type: "in", category_id: "" }))}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            formData.transaction_type === "in"
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : "border-border hover:border-border"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowDownLeft className={`h-5 w-5 ${formData.transaction_type === "in" ? "text-green-600" : "text-muted-foreground"}`} />
            <span className={`font-medium ${formData.transaction_type === "in" ? "text-green-700" : "text-muted-foreground"}`}>
              Money In
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Received money</p>
        </button>

        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, transaction_type: "out", category_id: "" }))}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            formData.transaction_type === "out"
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-border hover:border-border"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowUpRight className={`h-5 w-5 ${formData.transaction_type === "out" ? "text-red-600" : "text-muted-foreground"}`} />
            <span className={`font-medium ${formData.transaction_type === "out" ? "text-red-700" : "text-muted-foreground"}`}>
              Money Out
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Paid money</p>
        </button>
      </div>

      {/* Basic Details */}
      <FormSection title="Transaction Details">
        <FormGrid cols={2}>
          <FormField label="Date" required>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Amount" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
              }
              placeholder="0.00"
            />
          </FormField>
        </FormGrid>

        <FormField label="Person Name" hint={formData.transaction_type === "in" ? "Who gave the money?" : "Who received the money?"}>
          <Input
            value={formData.person_name || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, person_name: e.target.value }))
            }
            placeholder="e.g., Tenant name, Owner, Vendor"
          />
        </FormField>

        <FormField label="Category">
          <Select
            value={formData.category_id || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category_id: e.target.value }))
            }
            options={[
              { value: "", label: "Select category" },
              ...filteredCategories.map((cat) => ({
                value: cat.id,
                label: cat.name_hi ? `${cat.name} (${cat.name_hi})` : cat.name,
              })),
            ]}
          />
        </FormField>

        <FormField label="Description" hint="What is this transaction for?">
          <Textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="e.g., PG Rent for Room 301, January 2026"
            rows={2}
          />
        </FormField>
      </FormSection>

      {/* Payment Details */}
      <FormSection title="Payment Details">
        <FormGrid cols={2}>
          <FormField label="Payment Mode">
            <Select
              value={formData.payment_mode || "cash"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  payment_mode: e.target.value as MiscPaymentMode,
                }))
              }
              options={PAYMENT_MODE_OPTIONS}
            />
          </FormField>

          <FormField label="Reference Number" hint="Transaction ID, Cheque No., etc.">
            <Input
              value={formData.payment_reference || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))
              }
              placeholder="Optional"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Notes */}
      <FormField label="Notes">
        <Textarea
          value={formData.notes || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Any additional notes..."
          rows={2}
        />
      </FormField>
    </FormPageTemplate>
  )
}
