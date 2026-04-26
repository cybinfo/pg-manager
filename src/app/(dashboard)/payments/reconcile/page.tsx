/**
 * Payment-Bill Reconciliation Page
 *
 * Allows owners to match unreconciled payments to bills with outstanding balances.
 * Features:
 * - Left panel: Unreconciled payments (bill_id is null)
 * - Right panel: Bills with outstanding balance (balance_due > 0)
 * - Manual matching: select a payment, click a bill to link
 * - Auto-match: matches by tenant + date proximity with confidence indicators
 * - Summary: total reconciled, remaining unreconciled
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins } from "@/lib/supabase/transforms"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PermissionGuard, PermissionGate } from "@/components/auth"
import {
  Link2,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileText,
  ArrowRight,
  X,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency, formatDate } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PageHeader } from "@/components/ui/page-header"
import { TableBadge } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"

// ============================================
// Types
// ============================================

interface UnreconciledPayment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  receipt_number: string | null
  notes: string | null
  tenant: { id: string; name: string } | null
  property: { id: string; name: string } | null
}

interface OutstandingBill {
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

interface MatchProposal {
  paymentId: string
  billId: string
  confidence: "exact" | "partial" | "tenant_only"
  reason: string
}

interface AppliedMatch {
  paymentId: string
  billId: string
}

// ============================================
// Confidence helpers
// ============================================

function getConfidenceColor(confidence: MatchProposal["confidence"]): "success" | "warning" | "default" {
  switch (confidence) {
    case "exact":
      return "success"
    case "partial":
      return "warning"
    case "tenant_only":
      return "default"
  }
}

function getConfidenceLabel(confidence: MatchProposal["confidence"]): string {
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
// Auto-match logic
// ============================================

function autoMatch(
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
        // Sort by date proximity to payment date
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

  // Pass 3: Same tenant only (no amount match)
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
// Reconciliation Component
// ============================================

function ReconciliationView() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [payments, setPayments] = useState<UnreconciledPayment[]>([])
  const [bills, setBills] = useState<OutstandingBill[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [matches, setMatches] = useState<AppliedMatch[]>([])
  const [proposals, setProposals] = useState<MatchProposal[]>([])

  // Fetch unreconciled payments and outstanding bills
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [paymentsResult, billsResult] = await Promise.all([
        supabase
          .from("payments")
          .select(`
            id, amount, payment_method, payment_date, receipt_number, notes,
            tenant:tenants(id, name),
            property:properties(id, name)
          `)
          .is("bill_id", null)
          .is("deleted_at", null)
          .order("payment_date", { ascending: false }),
        supabase
          .from("bills")
          .select(`
            id, bill_number, bill_date, due_date, for_month,
            total_amount, paid_amount, balance_due, status,
            tenant:tenants(id, name),
            property:properties(id, name)
          `)
          .gt("balance_due", 0)
          .in("status", ["pending", "partial", "overdue"])
          .is("deleted_at", null)
          .order("bill_date", { ascending: false }),
      ])

      if (paymentsResult.error) {
        showError("Failed to load unreconciled payments")
        console.error(paymentsResult.error)
      }

      if (billsResult.error) {
        showError("Failed to load outstanding bills")
        console.error(billsResult.error)
      }

      const transformedPayments = transformArrayJoins(
        (paymentsResult.data || []) as Record<string, unknown>[],
        ["tenant", "property"]
      ) as unknown as UnreconciledPayment[]

      const transformedBills = transformArrayJoins(
        (billsResult.data || []) as Record<string, unknown>[],
        ["tenant", "property"]
      ) as unknown as OutstandingBill[]

      setPayments(transformedPayments)
      setBills(transformedBills)
      setLoading(false)
    }

    fetchData()
  }, [])

  // Computed: which payments/bills are already matched in pending matches
  const matchedPaymentIds = useMemo(
    () => new Set(matches.map((m) => m.paymentId)),
    [matches]
  )
  const matchedBillIds = useMemo(
    () => new Set(matches.map((m) => m.billId)),
    [matches]
  )

  // Computed: available (unmatched) payments and bills
  const availablePayments = useMemo(
    () => payments.filter((p) => !matchedPaymentIds.has(p.id)),
    [payments, matchedPaymentIds]
  )
  const availableBills = useMemo(
    () => bills.filter((b) => !matchedBillIds.has(b.id)),
    [bills, matchedBillIds]
  )

  // Filtered bills: when a payment is selected, show bills for the same tenant first
  const sortedBills = useMemo(() => {
    if (!selectedPaymentId) return availableBills

    const selectedPayment = payments.find((p) => p.id === selectedPaymentId)
    if (!selectedPayment?.tenant) return availableBills

    const tenantId = selectedPayment.tenant.id
    const sameTenant = availableBills.filter((b) => b.tenant?.id === tenantId)
    const otherTenant = availableBills.filter((b) => b.tenant?.id !== tenantId)

    return [...sameTenant, ...otherTenant]
  }, [availableBills, selectedPaymentId, payments])

  // Handlers
  const handleSelectPayment = useCallback(
    (paymentId: string) => {
      setSelectedPaymentId((prev) => (prev === paymentId ? null : paymentId))
    },
    []
  )

  const handleLinkBill = useCallback(
    (billId: string) => {
      if (!selectedPaymentId) return

      setMatches((prev) => [
        ...prev,
        { paymentId: selectedPaymentId, billId },
      ])
      setSelectedPaymentId(null)
    },
    [selectedPaymentId]
  )

  const handleRemoveMatch = useCallback((paymentId: string) => {
    setMatches((prev) => prev.filter((m) => m.paymentId !== paymentId))
  }, [])

  const handleAutoMatch = useCallback(() => {
    const newProposals = autoMatch(availablePayments, availableBills)
    setProposals(newProposals)

    // Auto-accept all proposals as pending matches
    const newMatches = newProposals.map((p) => ({
      paymentId: p.paymentId,
      billId: p.billId,
    }))
    setMatches((prev) => [...prev, ...newMatches])
  }, [availablePayments, availableBills])

  const handleApply = useCallback(async () => {
    if (matches.length === 0) {
      showError("No matches to apply")
      return
    }

    setApplying(true)

    try {
      const supabase = createClient()
      let successCount = 0
      let errorCount = 0

      for (const match of matches) {
        const payment = payments.find((p) => p.id === match.paymentId)
        const bill = bills.find((b) => b.id === match.billId)

        if (!payment || !bill) {
          errorCount++
          continue
        }

        // Update payment with bill_id
        const { error: paymentError } = await supabase
          .from("payments")
          .update({ bill_id: match.billId })
          .eq("id", match.paymentId)

        if (paymentError) {
          console.error(`Failed to link payment ${match.paymentId}:`, paymentError)
          errorCount++
          continue
        }

        // Update bill: increase paid_amount, decrease balance_due, update status
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
          .update({
            paid_amount: newPaidAmount,
            balance_due: newBalanceDue,
            status: newStatus,
          })
          .eq("id", match.billId)

        if (billError) {
          console.error(`Failed to update bill ${match.billId}:`, billError)
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

      if (successCount > 0) {
        const totalAmount = matches.reduce((sum: number, match) => {
          const payment = payments.find((p) => p.id === match.paymentId)
          return sum + (payment?.amount || 0)
        }, 0)
        showSuccess(
          `${successCount} payment${successCount > 1 ? "s" : ""} reconciled (${formatCurrency(totalAmount)})`
        )
      }
      if (errorCount > 0) {
        showError(`${errorCount} match${errorCount > 1 ? "es" : ""} failed to apply`)
      }

      router.push("/payments")
    } catch (error: unknown) {
      handleClientError(error, "Applying reconciliation")
    } finally {
      setApplying(false)
    }
  }, [matches, payments, bills, router])

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  const totalUnreconciled = payments.reduce(
    (sum: number, p) => sum + Number(p.amount),
    0
  )
  const totalOutstanding = bills.reduce(
    (sum: number, b) => sum + Number(b.balance_due),
    0
  )
  const totalMatched = matches.reduce((sum: number, m) => {
    const payment = payments.find((p) => p.id === m.paymentId)
    return sum + (payment?.amount || 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reconcile Payments"
        description="Match unreconciled payments to outstanding bills"
        icon={Link2}
        backHref="/payments"
        backLabel="Back to Payments"
        breadcrumbs={[
          { label: "Payments", href: "/payments" },
          { label: "Reconcile" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <PermissionGate permission="payments.edit" hide>
              <Button
                variant="outline"
                onClick={handleAutoMatch}
                disabled={
                  applying ||
                  availablePayments.length === 0 ||
                  availableBills.length === 0
                }
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Match
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying || matches.length === 0}
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Apply {matches.length} Match{matches.length !== 1 ? "es" : ""}
                  </>
                )}
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unreconciled</p>
                <p className="text-lg font-semibold">
                  {payments.length} ({formatCurrency(totalUnreconciled)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <FileText className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Bills</p>
                <p className="text-lg font-semibold">
                  {bills.length} ({formatCurrency(totalOutstanding)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Link2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matched</p>
                <p className="text-lg font-semibold">
                  {matches.length} ({formatCurrency(totalMatched)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold">
                  {availablePayments.length} payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Matches */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Pending Matches ({matches.length})</CardTitle>
                <CardDescription>
                  Review matches before applying. Click Apply to save.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_40px_1fr_100px_80px] gap-2 px-4 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div>Payment</div>
                <div />
                <div>Bill</div>
                <div className="text-right">Amount</div>
                <div />
              </div>
              <div className="divide-y">
                {matches.map((match) => {
                  const payment = payments.find(
                    (p) => p.id === match.paymentId
                  )
                  const bill = bills.find((b) => b.id === match.billId)
                  const proposal = proposals.find(
                    (p) =>
                      p.paymentId === match.paymentId &&
                      p.billId === match.billId
                  )

                  if (!payment || !bill) return null

                  return (
                    <div
                      key={match.paymentId}
                      className="grid grid-cols-[1fr_40px_1fr_100px_80px] gap-2 px-4 py-3 items-center"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {payment.tenant?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                          {payment.receipt_number &&
                            ` | ${payment.receipt_number}`}
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {bill.bill_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bill.for_month} | Due:{" "}
                          {formatCurrency(bill.balance_due)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm text-success tabular-nums">
                          {formatCurrency(payment.amount)}
                        </div>
                        {proposal && (
                          <TableBadge
                            variant={getConfidenceColor(proposal.confidence)}
                          >
                            {getConfidenceLabel(proposal.confidence)}
                          </TableBadge>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMatch(match.paymentId)}
                          disabled={applying}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {payments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-success/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">All payments reconciled</h3>
            <p className="text-muted-foreground text-center mb-4">
              There are no unreconciled payments to match.
            </p>
            <Link href="/payments">
              <Button variant="outline">Back to Payments</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Two-Panel Matching Interface */}
      {payments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Unreconciled Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <CardTitle>
                    Unreconciled Payments ({availablePayments.length})
                  </CardTitle>
                  <CardDescription>
                    Select a payment to match with a bill
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {availablePayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All payments have been matched</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {availablePayments.map((payment) => {
                    const isSelected = selectedPaymentId === payment.id
                    return (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() => handleSelectPayment(payment.id)}
                        className={cn(
                          "w-full text-left border rounded-lg p-3 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {payment.tenant?.name || "Unknown Tenant"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatDate(payment.payment_date)}
                              {payment.property &&
                                ` | ${payment.property.name}`}
                              {payment.receipt_number &&
                                ` | #${payment.receipt_number}`}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-semibold text-success tabular-nums">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {payment.payment_method}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Outstanding Bills */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <FileText className="h-5 w-5 text-info" />
                </div>
                <div>
                  <CardTitle>
                    Outstanding Bills ({availableBills.length})
                  </CardTitle>
                  <CardDescription>
                    {selectedPaymentId
                      ? "Click a bill to link it with the selected payment"
                      : "Select a payment first, then click a bill"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {availableBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No outstanding bills available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sortedBills.map((bill) => {
                    const selectedPayment = selectedPaymentId
                      ? payments.find((p) => p.id === selectedPaymentId)
                      : null

                    // Determine match quality for visual indicator
                    const isSameTenant =
                      selectedPayment?.tenant &&
                      bill.tenant &&
                      selectedPayment.tenant.id === bill.tenant.id
                    const isExactAmount =
                      selectedPayment &&
                      Math.abs(selectedPayment.amount - bill.balance_due) < 0.01
                    const fitsWithin =
                      selectedPayment && selectedPayment.amount <= bill.balance_due + 0.01

                    let matchIndicator: string | null = null
                    let matchColor = ""
                    if (selectedPaymentId && isSameTenant) {
                      if (isExactAmount) {
                        matchIndicator = "Exact amount match"
                        matchColor =
                          "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      } else if (fitsWithin) {
                        matchIndicator = "Amount fits within balance"
                        matchColor =
                          "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      } else {
                        matchIndicator = "Same tenant"
                        matchColor = "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
                      }
                    }

                    return (
                      <button
                        key={bill.id}
                        type="button"
                        onClick={() =>
                          selectedPaymentId && handleLinkBill(bill.id)
                        }
                        disabled={!selectedPaymentId}
                        className={cn(
                          "w-full text-left border rounded-lg p-3 transition-all",
                          !selectedPaymentId
                            ? "opacity-60 cursor-not-allowed border-border"
                            : matchIndicator
                              ? `${matchColor} cursor-pointer`
                              : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {bill.bill_number}
                              </span>
                              {matchIndicator && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-background/80">
                                  {matchIndicator}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {bill.tenant?.name || "Unknown"} |{" "}
                              {bill.for_month}
                              {bill.property && ` | ${bill.property.name}`}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-semibold text-destructive tabular-nums">
                              {formatCurrency(bill.balance_due)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              of {formatCurrency(bill.total_amount)}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================
// Page Export
// ============================================

export default function ReconcilePage() {
  return (
    <PermissionGuard permission="payments.edit">
      <ReconciliationView />
    </PermissionGuard>
  )
}
