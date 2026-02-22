/**
 * Bill Payment Detail Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Receipt,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  AlertCircle,
  Check,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { formatCurrency, formatDate } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PAYMENT_METHODS } from "@/lib/status"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailPageTemplate,
  DetailSection,
  InfoRow,
} from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { BillPayment } from "@/types/expense-enhanced.types"

export default function BillPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [loading, setLoading] = useState(true)
  const [bill, setBill] = useState<BillPayment | null>(null)

  // Load bill
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("bill_payments")
        .select(`
          *,
          vendor:vendors(id, name, upi_id),
          category:bill_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      const transformed = {
        ...data,
        vendor: transformJoin(data.vendor),
        category: transformJoin(data.category),
      } as BillPayment

      setBill(transformed)
      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = () => {
    if (!user?.id) return

    confirm({
      title: "Delete Bill",
      description: "Are you sure you want to delete this bill? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("bill_payments", id, user.id)
          if (!result.error) {
            showSuccess("Bill deleted successfully")
            router.push("/expenses/bills")
          } else {
            showError(result.error.message || "Failed to delete bill")
          }
        } catch (error) {
          handleClientError(error, "Deleting bill")
        }
      },
    })
  }

  // Record quick payment
  const handleMarkPaid = async () => {
    if (!user?.id || !bill) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("bill_payments")
        .update({
          paid_amount: bill.bill_amount,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Bill marked as paid")
      // Refresh data
      setBill((prev) =>
        prev
          ? {
              ...prev,
              paid_amount: prev.bill_amount,
              payment_date: new Date().toISOString().split("T")[0],
              status: "paid",
            }
          : null
      )
    } catch (error) {
      handleClientError(error, "Updating bill")
    }
  }

  if (loading) return <PageLoading />

  if (!bill) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Bill not found"
          description="The bill you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Bills",
            href: "/expenses/bills",
          }}
        />
      </div>
    )
  }

  const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string; icon: React.ElementType }> = {
    paid: { variant: "success", label: "Paid", icon: Check },
    pending: { variant: "warning", label: "Pending", icon: Calendar },
    partial: { variant: "muted", label: "Partial", icon: CreditCard },
    overdue: { variant: "error", label: "Overdue", icon: AlertCircle },
  }
  const status = statusConfig[bill.status] || { variant: "muted", label: bill.status, icon: Receipt }

  const balanceDue = bill.bill_amount - (bill.paid_amount || 0)
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date() && bill.status !== "paid"


  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6">
          {ConfirmDialogElement}
          {/* Back Link */}
          <Link
            href="/expenses/bills"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Bills
          </Link>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-info" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {bill.vendor?.name || bill.vendor_name}
                </h1>
                {bill.bill_number && (
                  <p className="text-muted-foreground">Bill #{bill.bill_number}</p>
                )}
                <div className="flex gap-2 mt-1">
                  <TableBadge variant={status.variant}>
                    <status.icon className="h-3 w-3 mr-1" />
                    {status.label}
                  </TableBadge>
                  {bill.category && (
                    <TableBadge variant="muted">{bill.category.name}</TableBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {bill.status !== "paid" && (
                <Button variant="default" onClick={handleMarkPaid}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark Paid
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/expenses/bills/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Amount Summary Card */}
          <div
            className={`rounded-xl p-6 mb-6 text-white ${
              bill.status === "paid"
                ? "bg-gradient-to-r from-green-500 to-green-600"
                : isOverdue
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-gradient-to-r from-blue-500 to-blue-600"
            }`}
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm opacity-90">Bill Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(bill.bill_amount)}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Paid</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(bill.paid_amount || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm opacity-90">Balance Due</div>
                <div className="text-2xl font-bold">{formatCurrency(balanceDue)}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <DetailPageTemplate
            layoutKey="bill-payment-detail"
            entityType="bill_payment"
            record={bill}
            columns={2}
          >
            {/* Bill Details */}
            <DetailSection title="Bill Details" icon={Receipt}>
              <InfoRow
                label="Vendor"
                value={
                  bill.vendor?.id ? (
                    <Link
                      href={`/expenses/vendors/${bill.vendor.id}`}
                      className="text-primary hover:underline"
                    >
                      {bill.vendor.name}
                    </Link>
                  ) : (
                    bill.vendor_name
                  )
                }
              />
              <InfoRow
                label="Category"
                value={bill.category?.name || bill.category_name || "Uncategorized"}
              />
              <InfoRow label="Bill Number" value={bill.bill_number || "—"} />
              <InfoRow label="Bill Period" value={bill.bill_period || "—"} />
              <InfoRow
                label="Bill Date"
                value={bill.bill_date ? formatDate(bill.bill_date) : "—"}
              />
              <InfoRow
                label="Due Date"
                value={
                  bill.due_date ? (
                    <span className={isOverdue ? "text-destructive font-medium" : ""}>
                      {formatDate(bill.due_date)}
                      {isOverdue && " (Overdue)"}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailSection>

            {/* Payment Details */}
            <DetailSection title="Payment Details" icon={CreditCard}>
              <InfoRow
                label="Paid Amount"
                value={formatCurrency(bill.paid_amount || 0)}
              />
              <InfoRow
                label="Payment Date"
                value={bill.payment_date ? formatDate(bill.payment_date) : "—"}
              />
              <InfoRow
                label="Payment Mode"
                value={
                  bill.payment_mode
                    ? PAYMENT_METHODS[bill.payment_mode] || bill.payment_mode
                    : "—"
                }
              />
              <InfoRow label="Reference" value={bill.payment_reference || "—"} />
              <InfoRow label="Balance Due" value={formatCurrency(balanceDue)} />
            </DetailSection>

            {/* GST Details (if available) */}
            {(bill.base_amount || bill.gst_amount) && (
              <DetailSection title="GST Details" icon={Building2}>
                <InfoRow
                  label="Base Amount"
                  value={bill.base_amount ? formatCurrency(bill.base_amount) : "—"}
                />
                <InfoRow
                  label="Total GST"
                  value={bill.gst_amount ? formatCurrency(bill.gst_amount) : "—"}
                />
                {bill.cgst && <InfoRow label="CGST" value={formatCurrency(bill.cgst)} />}
                {bill.sgst && <InfoRow label="SGST" value={formatCurrency(bill.sgst)} />}
                {bill.igst && <InfoRow label="IGST" value={formatCurrency(bill.igst)} />}
                <InfoRow label="HSN Code" value={bill.hsn_code || "—"} />
              </DetailSection>
            )}

            {/* Notes */}
            {bill.notes && (
              <DetailSection title="Notes" icon={Receipt}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {bill.notes}
                </p>
              </DetailSection>
            )}
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
