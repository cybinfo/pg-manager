/**
 * Service Payment Detail Page
 */

"use client"

import { use } from "react"
import Link from "next/link"
import {
  Hammer,
  Edit,
  Trash2,
  CreditCard,
  Shield,
  FileText,
  User,
  Home,
  ChevronRight,
} from "lucide-react"

import { useDetailPage, SERVICE_PAYMENT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { formatCurrency, formatDate } from "@/lib/format"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PAYMENT_METHODS } from "@/lib/status"

import { PermissionGuard, PermissionGate, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailPageTemplate,
  DetailSection,
  InfoRow,
} from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"

import type { ServicePayment } from "@/types/expense-enhanced.types"

export default function ServicePaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  const {
    data: payment,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<ServicePayment>({
    config: SERVICE_PAYMENT_DETAIL_CONFIG,
    id,
  })

  const handleDelete = () => {
    confirm({
      title: "Delete Service Payment",
      description: "Are you sure you want to delete this service payment? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        await deleteRecord({ confirm: false })
      },
    })
  }

  if (loading) return <PageLoading />

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )
  }

  const warrantyExpiry = payment.warranty_expiry
    ? new Date(payment.warranty_expiry)
    : null
  const isWarrantyExpired = warrantyExpiry && warrantyExpiry < new Date()
  const hasWarranty = payment.warranty_months > 0


  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6">
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
            <Link href="/expenses/services" className="hover:text-foreground transition-colors">Services</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Details</span>
          </nav>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Hammer className="h-6 w-6 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{payment.description}</h1>
                <p className="text-muted-foreground">
                  {payment.provider?.name || payment.provider_name} •{" "}
                  {formatDate(payment.service_date)}
                </p>
                <div className="flex gap-2 mt-1">
                  {payment.category && (
                    <TableBadge variant="muted">{payment.category.name}</TableBadge>
                  )}
                  {payment.tds_applicable && (
                    <TableBadge variant="muted">
                      <FileText className="h-3 w-3 mr-1" />
                      TDS
                    </TableBadge>
                  )}
                  {hasWarranty && (
                    <TableBadge variant={isWarrantyExpired ? "error" : "success"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {isWarrantyExpired ? "Warranty Expired" : `${payment.warranty_months}mo Warranty`}
                    </TableBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <PermissionGate permission="expenses.edit" hide>
                <Button variant="outline" asChild>
                  <Link href={`/expenses/services/${id}/edit`}>
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

          {/* Amount Summary Card */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm opacity-90">Gross Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(payment.gross_amount)}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">TDS Deducted</div>
                <div className="text-2xl font-bold">{formatCurrency(payment.tds_amount)}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Net Paid</div>
                <div className="text-2xl font-bold">{formatCurrency(payment.net_amount)}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <DetailPageTemplate
            layoutKey="service-payment-detail"
            entityType="service_payment"
            record={payment}
            columns={2}
          >
            {/* Service Details */}
            <DetailSection title="Service Details" icon={Hammer}>
              <InfoRow label="Description" value={payment.description} />
              <InfoRow
                label="Category"
                value={payment.category?.name || payment.category_name || "Uncategorized"}
              />
              <InfoRow label="Service Date" value={formatDate(payment.service_date)} />
              {hasWarranty && (
                <>
                  <InfoRow label="Warranty Period" value={`${payment.warranty_months} months`} />
                  <InfoRow
                    label="Warranty Expires"
                    value={
                      payment.warranty_expiry ? (
                        <span className={isWarrantyExpired ? "text-destructive" : "text-success"}>
                          {formatDate(payment.warranty_expiry)}
                          {isWarrantyExpired && " (Expired)"}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </>
              )}
            </DetailSection>

            {/* Provider Details */}
            <DetailSection title="Provider" icon={User}>
              <InfoRow
                label="Name"
                value={
                  payment.provider?.id ? (
                    <Link
                      href={`/expenses/services/providers/${payment.provider.id}`}
                      className="text-primary hover:underline"
                    >
                      {payment.provider.name}
                    </Link>
                  ) : (
                    payment.provider_name
                  )
                }
              />
              {payment.provider?.phone && (
                <InfoRow
                  label="Phone"
                  value={
                    <a
                      href={`tel:${payment.provider.phone}`}
                      className="text-primary hover:underline"
                    >
                      {payment.provider.phone}
                    </a>
                  }
                />
              )}
              {payment.provider?.rating && (
                <InfoRow label="Rating" value={`⭐ ${payment.provider.rating.toFixed(1)}`} />
              )}
            </DetailSection>

            {/* TDS Details */}
            {payment.tds_applicable && (
              <DetailSection title="TDS Details" icon={FileText}>
                <InfoRow label="TDS Section" value={payment.tds_section || "—"} />
                <InfoRow
                  label="TDS Rate"
                  value={payment.tds_rate ? `${payment.tds_rate}%` : "—"}
                />
                <InfoRow label="Gross Amount" value={formatCurrency(payment.gross_amount)} />
                <InfoRow label="TDS Deducted" value={formatCurrency(payment.tds_amount)} />
                <InfoRow label="Net Payable" value={formatCurrency(payment.net_amount)} />
              </DetailSection>
            )}

            {/* Payment Details */}
            <DetailSection title="Payment Details" icon={CreditCard}>
              <InfoRow
                label="Payment Mode"
                value={
                  payment.payment_mode
                    ? PAYMENT_METHODS[payment.payment_mode] || payment.payment_mode
                    : "—"
                }
              />
              <InfoRow
                label="Payment Date"
                value={payment.payment_date ? formatDate(payment.payment_date) : "—"}
              />
              <InfoRow label="Reference" value={payment.payment_reference || "—"} />
            </DetailSection>

            {/* Notes */}
            {payment.notes && (
              <DetailSection title="Notes" icon={Hammer}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {payment.notes}
                </p>
              </DetailSection>
            )}
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
