/**
 * Payment-Bill Reconciliation Logic
 *
 * Auto-match algorithm + DB write helpers for the reconciliation page.
 *
 * Auto-match three passes:
 *  1. Exact amount + same tenant  → confidence: "exact"
 *  2. Same tenant, amount ≤ balance, closest date → confidence: "partial"
 *  3. Same tenant, only one candidate bill  → confidence: "tenant_only"
 */

import { formatCurrency } from "@/lib/format"
import { logger } from "@/lib/logger"

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

// ============================================
// Confidence display helpers
// ============================================

export function getConfidenceColor(
  confidence: MatchProposal["confidence"]
): "success" | "warning" | "default" {
  switch (confidence) {
    case "exact":
      return "success"
    case "partial":
      return "warning"
    case "tenant_only":
      return "default"
  }
}

export function getConfidenceLabel(confidence: MatchProposal["confidence"]): string {
  switch (confidence) {
    case "exact":
      return "Exact Match"
    case "partial":
      return "Partial Match"
    case "tenant_only":
      return "Tenant Match"
  }
}

// ============================================
// DB write: apply confirmed matches
// ============================================

interface PendingMatch {
  paymentId: string
  billId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Persist a set of confirmed payment→bill matches to the database.
 * For each match:
 *  1. Links the payment to the bill (payments.bill_id = billId)
 *  2. Updates the bill's paid_amount, balance_due, and status
 *  3. If the bill update fails, reverts the payment link
 *
 * Returns totals so the caller can show feedback without re-querying.
 */
export async function applyReconciliationMatches(
  matches: PendingMatch[],
  payments: UnreconciledPayment[],
  bills: OutstandingBill[],
  supabase: SupabaseClient
): Promise<{ successCount: number; errorCount: number; totalAmount: number }> {
  let successCount = 0
  let errorCount = 0

  for (const match of matches) {
    const payment = payments.find((p) => p.id === match.paymentId)
    const bill = bills.find((b) => b.id === match.billId)

    if (!payment || !bill) {
      errorCount++
      continue
    }

    const { error: paymentError } = await supabase
      .from("payments")
      .update({ bill_id: match.billId })
      .eq("id", match.paymentId)

    if (paymentError) {
      logger.error(`Failed to link payment ${match.paymentId}`, { detail: String(paymentError) })
      errorCount++
      continue
    }

    const newPaidAmount = Number(bill.paid_amount) + Number(payment.amount)
    const newBalanceDue = Math.max(0, Number(bill.total_amount) - newPaidAmount)
    const newStatus =
      newBalanceDue <= 0
        ? "paid"
        : newPaidAmount > 0
          ? "partial"
          : bill.status

    const { error: billError } = await supabase
      .from("bills")
      .update({ paid_amount: newPaidAmount, balance_due: newBalanceDue, status: newStatus })
      .eq("id", match.billId)

    if (billError) {
      logger.error(`Failed to update bill ${match.billId}`, { detail: String(billError) })
      // Revert payment link
      await supabase
        .from("payments")
        .update({ bill_id: null })
        .eq("id", match.paymentId)
      errorCount++
      continue
    }

    successCount++
  }

  const totalAmount = matches.reduce((sum: number, match) => {
    const payment = payments.find((p) => p.id === match.paymentId)
    return sum + (payment?.amount || 0)
  }, 0)

  return { successCount, errorCount, totalAmount }
}
