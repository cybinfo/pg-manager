"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, BILL_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Bill, BillLineItem } from "@/types/bills.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailPageTemplate,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { PrintButton } from "@/components/ui/print-button"
import {
  FileText,
  IndianRupee,
  Plus,
  Send,
  Trash2,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency, formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { ConfirmDialog } from "@/components/ui/form-dialog"
import { BillPaymentForm, BillBreakdown, BillInfoSidebar } from "./_components"

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  receipt_number: string | null
  notes: string | null
}

// Extended Bill type with additional fields for display
interface BillWithDetails extends Bill {
  period_start?: string
  period_end?: string
  subtotal?: number
  discount_amount?: number
  late_fee?: number
  previous_balance?: number
  room?: { room_number: string } | null
}

const statusLabels: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  partial: "Partial Payment",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

export default function BillDetailPage() {
  const router = useRouter()
  const params = useParams()
  const billId = params.id as string

  const {
    data: bill,
    related,
    loading,
    refetch,
    deleteRecord,
    isDeleting,
  } = useDetailPage<BillWithDetails>({
    config: BILL_DETAIL_CONFIG,
    id: billId,
  })

  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const payments = (related.payments || []) as Payment[]

  const handleWhatsAppShare = () => {
    if (!bill || !bill.tenant?.phone) {
      showError("Tenant phone number not available")
      return
    }

    const phone = bill.tenant.phone.replace(/\D/g, "")
    const phoneWithCountry = phone.startsWith("91") ? phone : `91${phone}`
    const lineItems = bill.line_items || []

    const message = `*Bill: ${bill.bill_number}*

Dear ${bill.tenant.name},

Your bill for ${bill.for_month} has been generated.

*Bill Details:*
Property: ${bill.property?.name}
Bill Date: ${formatDate(bill.bill_date)}
Due Date: ${formatDate(bill.due_date)}

*Amount Breakdown:*
${lineItems.map((item: BillLineItem) => `${item.description}: ${formatCurrency(item.amount)}`).join("\n")}
${(bill.discount_amount || 0) > 0 ? `Discount: -${formatCurrency(bill.discount_amount || 0)}` : ""}
${(bill.late_fee || 0) > 0 ? `Late Fee: +${formatCurrency(bill.late_fee || 0)}` : ""}
${(bill.previous_balance || 0) > 0 ? `Previous Balance: ${formatCurrency(bill.previous_balance || 0)}` : ""}

*Total Amount: ${formatCurrency(bill.total_amount)}*
*Paid: ${formatCurrency(bill.paid_amount)}*
*Balance Due: ${formatCurrency(bill.balance_due)}*

Status: ${statusLabels[bill.status] || bill.status}

Thank you,
ManageKar`

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleDelete = async () => {
    await deleteRecord({ confirm: false })
  }

  if (loading) {
    return <PageLoading message="Loading bill details..." />
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <p>Bill not found</p>
        <Link href="/bills">
          <Button className="mt-4">Back to Bills</Button>
        </Link>
      </div>
    )
  }

  const isOverdue = new Date(bill.due_date) < new Date() && bill.balance_due > 0
  const lineItems = bill.line_items || []
  const subtotal = bill.subtotal || lineItems.reduce((sum: number, item: BillLineItem) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={bill.bill_number}
        subtitle={`Bill for ${bill.for_month}`}
        backHref="/bills"
        backLabel="All Bills"
        breadcrumbs={[
          { label: "Bills", href: "/bills" },
          { label: bill.bill_number || "Details" },
        ]}
        status={bill.status === "paid" ? "active" : bill.status === "overdue" ? "inactive" : "warning"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PrintButton label="Print Bill" />
            <Button variant="outline" size="sm" onClick={handleWhatsAppShare}>
              <Send className="mr-2 h-4 w-4" />
              Share via WhatsApp
            </Button>
            {bill.status !== "paid" && (
              <Button size="sm" onClick={() => setPaymentFormOpen(!paymentFormOpen)}>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            )}
            <PermissionGate permission="bills.delete" hide>
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

      {/* Payment Form */}
      {paymentFormOpen && (
        <BillPaymentForm
          billId={bill.id}
          tenantId={bill.tenant?.id}
          propertyId={bill.property?.id}
          balanceDue={bill.balance_due}
          onClose={() => setPaymentFormOpen(false)}
          onPaymentRecorded={refetch}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <InfoCard
          label="Total Amount"
          value={<Currency amount={bill.total_amount} />}
          icon={IndianRupee}
          variant="default"
        />
        <InfoCard
          label="Paid"
          value={<Currency amount={bill.paid_amount} />}
          icon={IndianRupee}
          variant="success"
        />
        <InfoCard
          label="Balance Due"
          value={<Currency amount={bill.balance_due} />}
          icon={IndianRupee}
          variant={bill.balance_due > 0 ? "error" : "success"}
        />
      </div>

      <DetailPageTemplate layoutKey="bill-detail" entityType="bill" record={bill}>
        {/* Left Column - Bill Details & Payments */}
        <BillBreakdown
          lineItems={lineItems}
          subtotal={subtotal}
          totalAmount={bill.total_amount}
          discountAmount={bill.discount_amount || 0}
          lateFee={bill.late_fee || 0}
          previousBalance={bill.previous_balance || 0}
          payments={payments}
          billId={billId}
          notes={bill.notes}
        />

        {/* Right Column - Info Sidebar */}
        <BillInfoSidebar bill={bill} isOverdue={isOverdue} />
      </DetailPageTemplate>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Bill"
        description={`Are you sure you want to delete bill "${bill.bill_number}"? This will permanently remove the bill and unlink any associated payments. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
