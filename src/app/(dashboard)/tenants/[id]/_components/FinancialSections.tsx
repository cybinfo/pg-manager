"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DetailListSection } from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  FileText,
  Plus,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  for_period: string | null
  charge_type: { name: string } | null
}

interface Charge {
  id: string
  amount: number
  due_date: string
  status: string
  for_period: string
  charge_type: { name: string } | null
}

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  total_amount: number
  balance_due: number
  status: string
}

interface FinancialSectionsProps {
  tenantId: string
  charges: Charge[]
  payments: Payment[]
  bills: Bill[]
}

export function FinancialSections({ tenantId, charges, payments, bills }: FinancialSectionsProps) {
  return (
    <>
      {/* Pending Dues */}
      <DetailListSection
        title="Pending Dues"
        description="Outstanding payments"
        icon={AlertCircle}
        items={charges}
        keyExtractor={(charge, _idx) => charge.id}
        renderItem={(charge) => (
          <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
            <div>
              <p className="font-medium">{charge.charge_type?.name || "Charge"}</p>
              <p className="text-xs text-muted-foreground">{charge.for_period}</p>
            </div>
            <div className="text-right">
              <Currency amount={charge.amount} className="text-destructive font-semibold" />
              <p className="text-xs text-muted-foreground">Due: {formatDate(charge.due_date)}</p>
            </div>
          </div>
        )}
        initialLimit={5}
        viewAllHref={`/tenants/${tenantId}/bills`}
        viewAllMode="auto"
        emptyIcon={CheckCircle}
        emptyText="No pending dues"
        actions={
          <div className="flex gap-2">
            <Link href={`/tenants/${tenantId}/bills`}>
              <Button variant="outline" size="sm">
                <FileText className="mr-1 h-3 w-3" />
                All Bills
              </Button>
            </Link>
            <Link href={`/payments/new?tenant=${tenantId}`}>
              <Button size="sm" variant="gradient">
                <Plus className="mr-1 h-3 w-3" />
                Record Payment
              </Button>
            </Link>
          </div>
        }
      />

      {/* Recent Payments */}
      <DetailListSection
        title="Recent Payments"
        description="Transaction history"
        icon={CreditCard}
        items={payments}
        keyExtractor={(payment, _idx) => payment.id}
        renderItem={(payment) => (
          <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
            <div>
              <p className="font-medium">{payment.charge_type?.name || "Payment"}</p>
              <p className="text-xs text-muted-foreground">
                {payment.for_period || formatDate(payment.payment_date)}
              </p>
            </div>
            <div className="text-right">
              <Currency amount={payment.amount} className="text-success font-semibold" />
              <p className="text-xs text-muted-foreground capitalize">{payment.payment_method}</p>
            </div>
          </div>
        )}
        initialLimit={5}
        viewAllHref={`/tenants/${tenantId}/payments`}
        viewAllMode="auto"
        emptyIcon={CreditCard}
        emptyText="No payments recorded"
      />

      {/* Recent Bills */}
      <DetailListSection
        title="Recent Bills"
        description="Latest billing activity"
        icon={FileText}
        items={bills}
        keyExtractor={(bill, _idx) => bill.id}
        renderItem={(bill) => (
          <Link href={`/bills/${bill.id}`}>
            <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0 hover:bg-muted/50 transition-colors rounded px-1 -mx-1">
              <div>
                <p className="font-medium">{bill.bill_number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(bill.bill_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(bill.total_amount)}</p>
                {bill.balance_due > 0 && (
                  <p className="text-xs text-destructive">Due: {formatCurrency(bill.balance_due)}</p>
                )}
              </div>
            </div>
          </Link>
        )}
        initialLimit={5}
        viewAllHref={`/tenants/${tenantId}/bills`}
        viewAllMode="auto"
        emptyIcon={FileText}
        emptyText="No bills generated"
      />
    </>
  )
}
