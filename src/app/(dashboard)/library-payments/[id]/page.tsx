/**
 * Library Payment Detail Page
 *
 * Shows payment details with member info.
 */

"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_PAYMENT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import {
  CreditCard,
  Users,
  Calendar,
  Receipt,
  FileText,
  Hash,
  Wallet,
  Download,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import {
  LIBRARY_PAYMENT_TYPE_CONFIG,
  LIBRARY_PAYMENT_METHOD_CONFIG,
  LIBRARY_PAYMENT_STATUS_CONFIG,
} from "@/types/library.types"
import type { LibraryPayment } from "@/types/library.types"

export default function LibraryPaymentDetailPage() {
  const params = useParams()

  const {
    data: payment,
    loading,
  } = useDetailPage<LibraryPayment>({
    config: LIBRARY_PAYMENT_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) {
    return <PageLoading message="Loading payment details..." />
  }

  if (!payment) {
    return null
  }

  const displayName = payment.member?.person?.name || payment.member?.name || "Unknown"
  const photoUrl = payment.member?.person?.photo_url
  const typeConfig = LIBRARY_PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof LIBRARY_PAYMENT_TYPE_CONFIG]
  const methodConfig = LIBRARY_PAYMENT_METHOD_CONFIG[payment.payment_method as keyof typeof LIBRARY_PAYMENT_METHOD_CONFIG]
  const statusConfig = LIBRARY_PAYMENT_STATUS_CONFIG[payment.status as keyof typeof LIBRARY_PAYMENT_STATUS_CONFIG]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={payment.receipt_number || "Payment"}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="text-2xl font-bold text-green-600">
              +<Currency amount={payment.amount} />
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              payment.payment_type === "subscription" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
              payment.payment_type === "locker_rent" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
              "bg-muted text-muted-foreground"
            }`}>
              {typeConfig?.label || payment.payment_type}
            </span>
          </div>
        }
        backHref="/library-payments"
        backLabel="All Payments"
        status={statusConfig?.variant || "muted"}
        avatar={
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`/api/library-receipts/${payment.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="default" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
            </a>
            {payment.member && (
              <Link href={`/library-members/${payment.member.id}`}>
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  View Member
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Amount"
          value={<Currency amount={payment.amount} />}
          icon={Wallet}
          variant="success"
        />
        <InfoCard
          label="Payment Date"
          value={formatDate(payment.payment_date)}
          icon={Calendar}
          variant="default"
        />
        <InfoCard
          label="Method"
          value={methodConfig?.label || payment.payment_method}
          icon={CreditCard}
          variant="default"
        />
        <InfoCard
          label="Status"
          value={statusConfig?.label || payment.status}
          icon={Receipt}
          variant={statusConfig?.variant || "default"}
        />
      </div>

      <DetailPageTemplate layoutKey="library-payment-detail" entityType="library_payment" record={payment}>
        {/* Member Info */}
        {payment.member && (
          <DetailSection
            title="Member Information"
            description="Payment received from"
            icon={Users}
          >
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar name={displayName} src={photoUrl} size="lg" />
              <div>
                <Link
                  href={`/library-members/${payment.member.id}`}
                  className="font-semibold text-lg hover:text-primary hover:underline"
                >
                  {displayName}
                </Link>
                {payment.member.member_code && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {payment.member.member_code}
                  </p>
                )}
              </div>
            </div>
          </DetailSection>
        )}

        {/* Payment Details */}
        <DetailSection
          title="Payment Details"
          description="Transaction information"
          icon={CreditCard}
        >
          <InfoRow
            label="Receipt Number"
            value={payment.receipt_number || "—"}
            icon={Hash}
          />
          <InfoRow
            label="Payment Type"
            value={typeConfig?.label || payment.payment_type}
            icon={Receipt}
          />
          <InfoRow
            label="Payment Method"
            value={methodConfig?.label || payment.payment_method}
            icon={CreditCard}
          />
          <InfoRow
            label="Payment Date"
            value={formatDate(payment.payment_date)}
            icon={Calendar}
          />
          <InfoRow
            label="Amount"
            value={<Currency amount={payment.amount} />}
            icon={Wallet}
          />
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                status={statusConfig?.variant || "muted"}
                label={statusConfig?.label || payment.status}
                size="sm"
              />
            }
          />
        </DetailSection>

        {/* Reference & Notes */}
        {(payment.payment_reference || payment.notes) && (
          <DetailSection
            title="Additional Information"
            description="Reference and notes"
            icon={FileText}
          >
            {payment.payment_reference && (
              <InfoRow
                label="Reference Number"
                value={payment.payment_reference}
                icon={Hash}
              />
            )}
            {payment.notes && (
              <div className="pt-2">
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}
          </DetailSection>
        )}

        {/* Linked Records */}
        {(payment.membership_id || payment.locker_assignment_id) && (
          <DetailSection
            title="Linked Records"
            description="Associated records"
            icon={FileText}
          >
            {payment.membership_id && (
              <InfoRow
                label="Membership"
                value={
                  <Link
                    href={`/library-members/${payment.member_id}`}
                    className="text-primary hover:underline"
                  >
                    View Subscription
                  </Link>
                }
              />
            )}
            {payment.locker_assignment_id && (
              <InfoRow
                label="Locker Assignment"
                value="Linked to locker rental"
              />
            )}
          </DetailSection>
        )}
      </DetailPageTemplate>
    </div>
  )
}
