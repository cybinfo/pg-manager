"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  FileText,
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  User,
  Building2,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight
} from "lucide-react"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  tenant: {
    name: string
    phone: string
  } | null
  property: {
    name: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  partial: { label: "Partial", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
}

export default function BillsPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    collected: 0,
  })

  useEffect(() => {
    const fetchBills = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          tenant:tenants(name, phone),
          property:properties(name)
        `)
        .eq("owner_id", user.id)
        .order("bill_date", { ascending: false })

      if (error) {
        console.error("Error fetching bills:", error)
        setLoading(false)
        return
      }

      // Transform data
      const transformedBills: Bill[] = (data || []).map((bill) => ({
        ...bill,
        tenant: Array.isArray(bill.tenant) ? bill.tenant[0] : bill.tenant,
        property: Array.isArray(bill.property) ? bill.property[0] : bill.property,
      }))

      setBills(transformedBills)

      // Calculate stats
      const total = transformedBills.reduce((sum, b) => sum + Number(b.total_amount), 0)
      const pending = transformedBills
        .filter((b) => b.status === "pending" || b.status === "partial")
        .reduce((sum, b) => sum + Number(b.balance_due), 0)
      const overdue = transformedBills
        .filter((b) => b.status === "overdue")
        .reduce((sum, b) => sum + Number(b.balance_due), 0)
      const collected = transformedBills.reduce((sum, b) => sum + Number(b.paid_amount), 0)

      setStats({ total, pending, overdue, collected })
      setLoading(false)
    }

    fetchBills()
  }, [router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.for_month.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground">
            Generate and manage monthly bills for tenants
          </p>
        </div>
        <Link href="/dashboard/bills/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Bill
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
                <p className="text-xs text-muted-foreground">Total Billed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.collected)}</p>
                <p className="text-xs text-muted-foreground">Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.pending)}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.overdue)}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number, tenant, or month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background min-w-[150px]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bills found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Generate your first bill to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link href="/dashboard/bills/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Bill
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const StatusIcon = statusConfig[bill.status]?.icon || Clock
            return (
              <Link key={bill.id} href={`/dashboard/bills/${bill.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{bill.bill_number}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[bill.status]?.color || "bg-gray-100"}`}
                            >
                              {statusConfig[bill.status]?.label || bill.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {bill.tenant?.name || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {bill.for_month}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(bill.total_amount)}</p>
                          {bill.balance_due > 0 && bill.status !== "paid" && (
                            <p className="text-sm text-red-600">
                              Due: {formatCurrency(bill.balance_due)}
                            </p>
                          )}
                          {bill.status === "paid" && (
                            <p className="text-sm text-green-600">Fully Paid</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
