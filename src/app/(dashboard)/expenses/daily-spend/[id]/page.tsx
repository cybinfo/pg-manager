/**
 * Daily Spend Detail Page
 *
 * Shows details of a single daily spend entry.
 * Uses centralized UI components for consistency.
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ShoppingBag,
  Edit,
  Trash2,
  Store,
  CreditCard,
  Package,
  IndianRupee,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { formatCurrency, formatDate } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PAYMENT_METHODS } from "@/lib/status"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailPageTemplate,
  DetailSection,
  InfoRow,
} from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import { NotFoundState } from "@/components/ui/empty-state"

import type { DailySpend } from "@/types/expense-enhanced.types"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

export default function DailySpendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses/daily-spend", defaultLabel: "Back to Daily Spend" })
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
          product:products(id, name, name_hi, default_unit, category:product_categories(id, name, name_hi))
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      // Get category from product's nested category
      const product = transformJoin(data.product)
      const category = product?.category ? transformJoin(product.category) : null

      const transformed = {
        ...data,
        product,
        category,
      } as DailySpend

      setEntry(transformed)
      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = () => {
    if (!user?.id) return

    confirm({
      title: "Delete Expense Entry",
      description: "Are you sure you want to delete this expense entry? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("daily_spend", id, user.id)
          if (!result.error) {
            showSuccess("Entry deleted successfully")
            router.push("/expenses/daily-spend")
          } else {
            showError(result.error.message || "Failed to delete entry")
          }
        } catch (error) {
          console.error("Failed to delete entry:", error)
          showError("Failed to delete entry")
        }
      },
    })
  }

  if (loading) return <PageLoading />

  if (!entry) {
    return (
      <NotFoundState
        title="Entry not found"
        description="The expense entry you're looking for doesn't exist or has been deleted."
        backHref={backHref}
        backLabel={backLabel}
      />
    )
  }

  const paymentModeLabel = PAYMENT_METHODS[entry.payment_mode] || entry.payment_mode

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="space-y-6">
          {ConfirmDialogElement}
          {/* Hero Section - Using centralized DetailHero */}
          <DetailHero
            title={entry.product?.name || entry.product_name}
            subtitle={entry.product?.name_hi}
            backHref={backHref}
            backLabel={backLabel}
            avatar={
              <div className="p-3 bg-warning/10 rounded-lg">
                <ShoppingBag className="h-8 w-8 text-warning" />
              </div>
            }
            status={
              <div className="flex gap-2">
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
            }
            actions={
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
            }
          />

          {/* Amount Card - Using centralized InfoCard */}
          <InfoCard
            label="Total Amount"
            value={
              <div>
                <div className="text-2xl">{formatCurrency(entry.total)}</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {entry.quantity} {entry.unit} × {formatCurrency(entry.rate)}/{entry.unit}
                </div>
              </div>
            }
            icon={IndianRupee}
            variant="warning"
            className="max-w-sm"
          />

          {/* Content */}
          <DetailPageTemplate
            layoutKey="daily-spend-detail"
            entityType="daily_spend"
            record={entry}
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
