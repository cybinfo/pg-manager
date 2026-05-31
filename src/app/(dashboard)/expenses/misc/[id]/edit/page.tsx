/**
 * Edit Miscellaneous Transaction Page
 */

"use client"

import { use } from "react"
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  FormPageTemplate,
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"
import { PermissionGuard } from "@/components/auth"
import { useExpenseMiscEdit, PAYMENT_MODE_OPTIONS } from "@/lib/hooks/forms/useExpenseMiscEdit"
import type { MiscPaymentMode } from "@/lib/hooks/forms/useExpenseMiscEdit"

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

  const {
    backHref,
    backLabel,
    loading,
    loadingData,
    notFound,
    formData,
    setFormData,
    filteredCategories,
    handleSubmit,
    setTransactionType,
    router,
  } = useExpenseMiscEdit(id)

  if (loadingData) {
    return <PageLoading />
  }

  if (notFound) {
    return <NotFoundState title="Transaction not found" backHref="/expenses/misc" backLabel="All Misc" />
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
      module="expenses"
    >
      {/* Transaction Type */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setTransactionType("in")}
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
          onClick={() => setTransactionType("out")}
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
            <DatePicker
              value={formData.transaction_date}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, transaction_date: val }))
              }
              placeholder="Pick a date"
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
