"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, CheckCircle, IndianRupee, Calendar } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { PortalStatsGrid, PortalEmptyState } from "@/components/portal"
import { formatDate, formatCurrency } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"

interface PaymentRecord {
  id: string
  receipt_number: string | null
  payment_date: string
  amount: number
  payment_type: string
  payment_method: string
  notes: string | null
}

const paymentTypeLabels: Record<string, string> = {
  subscription: "Subscription",
  locker_rent: "Locker Rent",
  locker_deposit: "Locker Deposit",
  fine: "Fine",
  other: "Other",
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
}

export default function MemberPaymentsPage() {
  const { member, loading: memberLoading } = useMemberPortalData()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [stats, setStats] = useState({
    totalPaid: 0,
    thisYearPaid: 0,
    lastPaymentDate: null as string | null,
    paymentCount: 0,
  })

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchPayments = async () => {
      const supabase = createClient()

      // Fetch all payments
      const { data: paymentsData } = await supabase
        .from("library_payments")
        .select("id, receipt_number, payment_date, amount, payment_type, payment_method, notes")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })

      const records: PaymentRecord[] = paymentsData || []

      // Calculate stats
      const totalPaid = records.reduce((sum: number, p: PaymentRecord) => sum + Number(p.amount), 0)
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
      const thisYearRecords = records.filter((p: PaymentRecord) => p.payment_date >= yearStart)
      const thisYearPaid = thisYearRecords.reduce((sum: number, p: PaymentRecord) => sum + Number(p.amount), 0)
      const lastPaymentDate = records.length > 0 ? records[0].payment_date : null

      setPayments(records)
      setStats({
        totalPaid,
        thisYearPaid,
        lastPaymentDate,
        paymentCount: records.length,
      })
      setLoading(false)
    }

    fetchPayments()
  }, [member, memberLoading])

  if (memberLoading || loading) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">Your subscription and other payments</p>
      </div>

      {/* Stats */}
      <PortalStatsGrid
        stats={[
          {
            icon: IndianRupee,
            label: "Total Paid",
            value: formatCurrency(stats.totalPaid),
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            icon: IndianRupee,
            label: "This Year",
            value: formatCurrency(stats.thisYearPaid),
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
          },
          {
            icon: CreditCard,
            label: "Payments",
            value: stats.paymentCount,
            bgColor: "bg-sky-50",
            iconColor: "text-sky-600",
          },
          {
            icon: Calendar,
            label: "Last Payment",
            value: stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : "-",
            bgColor: "bg-violet-50",
            iconColor: "text-violet-600",
          },
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
                    <div className="p-2 bg-emerald-50 rounded-full">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.payment_date)} • {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                      </p>
                      {payment.receipt_number && (
                        <p className="text-xs text-muted-foreground font-mono">
                          #{payment.receipt_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-600">
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
