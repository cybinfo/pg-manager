/**
 * Service Payment Detail Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Hammer,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  CreditCard,
  Shield,
  FileText,
  User,
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

import type { ServicePayment } from "@/types/expense-enhanced.types"

export default function ServicePaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState<ServicePayment | null>(null)

  // Load payment
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("service_payments")
        .select(`
          *,
          provider:service_providers(id, name, phone, rating),
          category:service_categories(id, name, name_hi)
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
        provider: transformJoin(data.provider),
        category: transformJoin(data.category),
      } as ServicePayment

      setPayment(transformed)
      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!user?.id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete this service payment? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const result = await softDelete("service_payments", id, user.id)
      if (!result.error) {
        toast.success("Service payment deleted")
        router.push("/expenses/services")
      } else {
        toast.error(result.error.message || "Failed to delete")
      }
    } catch (error) {
      console.error("Failed to delete:", error)
      toast.error("Failed to delete")
    }
  }

  if (loading) return <PageLoading />

  if (!payment) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Payment not found"
          description="The service payment you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Services",
            href: "/expenses/services",
          }}
        />
      </div>
    )
  }

  const warrantyExpiry = payment.warranty_expiry
    ? new Date(payment.warranty_expiry)
    : null
  const isWarrantyExpired = warrantyExpiry && warrantyExpiry < new Date()
  const hasWarranty = payment.warranty_months > 0

  const paymentModeLabels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    dd: "Demand Draft",
    credit: "Credit",
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6">
          {/* Back Link */}
          <Link
            href="/expenses/services"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Services
          </Link>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Hammer className="h-6 w-6 text-green-600" />
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
              <Button variant="outline" asChild>
                <Link href={`/expenses/services/${id}/edit`}>
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
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
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
                        <span className={isWarrantyExpired ? "text-red-600" : "text-green-600"}>
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
                    ? paymentModeLabels[payment.payment_mode] || payment.payment_mode
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
    </FeatureGuard>
  )
}
