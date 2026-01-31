/**
 * Daily Spend Detail Page
 *
 * Shows details of a single daily spend entry.
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ShoppingBag,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Store,
  CreditCard,
  Package,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"

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

import type { DailySpend } from "@/types/expense-enhanced.types"

export default function DailySpendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [entry, setEntry] = useState<DailySpend | null>(null)

  // Load entry
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("daily_spend")
        .select(`
          *,
          product:products(id, name, name_hi, default_unit),
          category:product_categories(id, name, name_hi)
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
        product: transformJoin(data.product),
        category: transformJoin(data.category),
      } as DailySpend

      setEntry(transformed)
      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!user?.id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete this expense entry? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const result = await softDelete("daily_spend", id, user.id)
      if (!result.error) {
        toast.success("Entry deleted successfully")
        router.push("/expenses/daily-spend")
      } else {
        toast.error(result.error.message || "Failed to delete entry")
      }
    } catch (error) {
      console.error("Failed to delete entry:", error)
      toast.error("Failed to delete entry")
    }
  }

  if (loading) return <PageLoading />

  if (!entry) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Entry not found"
          description="The expense entry you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Daily Spend",
            href: "/expenses/daily-spend",
          }}
        />
      </div>
    )
  }

  const paymentModeLabels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank Transfer",
    credit: "Credit",
    cheque: "Cheque",
    dd: "Demand Draft",
  }
  const paymentModeLabel = paymentModeLabels[entry.payment_mode] || entry.payment_mode

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6">
          {/* Back Link */}
          <Link
            href="/expenses/daily-spend"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Daily Spend
          </Link>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {entry.product?.name || entry.product_name}
                </h1>
                {entry.product?.name_hi && (
                  <p className="text-muted-foreground">{entry.product.name_hi}</p>
                )}
                <div className="flex gap-2 mt-1">
                  <TableBadge variant="muted">
                    {formatDate(entry.spend_date)}
                  </TableBadge>
                  <TableBadge
                    variant={
                      entry.payment_mode === "cash"
                        ? "warning"
                        : entry.payment_mode === "upi"
                          ? "success"
                          : "muted"
                    }
                  >
                    {paymentModeLabel}
                  </TableBadge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/expenses/daily-spend/${id}/edit`}>
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

          {/* Amount Card */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6 mb-6">
            <div className="text-sm opacity-90">Total Amount</div>
            <div className="text-3xl font-bold mt-1">
              {formatCurrency(entry.total)}
            </div>
            <div className="text-sm opacity-90 mt-2">
              {entry.quantity} {entry.unit} × {formatCurrency(entry.rate)}/{entry.unit}
            </div>
          </div>

          {/* Content */}
          <DetailPageTemplate
            layoutKey="daily-spend-detail"
            entityType="daily_spend"
            record={entry}
            columns={2}
          >
            {/* Purchase Details */}
            <DetailSection title="Purchase Details" icon={Package}>
              <InfoRow
                label="Item"
                value={entry.product?.name || entry.product_name}
              />
              {entry.product?.name_hi && (
                <InfoRow label="Hindi Name" value={entry.product.name_hi} />
              )}
              <InfoRow
                label="Category"
                value={entry.category?.name || "Uncategorized"}
              />
              <InfoRow
                label="Quantity"
                value={`${entry.quantity} ${entry.unit}`}
              />
              <InfoRow
                label="Rate"
                value={`${formatCurrency(entry.rate)}/${entry.unit}`}
              />
              <InfoRow label="Total" value={formatCurrency(entry.total)} />
            </DetailSection>

            {/* Transaction Details */}
            <DetailSection title="Transaction Details" icon={CreditCard}>
              <InfoRow label="Date" value={formatDate(entry.spend_date)} />
              <InfoRow
                label="Vendor"
                value={entry.vendor_name || "Not specified"}
              />
              <InfoRow label="Payment Mode" value={paymentModeLabel} />
              {entry.upi_ref_number && (
                <InfoRow label="UPI Reference" value={entry.upi_ref_number} />
              )}
              {entry.upi_app && (
                <InfoRow label="UPI App" value={entry.upi_app} />
              )}
            </DetailSection>

            {/* Notes */}
            {entry.notes && (
              <DetailSection title="Notes" icon={Store}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.notes}
                </p>
              </DetailSection>
            )}
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
