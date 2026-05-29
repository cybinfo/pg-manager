/**
 * Miscellaneous Transaction Detail Page
 */

"use client"

import { use } from "react"
import Link from "next/link"
import {
  ArrowLeftRight,
  Edit,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  CreditCard,
  FileText,
  Home,
  ChevronRight,
} from "lucide-react"

import { useDetailPage, MISC_TRANSACTION_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { formatCurrency, formatDate } from "@/lib/format"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PAYMENT_METHODS } from "@/lib/status"

import { PermissionGuard, PermissionGate, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { DetailSection, InfoRow, DetailPageTemplate } from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"

import type { MiscTransaction } from "@/types/expense-enhanced.types"

export default function MiscTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  const {
    data: transaction,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<MiscTransaction>({
    config: MISC_TRANSACTION_DETAIL_CONFIG,
    id,
  })

  const handleDelete = () => {
    confirm({
      title: "Delete Transaction",
      description: "Are you sure you want to delete this transaction? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        await deleteRecord({ confirm: false })
      },
    })
  }

  if (loading) return <PageLoading />

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )
  }

  const isMoneyIn = transaction.transaction_type === "in"


  return (
    <ModuleGuard module="expenses">
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
              <PermissionGate permission="expenses.edit" hide>
                <Button variant="outline" asChild>
                  <Link href={`/expenses/misc/${id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              </PermissionGate>
              <PermissionGate permission="expenses.delete" hide>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </PermissionGate>
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
          <DetailPageTemplate
            layoutKey="misc-expense-detail"
            entityType="misc_transaction"
            record={transaction}
          >
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
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
