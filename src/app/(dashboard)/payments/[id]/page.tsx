"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, PAYMENT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Payment } from "@/types/payments.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DetailHero,
  InfoCard,
  DetailPageTemplate,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { PrintButton } from "@/components/ui/print-button"
import {
  Building2,
  User,
  Phone,
  CheckCircle,
  Download,
  Trash2,
  Edit,
  Receipt,
  IndianRupee,
} from "lucide-react"
import { showSuccess, showError, toast } from "@/lib/toast-helpers"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"
import { formatCurrency, formatDate, formatDateTime, numberToWords } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { ConfirmDialog } from "@/components/ui/form-dialog"
import { PAYMENT_METHODS } from "@/lib/status"

// Extended Payment type with owner info
interface PaymentWithOwner extends Payment {
  owner?: {
    business_name: string | null
    name: string
    phone: string | null
  }
}

export default function PaymentReceiptPage() {
  const params = useParams()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Use centralized hook for data fetching
  const {
    data: payment,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<PaymentWithOwner>({
    config: PAYMENT_DETAIL_CONFIG,
    id: params.id as string,
  })

  const [ownerInfo, setOwnerInfo] = useState<{ business_name: string | null; name: string; phone: string | null } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch owner info separately (not part of main entity)

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/payments", defaultLabel: "All Payments" })
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ownerData } = await supabase
        .from("owners")
        .select("business_name, name, phone")
        .eq("id", user.id)
        .single()

      if (ownerData) {
        setOwnerInfo(ownerData)
      }
    }

    fetchOwnerInfo()
  }, [])

  const handleDelete = async () => {
    await deleteRecord({ confirm: false })
  }

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Generating PDF...")
      const response = await fetch(`/api/receipts/${params.id}/pdf`)

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `receipt-${payment?.receipt_number || payment?.id.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.dismiss()
      showSuccess("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.dismiss()
      showError("Failed to download PDF")
    }
  }


  if (loading) {
    return <PageLoading message="Loading payment details..." />
  }

  if (!payment) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const owner = ownerInfo || { business_name: null, name: "PG Manager", phone: null }

  return (
    <div className="space-y-6">
      {/* Header - Hidden in print */}
      <div className="print:hidden">
        <DetailHero
          title="Payment Receipt"
          subtitle={`Receipt #${payment.receipt_number || payment.id.slice(0, 8).toUpperCase()}`}
          backHref={backHref}
          backLabel={backLabel}
          breadcrumbs={[
            { label: "Payments", href: "/payments" },
            { label: payment.receipt_number || payment.id.slice(0, 8).toUpperCase() || "Details" },
          ]}
          avatar={
            <div className="p-3 bg-success/10 rounded-lg">
              <Receipt className="h-8 w-8 text-success" />
            </div>
          }
          actions={
            <div className="flex gap-2">
              {payment.tenant?.phone && (
                <WhatsAppButton
                  phone={payment.tenant.phone}
                  message={messageTemplates.paymentReceipt({
                    tenantName: payment.tenant.name,
                    amount: Number(payment.amount),
                    receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
                    propertyName: payment.property?.name || "Property",
                    propertyAddress: undefined,
                    roomNumber: undefined,
                    paymentDate: payment.payment_date,
                    paymentMethod: payment.payment_method,
                    ownerName: owner.business_name || owner.name,
                    ownerPhone: owner.phone || undefined,
                    forPeriod: payment.for_period || undefined,
                    description: payment.charge_type?.name || undefined,
                  })}
                  label="Send Receipt"
                  variant="default"
                />
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <PrintButton label="Print Receipt" />
              <PermissionGate permission="payments.edit" hide>
                <Link href={`/payments/${params.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission="payments.delete" hide>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </PermissionGate>
            </div>
          }
        />
      </div>

      {/* Amount Card - Hidden in print */}
      <div className="print:hidden">
        <InfoCard
          label="Amount Received"
          value={<Currency amount={payment.amount} />}
          icon={IndianRupee}
          variant="success"
          className="max-w-sm"
        />
      </div>

      {/* Receipt */}
      <DetailPageTemplate layoutKey="payment-detail" entityType="payment" record={payment}>
        <Card className="max-w-2xl mx-auto print:shadow-none print:border-0" ref={receiptRef}>
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <div className="flex justify-center mb-2">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {owner.business_name || owner.name}
            </h2>
            {payment.property && (
              <p className="text-muted-foreground">
                {payment.property.name}
              </p>
            )}
            {owner.phone && (
              <p className="text-sm text-muted-foreground">
                Phone: {owner.phone}
              </p>
            )}
          </div>

          {/* Receipt Title */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold bg-muted inline-block px-6 py-2 rounded">
              PAYMENT RECEIPT
            </h3>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-muted-foreground">Receipt No:</span>
              <span className="ml-2 font-medium">
                {payment.receipt_number || payment.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-2 font-medium">{formatDate(payment.payment_date)}</span>
            </div>
          </div>

          {/* Tenant Details */}
          {payment.tenant && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-2">Received From:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{payment.tenant.name}</span>
                </div>
                {payment.tenant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{payment.tenant.phone}</span>
                  </div>
                )}
                {payment.property && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{payment.property.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Details Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">
                  <div>
                    {payment.charge_type?.name || "Payment"}
                    {payment.for_period && (
                      <span className="text-muted-foreground ml-1">
                        ({payment.for_period})
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right font-medium">
                  {formatCurrency(Number(payment.amount))}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold text-lg">
                <td className="py-3">Total</td>
                <td className="py-3 text-right text-success">
                  {formatCurrency(Number(payment.amount))}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-6">
            <span className="text-sm text-muted-foreground">Amount in Words: </span>
            <span className="font-medium">
              Rupees {numberToWords(Math.floor(Number(payment.amount)))} Only
            </span>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="ml-2 font-medium">
                {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
              </span>
            </div>
            {payment.transaction_reference && (
              <div>
                <span className="text-muted-foreground">Reference:</span>
                <span className="ml-2 font-medium">{payment.transaction_reference}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="text-sm mb-6">
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-center gap-2 text-success mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Payment Received Successfully</span>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <p>Generated on {formatDateTime(payment.created_at)}</p>
              <p className="mt-1">This is a computer-generated receipt and does not require a signature.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      </DetailPageTemplate>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Payment"
        description={`Are you sure you want to delete this payment of ${formatCurrency(payment?.amount || 0)}? Receipt: ${payment?.receipt_number || payment?.id.slice(0, 8).toUpperCase()}. This will permanently remove the payment record and may affect associated bill status. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
