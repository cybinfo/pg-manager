"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  IndianRupee,
  Calendar,
  Building2,
  Receipt,
  Filter,
  Bell
} from "lucide-react"
import { toast } from "sonner"
import { WhatsAppIconButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  reference_number: string | null
  receipt_number: string | null
  notes: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
  }
  property: {
    id: string
    name: string
  }
  charge_type: {
    id: string
    name: string
  } | null
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("all")
  const [stats, setStats] = useState({
    totalThisMonth: 0,
    totalCount: 0,
  })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(id, name, phone),
        property:properties(id, name),
        charge_type:charge_types(id, name)
      `)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
      toast.error("Failed to load payments")
      setLoading(false)
      return
    }

    setPayments(data || [])

    // Calculate stats
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthPayments = (data || []).filter(
      (p) => new Date(p.payment_date) >= firstOfMonth
    )
    const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    setStats({
      totalThisMonth,
      totalCount: data?.length || 0,
    })

    setLoading(false)
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.tenant.phone.includes(searchQuery) ||
      payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterMethod === "all" || payment.payment_method === filterMethod

    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage all tenant payments
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payments/reminders">
            <Button variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Send Reminders
            </Button>
          </Link>
          <Link href="/dashboard/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month Collection
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{stats.totalThisMonth.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {payments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, receipt #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments recorded</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start recording payments from your tenants
            </p>
            <Link href="/dashboard/payments/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-muted-foreground text-center">
              Try a different search or filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Tenant & Property Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium shrink-0">
                      ₹
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{payment.tenant.name}</h3>
                        {payment.receipt_number && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            #{payment.receipt_number}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {payment.property.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(payment.payment_date)}
                        </span>
                        {payment.for_period && (
                          <span>For: {payment.for_period}</span>
                        )}
                      </div>
                      {payment.charge_type && (
                        <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {payment.charge_type.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Method */}
                  <div className="flex items-center gap-4 sm:text-right">
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        ₹{Number(payment.amount).toLocaleString("en-IN")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                        {payment.reference_number && (
                          <span className="ml-1">• Ref: {payment.reference_number}</span>
                        )}
                      </div>
                    </div>
                    <WhatsAppIconButton
                      phone={payment.tenant.phone}
                      message={messageTemplates.simpleReceipt({
                        tenantName: payment.tenant.name,
                        amount: Number(payment.amount),
                        receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
                      })}
                    />
                    <Link href={`/dashboard/payments/${payment.id}`}>
                      <Button variant="outline" size="sm">
                        <Receipt className="h-4 w-4" />
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
      )}
    </div>
  )
}
