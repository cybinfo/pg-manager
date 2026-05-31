"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { CreditCard, Loader2, Users, IndianRupee, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { DetailHero } from "@/components/ui"
import { DatePicker } from "@/components/ui/date-picker"
import { useBulkPaymentForm } from "@/lib/hooks/forms/useBulkPaymentForm"

function BulkPaymentForm() {
  const {
    loading,
    submitting,
    tenantDues,
    rowStates,
    paymentDate,
    setPaymentDate,
    globalMethod,
    setGlobalMethod,
    paymentMethodOptions,
    selectedCount,
    allSelected,
    totalSelectedAmount,
    toggleAll,
    toggleRow,
    updateRowAmount,
    updateRowMethod,
    applyGlobalMethod,
    handleSubmit,
  } = useBulkPaymentForm()

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <DetailHero
        title="Bulk Payment"
        subtitle="Record payments for multiple tenants with outstanding dues in one go"
        icon={CreditCard}
        backHref="/payments"
        backLabel="Back to Payments"
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
