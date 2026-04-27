/**
 * Edit Miscellaneous Transaction Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { useAuthContext } from "@/lib/auth/useAuthContext"
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
import { EmptyState } from "@/components/ui/empty-state"

import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { EXPENSE_MISC_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type { MiscTransaction, MiscTransactionCategory, MiscTransactionFormData, MiscPaymentMode } from "@/types/expense-enhanced.types"
import { PermissionGuard } from "@/components/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

export default function EditMiscTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PermissionGuard permission="expenses.edit">
      <EditMiscTransactionContent params={params} />
    </PermissionGuard>
  )
}

function EditMiscTransactionContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { workspaceId } = useAuthContext()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses", defaultLabel: "All Expenses" })

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])

  const [formData, setFormData] = useState<MiscTransactionFormData>({
    transaction_type: "in",
    category_id: "",
    person_name: "",
    description: "",
    amount: 0,
    transaction_date: getTodayISO(),
    payment_mode: "cash",
    payment_reference: "",
    notes: "",
  })

  // Load transaction and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load transaction
      const { data: txData, error: txError } = await supabase
        .from("misc_transactions")
        .select(`
          *,
          category:misc_transaction_categories(id, name, name_hi, default_type)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (txError || !txData) {
        setNotFound(true)
        setLoadingData(false)
        return
      }

      const transaction = {
        ...txData,
        category: transformJoin(txData.category),
      } as MiscTransaction

      // Set form data from transaction
      setFormData({
        transaction_type: transaction.transaction_type,
        category_id: transaction.category_id || "",
        person_name: transaction.person_name || "",
        description: transaction.description || "",
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        payment_mode: transaction.payment_mode || "cash",
        payment_reference: transaction.payment_reference || "",
        notes: transaction.notes || "",
      })

      // Load categories
      const { data: catData } = await supabase
        .from("misc_transaction_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")

      setCategories(catData || [])
      setLoadingData(false)
    }

    loadData()
  }, [id, workspaceId])

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

    setLoading(true)

    try {
      const supabase = createClient()

      const selectedCategory = categories.find((c) => c.id === formData.category_id)

      const updateData = {
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
        updated_at: getNowISO(),
      }

      const { error } = await supabase
        .from("misc_transactions")
        .update(updateData)
        .eq("id", id)

      if (error) throw error

      showSuccess("Transaction updated")
      router.push(`/expenses/misc/${id}`)
    } catch (error) {
      logger.error("Failed to update transaction:", { detail: error })
      showError("Failed to update transaction")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (notFound) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Transaction not found"
          description="The transaction you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Transactions",
            href: "/expenses/misc",
          }}
        />
      </div>
    )
  }

  return (
    <FormPageTemplate
      title="Edit Transaction"
      description="Update the transaction details"
      icon={ArrowLeftRight}
      iconColor="blue"
      backHref={backHref}
      backLabel={backLabel}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/expenses/misc/${id}`)}
      submitLabel="Save Changes"
      loading={loading}
      loadingLabel="Saving..."
      permission="expenses.edit"
      feature="expenses"
    >
      {/* Transaction Type */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, transaction_type: "in", category_id: "" }))}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            formData.transaction_type === "in"
              ? "border-success bg-success/10"
              : "border-border hover:border-border"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowDownLeft className={`h-5 w-5 ${formData.transaction_type === "in" ? "text-success" : "text-muted-foreground"}`} />
            <span className={`font-medium ${formData.transaction_type === "in" ? "text-success" : "text-muted-foreground"}`}>
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
              ? "border-destructive bg-destructive/10"
              : "border-border hover:border-border"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowUpRight className={`h-5 w-5 ${formData.transaction_type === "out" ? "text-destructive" : "text-muted-foreground"}`} />
            <span className={`font-medium ${formData.transaction_type === "out" ? "text-destructive" : "text-muted-foreground"}`}>
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
