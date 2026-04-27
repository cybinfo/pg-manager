/**
 * New Miscellaneous Transaction Page
 *
 * Uses useFormPage hook + FormPageTemplate for consistent layout.
 */

"use client"

import { useState, useEffect } from "react"
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { requiredAmount, requiredDate } from "@/lib/validation"

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

import { getTodayISO } from "@/lib/date-helpers"
import { EXPENSE_MISC_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS } from "@/lib/status"
import type { MiscTransactionCategory, MiscPaymentMode } from "@/types/expense-enhanced.types"
import { PermissionGuard } from "@/components/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

export default function NewMiscTransactionPage() {
  return (
    <PermissionGuard permission="expenses.create">
      <NewMiscTransactionContent />
    </PermissionGuard>
  )
}

function NewMiscTransactionContent() {
  const { workspaceId } = useAuthContext()
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses", defaultLabel: "All Expenses" })

  const {
    formData,
    setFormData,
    handleSubmit,
    saving,
    errors,
    validateField,
    router,
  } = useFormPage({
    table: "misc_transactions",
    initialData: {
      transaction_type: "in",
      category_id: "",
      person_name: "",
      description: "",
      amount: 0,
      transaction_date: getTodayISO(),
      payment_mode: "cash",
      payment_reference: "",
      notes: "",
    },
    redirectTo: "/expenses/misc",
    addOwnerId: false,
    selectAfterInsert: true,
    successMessage: "Transaction recorded",
    errorMessage: "Failed to create transaction",
    validationSchema: {
      amount: requiredAmount("Amount"),
      transaction_date: requiredDate("Date"),
      person_name: (value: unknown, data: Record<string, unknown>) => {
        const personName = String(value ?? "").trim()
        const description = String(data?.description ?? "").trim()
        if (!personName && !description) {
          return { isValid: false, error: "Please enter person name or description" }
        }
        return null
      },
    },
    transform: (data) => {
      const selectedCategory = categories.find((c: MiscTransactionCategory) => c.id === data.category_id)
      return {
        workspace_id: workspaceId,
        transaction_type: data.transaction_type,
        category_id: data.category_id || null,
        category_name: selectedCategory?.name || null,
        person_name: data.person_name?.trim() || null,
        description: data.description?.trim() || null,
        amount: data.amount,
        transaction_date: data.transaction_date,
        payment_mode: data.payment_mode || "cash",
        payment_reference: data.payment_reference?.trim() || null,
        notes: data.notes?.trim() || null,
      }
    },
    onSuccess: (data) => {
      if (data?.id) return `/expenses/misc/${data.id}`
    },
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
        logger.error("Failed to load categories:", { detail: error })
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

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FormPageTemplate
      title="New Transaction"
      description="Record money in or money out"
      icon={ArrowLeftRight}
      iconColor="blue"
      backHref={backHref}
      backLabel={backLabel}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/expenses/misc")}
      submitLabel={formData.transaction_type === "in" ? "Record Money In" : "Record Money Out"}
      loading={saving}
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
          <FormField label="Date" required error={errors.transaction_date}>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
              }
              onBlur={() => validateField("transaction_date")}
            />
          </FormField>

          <FormField label="Amount" required error={errors.amount}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
              }
              onBlur={() => validateField("amount")}
              placeholder="0.00"
            />
          </FormField>
        </FormGrid>

        <FormField label="Person Name" hint={formData.transaction_type === "in" ? "Who gave the money?" : "Who received the money?"} error={errors.person_name}>
          <Input
            value={formData.person_name || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, person_name: e.target.value }))
            }
            onBlur={() => validateField("person_name")}
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
