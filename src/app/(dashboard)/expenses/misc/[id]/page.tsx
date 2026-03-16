/**
 * Miscellaneous Transaction Detail Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftRight,
  Edit,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  User,
  CreditCard,
  FileText,
  Home,
  ChevronRight,
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
import { DetailSection, InfoRow, DetailPageAudit } from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { MiscTransaction } from "@/types/expense-enhanced.types"

export default function MiscTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [loading, setLoading] = useState(true)
  const [transaction, setTransaction] = useState<MiscTransaction | null>(null)

  // Load transaction
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("misc_transactions")
        .select(`
          *,
          category:misc_transaction_categories(id, name, name_hi, default_type)
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
        category: transformJoin(data.category),
      } as MiscTransaction

      setTransaction(transformed)
      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = () => {
    if (!user?.id) return

    confirm({
      title: "Delete Transaction",
      description: "Are you sure you want to delete this transaction? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("misc_transactions", id, user.id)
          if (!result.error) {
            showSuccess("Transaction deleted")
            router.push("/expenses/misc")
          } else {
            showError(result.error.message || "Failed to delete")
          }
        } catch (error) {
          console.error("Failed to delete:", error)
          showError("Failed to delete")
        }
      },
    })
  }

  if (loading) return <PageLoading />

  if (!transaction) {
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

  const isMoneyIn = transaction.transaction_type === "in"


  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6 max-w-4xl mx-auto">
          {ConfirmDialogElement}
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Dashboard</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Link href="/expenses" className="hover:text-foreground transition-colors">Expenses</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Link href="/expenses/misc" className="hover:text-foreground transition-colors">Misc</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Details</span>
          </nav>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                isMoneyIn ? "bg-success/10" : "bg-destructive/10"
              }`}>
                {isMoneyIn ? (
                  <ArrowDownLeft className="h-6 w-6 text-success" />
                ) : (
                  <ArrowUpRight className="h-6 w-6 text-destructive" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {isMoneyIn ? "Money In" : "Money Out"}
                </h1>
                <p className="text-muted-foreground">
                  {transaction.person_name || transaction.description || "Transaction"} •{" "}
                  {formatDate(transaction.transaction_date)}
                </p>
                <div className="flex gap-2 mt-1">
                  {transaction.category && (
                    <TableBadge variant="muted">{transaction.category.name}</TableBadge>
                  )}
                  <TableBadge variant="muted">
                    {PAYMENT_METHODS[transaction.payment_mode] || transaction.payment_mode}
                  </TableBadge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/expenses/misc/${id}/edit`}>
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
          <div className={`rounded-xl p-6 mb-6 ${
            isMoneyIn
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          } text-white`}>
            <div className="text-sm opacity-90">Amount</div>
            <div className="text-3xl font-bold">
              {isMoneyIn ? "+" : "-"}{formatCurrency(transaction.amount)}
            </div>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Transaction Details */}
            <DetailSection title="Transaction Details" icon={ArrowLeftRight}>
              <InfoRow
                label="Type"
                value={
                  <TableBadge variant={isMoneyIn ? "success" : "error"}>
                    {isMoneyIn ? "Money In" : "Money Out"}
                  </TableBadge>
                }
              />
              <InfoRow label="Date" value={formatDate(transaction.transaction_date)} />
              <InfoRow
                label="Category"
                value={transaction.category?.name || transaction.category_name || "Uncategorized"}
              />
              {transaction.description && (
                <InfoRow label="Description" value={transaction.description} />
              )}
            </DetailSection>

            {/* Person Details */}
            <DetailSection title="Person" icon={User}>
              <InfoRow label="Name" value={transaction.person_name || "—"} />
              {transaction.notes && (
                <InfoRow label="Notes" value={transaction.notes} />
              )}
            </DetailSection>

            {/* Payment Details */}
            <DetailSection title="Payment Details" icon={CreditCard}>
              <InfoRow
                label="Payment Mode"
                value={PAYMENT_METHODS[transaction.payment_mode] || transaction.payment_mode}
              />
              <InfoRow label="Reference" value={transaction.payment_reference || "—"} />
            </DetailSection>

            {/* Legacy Info (if migrated) */}
            {transaction.legacy_id && (
              <DetailSection title="Migration Info" icon={FileText}>
                <InfoRow label="Legacy ID" value={transaction.legacy_id} />
              </DetailSection>
            )}
          </div>

          {/* Audit Info */}
          <div className="mt-8">
            <DetailPageAudit
              record={transaction}
              entityType="misc_transaction"
            />
          </div>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
