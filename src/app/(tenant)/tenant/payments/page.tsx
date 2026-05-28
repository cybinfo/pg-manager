"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatsGrid } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/form-components"
import {
  CreditCard,
  IndianRupee,
  Calendar,
  Download,
  CheckCircle,
  Receipt,
  TrendingUp,
  Filter,
  Flag
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { ReportIssueDialog } from "@/components/tenant/report-issue-dialog"
import { formatDate, formatCurrency, formatMonthYear } from "@/lib/format"
import { useTenantPortalData } from "@/lib/hooks/useTenantPortalData"
import { useTenantPayments } from "@/lib/hooks/useTenantPayments"
import type { TenantPayment } from "@/lib/hooks/useTenantPayments"
import { PAYMENT_METHODS } from "@/lib/status"

export default function TenantPaymentsPage() {
  const { tenantContext, loading: tenantLoading } = useTenantPortalData()
  const { payments, stats, loading: paymentsLoading } = useTenantPayments()
  const loading = tenantLoading || paymentsLoading
  const [yearFilter, setYearFilter] = useState<string>("all")

  // Report Issue Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<TenantPayment | null>(null)

  const openReportDialog = (payment: TenantPayment) => {
    setSelectedPayment(payment)
    setDialogOpen(true)
  }


  // Get unique years from payments
  const years = [...new Set(payments.map((p) => new Date(p.payment_date).getFullYear()))].sort((a, b) => b - a)

  // Filter payments by year
  const filteredPayments = yearFilter === "all"
    ? payments
    : payments.filter((p) => new Date(p.payment_date).getFullYear() === parseInt(yearFilter))

  // Group payments by month
  const groupedPayments = filteredPayments.reduce((groups, payment) => {
    const monthYear = formatMonthYear(payment.payment_date)
    if (!groups[monthYear]) {
      groups[monthYear] = []
    }
    groups[monthYear].push(payment)
    return groups
  }, {} as Record<string, TenantPayment[]>)

  if (loading) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">View all your payment records and receipts</p>
      </div>

      {/* Stats Cards */}
      <StatsGrid
        stats={[
          { icon: IndianRupee, label: "Total Paid", value: formatCurrency(stats.totalPaid), color: "green" },
          { icon: TrendingUp, label: "This Year", value: formatCurrency(stats.totalPaidThisYear), color: "blue" },
          { icon: Receipt, label: "Payments", value: stats.paymentsCount, color: "purple" },
          { icon: CreditCard, label: "Monthly Rent", value: formatCurrency(stats.monthlyRent), color: "orange" },
        ]}
      />

      {/* Filter */}
      {years.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filter by year"
            options={[
              { value: "all", label: "All Years" },
              ...years.map((year) => ({ value: String(year), label: String(year) })),
            ]}
          />
        </div>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments yet</h3>
            <p className="text-muted-foreground">Your payment history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPayments).map(([monthYear, monthPayments]) => (
            <div key={monthYear}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{monthYear}</h3>
              <div className="space-y-3">
                {monthPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-success/10 rounded-full mt-1">
                            <CheckCircle className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.charge_type?.name || "Payment"}
                              {payment.for_period && ` • ${payment.for_period}`}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(payment.payment_date)}
                              </span>
                              <span className="capitalize">
                                {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                              </span>
                              {payment.reference_number && (
                                <span>Ref: {payment.reference_number}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-start gap-2">
                          <div>
                            {payment.receipt_number && (
                              <p className="text-xs text-muted-foreground mb-2">
                                #{payment.receipt_number}
                              </p>
                            )}
                            <Link href={`/api/receipts/${payment.id}/pdf`} target="_blank">
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
                            </Link>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/5"
                            onClick={() => openReportDialog(payment)}
                            title="Report issue with this payment"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {payment.notes && (
                        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                          Note: {payment.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {payments.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredPayments.length} of {payments.length} payments
                </p>
              </div>
              <p className="font-medium">
                Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Issue Dialog */}
      {selectedPayment && tenantContext && (
        <ReportIssueDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fieldLabel={`Payment #${selectedPayment.receipt_number || 'N/A'}`}
          currentValue={`${formatCurrency(selectedPayment.amount)} on ${formatDate(selectedPayment.payment_date)} via ${PAYMENT_METHODS[selectedPayment.payment_method] || selectedPayment.payment_method}`}
          approvalType="payment_dispute"
          tenantId={tenantContext.id}
          workspaceId={tenantContext.workspace_id}
          ownerId={tenantContext.owner_id}
        />
      )}
    </div>
  )
}
