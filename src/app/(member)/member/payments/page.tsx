"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, CheckCircle, IndianRupee, Calendar, AlertCircle } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { StatsGrid } from "@/components/ui/stat-card"
import { formatDate, formatCurrency } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"
import { useMemberPayments } from "@/lib/hooks/useMemberPayments"
import { PAYMENT_METHODS, LIBRARY_PAYMENT_TYPE_LABELS } from "@/lib/status"

const paymentTypeLabels = LIBRARY_PAYMENT_TYPE_LABELS

export default function MemberPaymentsPage() {
  const { member, loading: memberLoading } = useMemberPortalData()
  const { payments, stats, loading } = useMemberPayments(member, memberLoading)

  if (memberLoading || loading) {
    return <PageSkeleton variant="list" />
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">Your subscription and other payments</p>
      </div>

      {/* Stats */}
      <StatsGrid
        stats={[
          { icon: IndianRupee, label: "Total Paid", value: formatCurrency(stats.totalPaid), color: "green" },
          { icon: IndianRupee, label: "This Year", value: formatCurrency(stats.thisYearPaid), color: "purple" },
          { icon: CreditCard, label: "Payments", value: stats.paymentCount, color: "blue" },
          { icon: Calendar, label: "Last Payment", value: stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : "-", color: "purple" },
        ]}
      />

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All Payments
          </CardTitle>
          <CardDescription>
            Complete payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments recorded yet</p>
              <p className="text-sm">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-success/10 rounded-full">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.payment_date)} • {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                      </p>
                      {payment.receipt_number && (
                        <p className="text-xs text-muted-foreground font-mono">
                          #{payment.receipt_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-success">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
