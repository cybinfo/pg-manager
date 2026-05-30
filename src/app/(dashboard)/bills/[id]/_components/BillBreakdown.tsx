"use client"

import Link from "next/link"
import { DetailSection, DetailListSection } from "@/components/ui"
import { FileText, CreditCard } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import type { BillLineItem } from "@/types/bills.types"

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  receipt_number: string | null
  notes: string | null
}

interface BillBreakdownProps {
  lineItems: BillLineItem[]
  subtotal: number
  totalAmount: number
  discountAmount: number
  lateFee: number
  previousBalance: number
  payments: Payment[]
  billId: string
  notes: string | null
  showGst?: boolean
  gstRate?: number
}

export function BillBreakdown({
  lineItems,
  subtotal,
  totalAmount,
  discountAmount,
  lateFee,
  previousBalance,
  payments,
  billId,
  notes,
  showGst = false,
  gstRate = 18,
}: BillBreakdownProps) {
  const halfGstRate = gstRate / 2
  const cgstAmount = showGst ? Math.round((totalAmount * halfGstRate) / 100) : 0
  const sgstAmount = cgstAmount
  const totalWithGst = totalAmount + cgstAmount + sgstAmount
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Line Items */}
      <DetailSection
        title="Bill Breakdown"
        description="Itemized charges"
        icon={FileText}
      >
        <div className="space-y-3">
          {lineItems.map((item: BillLineItem, index: number) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{item.description}</p>
              </div>
              <p className="font-semibold">{formatCurrency(item.amount)}</p>
            </div>
          ))}

          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {lateFee > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Late Fee</span>
                <span>+{formatCurrency(lateFee)}</span>
              </div>
            )}
            {previousBalance > 0 && (
              <div className="flex justify-between text-sm">
                <span>Previous Balance</span>
                <span>{formatCurrency(previousBalance)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {showGst && (
              <div className="pt-3 mt-1 border-t border-dashed space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">GST Breakdown ({gstRate}%)</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>CGST ({halfGstRate}%)</span>
                  <span>{formatCurrency(cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>SGST ({halfGstRate}%)</span>
                  <span>{formatCurrency(sgstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                  <span>Total with GST</span>
                  <span className="text-primary">{formatCurrency(totalWithGst)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DetailSection>

      {/* Payment History */}
      <DetailListSection
        title="Payment History"
        description="Payments received for this bill"
        icon={CreditCard}
        items={payments}
        keyExtractor={(payment, _) => payment.id}
        itemSpacing="md"
        renderItem={(payment) => (
          <Link href={`/payments/${payment.id}`}>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
              <div>
                <p className="font-medium text-success">+{formatCurrency(payment.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(payment.payment_date)} via {payment.payment_method}
                </p>
                {payment.receipt_number && (
                  <p className="text-xs text-muted-foreground font-mono">Ref: {payment.receipt_number}</p>
                )}
              </div>
            </div>
          </Link>
        )}
        initialLimit={5}
        viewAllHref={`/payments?bill=${billId}`}
        viewAllMode="auto"
        emptyIcon={CreditCard}
        emptyText="No payments recorded yet"
      />

      {/* Notes */}
      {notes && (
        <DetailSection
          title="Notes"
          description="Additional information"
          icon={FileText}
        >
          <p className="text-muted-foreground">{notes}</p>
        </DetailSection>
      )}
    </div>
  )
}
