"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, EXPENSE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Expense } from "@/types/expenses.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Receipt,
  Building2,
  Calendar,
  Wallet,
  FileText,
  Edit,
  Trash2,
  User,
  Hash,
  Clock,
} from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { PAYMENT_METHODS } from "@/lib/status"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

export default function ExpenseDetailPage() {
  const params = useParams()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses", defaultLabel: "All Expenses" })

  // Use centralized hook for data fetching
  const {
    data: expense,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<Expense>({
    config: EXPENSE_DETAIL_CONFIG,
    id: params.id as string,
  })

  const handleDelete = async () => {
    await deleteRecord({ confirm: true })
  }

  if (loading) {
    return <PageLoading message="Loading expense details..." />
  }

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={expense.expense_type?.name || "Expense"}
        subtitle={formatDate(expense.expense_date)}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Expenses", href: "/expenses" },
          { label: "Expense Details" },
        ]}
        avatar={
          <div className="p-3 bg-destructive/10 rounded-lg">
            <Receipt className="h-8 w-8 text-destructive" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <PermissionGate permission="expenses.edit" hide>
              <Link href={`/expenses/${expense.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="expenses.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Amount Card */}
      <InfoCard
        label="Amount"
        value={<Currency amount={expense.amount} />}
        icon={Receipt}
        variant="error"
        className="max-w-sm"
      />

      <DetailPageTemplate layoutKey="expense-detail" entityType="expense" record={expense}>
        {/* Expense Details */}
        <DetailSection
          title="Expense Details"
          description="Category and description"
          icon={Receipt}
        >
          <InfoRow label="Category" value={expense.expense_type?.name || "N/A"} />
          <InfoRow
            label="Date"
            value={formatDate(expense.expense_date)}
            icon={Calendar}
          />
          <InfoRow
            label="Property"
            value={
              expense.property ? (
                <Link href={`/properties/${expense.property.id}`} className="text-primary hover:underline flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {expense.property.name}
                </Link>
              ) : (
                <span>All Properties</span>
              )
            }
          />
          {expense.description && (
            <InfoRow label="Description" value={expense.description} />
          )}
        </DetailSection>

        {/* Payment Information */}
        <DetailSection
          title="Payment Information"
          description="Method and vendor details"
          icon={Wallet}
        >
          <InfoRow
            label="Payment Method"
            value={PAYMENT_METHODS[expense.payment_method || ""] || expense.payment_method || "N/A"}
          />
          {expense.vendor_name && (
            <InfoRow
              label="Vendor / Payee"
              value={expense.vendor_name}
              icon={User}
            />
          )}
          {expense.reference_number && (
            <InfoRow
              label="Reference #"
              value={expense.reference_number}
              icon={Hash}
            />
          )}
        </DetailSection>

        {/* Notes */}
        {expense.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={FileText}
            className="md:col-span-2"
          >
            <p className="text-muted-foreground whitespace-pre-wrap">{expense.notes}</p>
          </DetailSection>
        )}

        {/* Metadata */}
        <DetailSection
          title="Record Info"
          description="Creation and update timestamps"
          icon={Clock}
          className="md:col-span-2"
        >
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Created: {formatDateTime(expense.created_at)}</span>
            <span>Updated: {formatDateTime(expense.updated_at)}</span>
            <span>ID: {expense.id}</span>
          </div>
        </DetailSection>

      </DetailPageTemplate>
    </div>
  )
}
