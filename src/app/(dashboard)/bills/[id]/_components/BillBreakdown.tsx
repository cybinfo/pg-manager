"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
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
}: BillBreakdownProps) {
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
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {lateFee > 0 && (
              <div className="flex justify-between text-sm text-red-600">
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
          </div>
        </div>
      </DetailSection>

      {/* Payment History */}
      <DetailListSection
        title="Payment History"
        description="Payments received for this bill"
        icon={CreditCard}
        items={payments}
        keyExtractor={(payment, _idx) => payment.id}
        renderItem={(payment) => (
          <div className="flex justify-between items-center py-3 border-b last:border-0">
            <div>
              <p className="font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(payment.payment_date)} via {payment.payment_method}
              </p>
              {payment.receipt_number && (
                <p className="text-xs text-muted-foreground">Ref: {payment.receipt_number}</p>
              )}
            </div>
            <Link href={`/payments/${payment.id}`}>
              <Button variant="outline" size="sm">View</Button>
            </Link>
          </div>
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
