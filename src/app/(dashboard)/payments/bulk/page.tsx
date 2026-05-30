"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { usePaymentBulk } from "@/lib/hooks/usePaymentBulk"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { CreditCard, Loader2, Users, IndianRupee, CheckCircle2 } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { PageHeader } from "@/components/ui"
import { getTodayISO } from "@/lib/date-helpers"
import { PAYMENT_METHODS } from "@/lib/status/billing"
import { DatePicker } from "@/components/ui/date-picker"
import { recordBulkPayments, BulkPaymentInput } from "@/lib/workflows/payment.workflow"

// ============================================
// Types
// ============================================

interface RowState {
  selected: boolean
  amount: string
  payment_method: string
}

// ============================================
// Component
// ============================================

function BulkPaymentForm() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const { loading, tenantDues, rowStates, setRowStates } = usePaymentBulk()
  const [submitting, setSubmitting] = useState(false)
  const [paymentDate, setPaymentDate] = useState(getTodayISO())
  const [globalMethod, setGlobalMethod] = useState("cash")

  // Build payment method options from centralized config
  const paymentMethodOptions = Object.entries(PAYMENT_METHODS).map(([value, label]) => ({
    value,
    label,
  }))

  // Selection handlers
  const selectedCount = Object.values(rowStates).filter((r) => r.selected).length
  const allSelected = tenantDues.length > 0 && selectedCount === tenantDues.length

  const toggleAll = useCallback(() => {
    setRowStates((prev) => {
      const newSelected = !allSelected
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], selected: newSelected }
      }
      return next
    })
  }, [allSelected])

  const toggleRow = useCallback((billId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], selected: !prev[billId].selected },
    }))
  }, [])

  const updateRowAmount = useCallback((billId: string, amount: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], amount },
    }))
  }, [])

  const updateRowMethod = useCallback((billId: string, method: string) => {
    setRowStates((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], payment_method: method },
    }))
  }, [])

  // Apply global payment method to all rows
  const applyGlobalMethod = useCallback(() => {
    setRowStates((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], payment_method: globalMethod }
      }
      return next
    })
  }, [globalMethod])

  // Compute total selected amount
  const totalSelectedAmount = tenantDues.reduce((sum: number, due) => {
    const row = rowStates[due.bill_id]
    if (row?.selected) {
      return sum + (parseFloat(row.amount) || 0)
    }
    return sum
  }, 0)

  // Submit handler
  const handleSubmit = async () => {
    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    const selectedPayments = tenantDues
      .filter((due) => rowStates[due.bill_id]?.selected)
      .map((due) => {
        const row = rowStates[due.bill_id]
        const amount = parseFloat(row.amount)

        if (!amount || amount <= 0) {
          return null
        }

        if (amount > due.balance_due) {
          return null
        }

        return {
          tenant_id: due.tenant_id,
          property_id: due.property_id,
          bill_id: due.bill_id,
          amount,
          payment_method: row.payment_method as BulkPaymentInput["payments"][number]["payment_method"],
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    if (selectedPayments.length === 0) {
      showError("No valid payments selected. Check amounts are positive and do not exceed balance due.")
      return
    }

    setSubmitting(true)

    try {
      const result = await recordBulkPayments(
        {
          payments: selectedPayments,
          payment_date: paymentDate,
          send_receipts: false,
        },
        user.id,
        "owner",
        workspaceId || user.id
      )

      if (result.total_payments > 0) {
        showSuccess(
          `${result.total_payments} payment${result.total_payments > 1 ? "s" : ""} recorded totalling ${formatCurrency(result.total_amount)}`
        )
        router.push("/payments")
      } else {
        showError("No payments were recorded. Please check the selected entries and try again.")
      }
    } catch (error: unknown) {
      handleClientError(error, "Recording bulk payments")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Bulk Payment"
        backHref="/payments"
        breadcrumbs={[
          { label: "Payments", href: "/payments" },
          { label: "Bulk Payment" },
        ]}
      />

      {tenantDues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-success/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No outstanding dues</h3>
            <p className="text-muted-foreground text-center mb-4">
              All tenants are up to date with their payments.
            </p>
            <Link href="/payments">
              <Button variant="outline">Back to Payments</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Payment Settings</CardTitle>
                  <CardDescription>Set defaults for all payments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Payment Date" htmlFor="payment_date">
                  <DatePicker
                    id="payment_date"
                    value={paymentDate}
                    onChange={(val) => setPaymentDate(val)}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Default Payment Method" htmlFor="global_method">
                  <Select
                    id="global_method"
                    value={globalMethod}
                    onChange={(e) => setGlobalMethod(e.target.value)}
                    options={paymentMethodOptions}
                    disabled={submitting}
                  />
                </FormField>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyGlobalMethod}
                    disabled={submitting}
                    className="w-full"
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Dues Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Users className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Outstanding Dues ({tenantDues.length})</CardTitle>
                    <CardDescription>Select tenants and adjust amounts as needed</CardDescription>
                  </div>
                </div>
                {selectedCount > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedCount} selected | Total: <span className="font-semibold text-success">{formatCurrency(totalSelectedAmount)}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_1fr_1fr_120px_120px_140px] gap-2 px-4 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      disabled={submitting}
                      aria-label="Select all"
                    />
                  </div>
                  <div>Tenant</div>
                  <div>Bill</div>
                  <div className="text-right">Due</div>
                  <div className="text-right">Amount</div>
                  <div>Method</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                  {tenantDues.map((due) => {
                    const row = rowStates[due.bill_id]
                    if (!row) return null

                    const amountNum = parseFloat(row.amount) || 0
                    const isOverAmount = amountNum > due.balance_due
                    const isInvalidAmount = amountNum <= 0

                    return (
                      <div
                        key={due.bill_id}
                        className={`grid grid-cols-[40px_1fr_1fr_120px_120px_140px] gap-2 px-4 py-3 items-center transition-colors ${
                          row.selected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center">
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={() => toggleRow(due.bill_id)}
                            disabled={submitting}
                            aria-label={`Select ${due.tenant_name}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{due.tenant_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {due.property_name} - Room {due.room_number}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{due.bill_number}</div>
                          <div className="text-xs text-muted-foreground">{due.for_month}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-warning">{formatCurrency(due.balance_due)}</span>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            max={due.balance_due}
                            value={row.amount}
                            onChange={(e) => updateRowAmount(due.bill_id, e.target.value)}
                            disabled={submitting}
                            className={`h-8 text-sm text-right ${
                              isOverAmount ? "border-destructive" : isInvalidAmount && row.selected ? "border-warning" : ""
                            }`}
                          />
                          {isOverAmount && (
                            <p className="text-xs text-destructive mt-0.5">Exceeds due</p>
                          )}
                        </div>
                        <div>
                          <Select
                            value={row.payment_method}
                            onChange={(e) => updateRowMethod(due.bill_id, e.target.value)}
                            options={paymentMethodOptions}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary & Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <IndianRupee className="h-5 w-5 text-success" />
                    Total: {formatCurrency(totalSelectedAmount)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedCount} payment{selectedCount !== 1 ? "s" : ""} selected
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/payments">
                    <Button type="button" variant="outline" disabled={submitting}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || selectedCount === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record {selectedCount} Payment{selectedCount !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function BulkPaymentPage() {
  return (
    <FeatureGuard module="payments" feature="bulkPaymentRecording">
      <PermissionGuard permission="payments.create">
        <BulkPaymentForm />
      </PermissionGuard>
    </FeatureGuard>
  )
}
