"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CreditCard,
  IndianRupee,
  Calendar,
  Download,
  CheckCircle,
  Receipt,
  TrendingUp,
  Filter
} from "lucide-react"

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  receipt_number: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
  charge_type: {
    name: string
  } | null
}

interface RawPayment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  receipt_number: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
  charge_type: {
    name: string
  }[] | null
}

interface PaymentStats {
  totalPaid: number
  totalPaidThisYear: number
  paymentsCount: number
  monthlyRent: number
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
}

export default function TenantPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalPaid: 0,
    totalPaidThisYear: 0,
    paymentsCount: 0,
    monthlyRent: 0,
  })
  const [yearFilter, setYearFilter] = useState<string>("all")

  useEffect(() => {
    const fetchPayments = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get tenant ID
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, monthly_rent")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!tenant) {
        setLoading(false)
        return
      }

      // Fetch all payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          for_period,
          receipt_number,
          reference_number,
          notes,
          created_at,
          charge_type:charge_types(name)
        `)
        .eq("tenant_id", tenant.id)
        .order("payment_date", { ascending: false })

      // Transform the data from arrays to single objects
      const allPayments: Payment[] = ((paymentsData as RawPayment[]) || []).map((payment) => ({
        ...payment,
        charge_type: payment.charge_type && payment.charge_type.length > 0 ? payment.charge_type[0] : null,
      }))
      setPayments(allPayments)

      // Calculate stats
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const thisYearPayments = allPayments.filter((p) => p.payment_date >= yearStart)
      const totalPaidThisYear = thisYearPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      setStats({
        totalPaid,
        totalPaidThisYear,
        paymentsCount: allPayments.length,
        monthlyRent: tenant.monthly_rent,
      })

      setLoading(false)
    }

    fetchPayments()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  // Get unique years from payments
  const years = [...new Set(payments.map((p) => new Date(p.payment_date).getFullYear()))].sort((a, b) => b - a)

  // Filter payments by year
  const filteredPayments = yearFilter === "all"
    ? payments
    : payments.filter((p) => new Date(p.payment_date).getFullYear() === parseInt(yearFilter))

  // Group payments by month
  const groupedPayments = filteredPayments.reduce((groups, payment) => {
    const date = new Date(payment.payment_date)
    const monthYear = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    if (!groups[monthYear]) {
      groups[monthYear] = []
    }
    groups[monthYear].push(payment)
    return groups
  }, {} as Record<string, Payment[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">View all your payment records and receipts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-semibold">{formatCurrency(stats.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Year</p>
                <p className="font-semibold">{formatCurrency(stats.totalPaidThisYear)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payments</p>
                <p className="font-semibold">{stats.paymentsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">{formatCurrency(stats.monthlyRent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      {years.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
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
                          <div className="p-2 bg-green-100 rounded-full mt-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
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
                                {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                              </span>
                              {payment.reference_number && (
                                <span>Ref: {payment.reference_number}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {payment.receipt_number && (
                            <p className="text-xs text-muted-foreground mb-2">
                              #{payment.receipt_number}
                            </p>
                          )}
                          <Link href={`/dashboard/payments/${payment.id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Receipt
                            </Button>
                          </Link>
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
    </div>
  )
}
