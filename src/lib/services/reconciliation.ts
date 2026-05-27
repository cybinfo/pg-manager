/**
 * Payment-Bill Reconciliation Logic
 *
 * Pure auto-match algorithm: given a list of unreconciled payments and bills
 * with outstanding balances, returns the best set of non-overlapping proposals.
 *
 * Three passes:
 *  1. Exact amount + same tenant  → confidence: "exact"
 *  2. Same tenant, amount ≤ balance, closest date → confidence: "partial"
 *  3. Same tenant, only one candidate bill  → confidence: "tenant_only"
 */

import { formatCurrency } from "@/lib/format"

export interface UnreconciledPayment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  receipt_number: string | null
  notes: string | null
  tenant: { id: string; name: string } | null
  property: { id: string; name: string } | null
}

export interface OutstandingBill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  tenant: { id: string; name: string } | null
  property: { id: string; name: string } | null
}

export interface MatchProposal {
  paymentId: string
  billId: string
  confidence: "exact" | "partial" | "tenant_only"
  reason: string
}

export function autoMatch(
  payments: UnreconciledPayment[],
  bills: OutstandingBill[]
): MatchProposal[] {
  const proposals: MatchProposal[] = []
  const usedPayments = new Set<string>()
  const usedBills = new Set<string>()

  // Pass 1: Exact amount + same tenant
  for (const payment of payments) {
    if (usedPayments.has(payment.id) || !payment.tenant) continue

    for (const bill of bills) {
      if (usedBills.has(bill.id) || !bill.tenant) continue
      if (payment.tenant.id !== bill.tenant.id) continue

      if (Math.abs(payment.amount - bill.balance_due) < 0.01) {
        proposals.push({
          paymentId: payment.id,
          billId: bill.id,
          confidence: "exact",
          reason: `Amount ${formatCurrency(payment.amount)} matches balance due exactly`,
        })
        usedPayments.add(payment.id)
        usedBills.add(bill.id)
        break
      }
    }
  }

  // Pass 2: Same tenant, amount fits within balance, closest date
  for (const payment of payments) {
    if (usedPayments.has(payment.id) || !payment.tenant) continue

    const candidateBills = bills
      .filter(
        (b) =>
          !usedBills.has(b.id) &&
          b.tenant &&
          b.tenant.id === payment.tenant!.id &&
          payment.amount <= b.balance_due + 0.01
      )
      .sort((a, b) => {
        const diffA = Math.abs(
          new Date(payment.payment_date).getTime() - new Date(a.bill_date).getTime()
        )
        const diffB = Math.abs(
          new Date(payment.payment_date).getTime() - new Date(b.bill_date).getTime()
        )
        return diffA - diffB
      })

    if (candidateBills.length > 0) {
      const bill = candidateBills[0]
      proposals.push({
        paymentId: payment.id,
        billId: bill.id,
        confidence: "partial",
        reason: `Same tenant, payment ${formatCurrency(payment.amount)} fits within balance ${formatCurrency(bill.balance_due)}`,
      })
      usedPayments.add(payment.id)
      usedBills.add(bill.id)
    }
  }

  // Pass 3: Same tenant only (single candidate)
  for (const payment of payments) {
    if (usedPayments.has(payment.id) || !payment.tenant) continue

    const candidateBills = bills.filter(
      (b) =>
        !usedBills.has(b.id) &&
        b.tenant &&
        b.tenant.id === payment.tenant!.id
    )

    if (candidateBills.length === 1) {
      const bill = candidateBills[0]
      proposals.push({
        paymentId: payment.id,
        billId: bill.id,
        confidence: "tenant_only",
        reason: `Same tenant, only outstanding bill available`,
      })
      usedPayments.add(payment.id)
      usedBills.add(bill.id)
    }
  }

  return proposals
}
