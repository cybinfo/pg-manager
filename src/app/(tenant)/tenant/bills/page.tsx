"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  IndianRupee,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Receipt,
  TrendingUp,
  Flag
} from "lucide-react"
import { PageLoader } from "@/components/ui/page-loader"
import { ReportIssueDialog } from "@/components/tenant/report-issue-dialog"
import { formatDate, formatCurrency, formatMonthYear } from "@/lib/format"
import { StatusBadge } from "@/components/ui/status-badge"

interface TenantInfo {
  id: string
  workspace_id: string
  owner_id: string
}

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
  line_items: LineItem[] | null
  created_at: string
}

interface LineItem {
  name: string
  amount: number
  type?: string
}

interface BillStats {
  totalBilled: number
  totalPaid: number
  totalDue: number
  billsCount: number
}

const statusIconConfig: Record<string, { icon: typeof CheckCircle; className: string }> = {
  paid: { icon: CheckCircle, className: "text-green-600 bg-green-100" },
  partial: { icon: Clock, className: "text-amber-600 bg-amber-100" },
  overdue: { icon: AlertCircle, className: "text-red-600 bg-red-100" },
  pending: { icon: Clock, className: "text-blue-600 bg-blue-100" },
}

export default function TenantBillsPage() {
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState<Bill[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [stats, setStats] = useState<BillStats>({
    totalBilled: 0,
    totalPaid: 0,
    totalDue: 0,
    billsCount: 0,
  })
  const [yearFilter, setYearFilter] = useState<string>("all")

  // Report Issue Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)

  useEffect(() => {
    const fetchBills = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get tenant info including owner_id
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, owner_id, property:properties(owner_id)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!tenant) {
        setLoading(false)
        return
      }

      // Handle Supabase array join
      const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property
      const ownerId = property?.owner_id || tenant.owner_id

      // Get workspace_id from workspaces table via owner
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", ownerId)
        .single()

      setTenantInfo({
        id: tenant.id,
        workspace_id: workspace?.id || "",
        owner_id: ownerId,
      })

      // Fetch all bills
      const { data: billsData } = await supabase
        .from("bills")
        .select(`
          id,
          bill_number,
          bill_date,
          due_date,
          for_month,
          total_amount,
          paid_amount,
          balance_due,
          status,
          line_items,
          created_at
        `)
        .eq("tenant_id", tenant.id)
        .order("bill_date", { ascending: false })

      const allBills = billsData || []
      setBills(allBills)

      // Calculate stats
      const totalBilled = allBills.reduce((sum, b) => sum + Number(b.total_amount), 0)
      const totalPaid = allBills.reduce((sum, b) => sum + Number(b.paid_amount), 0)
      const totalDue = allBills.reduce((sum, b) => sum + Number(b.balance_due), 0)

      setStats({
        totalBilled,
        totalPaid,
        totalDue,
        billsCount: allBills.length,
      })

      setLoading(false)
    }

    fetchBills()
  }, [])

  const openReportDialog = (bill: Bill) => {
    setSelectedBill(bill)
    setDialogOpen(true)
  }

  // Helper to convert YYYY-MM to Date for formatMonthYear
  const formatBillMonth = (monthString: string) => {
    const [year, month] = monthString.split("-")
    return formatMonthYear(new Date(Number(year), Number(month) - 1))
  }

  // Get unique years from bills
  const years = [...new Set(bills.map((b) => new Date(b.bill_date).getFullYear()))].sort((a, b) => b - a)

  // Filter bills by year
  const filteredBills = yearFilter === "all"
    ? bills
    : bills.filter((b) => new Date(b.bill_date).getFullYear() === parseInt(yearFilter))

  // Group bills by month
  const groupedBills = filteredBills.reduce((groups, bill) => {
    const date = new Date(bill.bill_date)
    const monthYear = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    if (!groups[monthYear]) {
      groups[monthYear] = []
    }
    groups[monthYear].push(bill)
    return groups
  }, {} as Record<string, Bill[]>)

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Bills</h1>
        <p className="text-muted-foreground">View all your bills and payment status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Total Billed"
          value={formatCurrency(stats.totalBilled)}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          color="green"
        />
        <StatCard
          icon={AlertCircle}
          label="Balance Due"
          value={formatCurrency(stats.totalDue)}
          color="red"
        />
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={stats.billsCount}
          color="purple"
        />
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

      {/* Bills List */}
      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No bills yet</h3>
            <p className="text-muted-foreground">Your bills will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBills).map(([monthYear, monthBills]) => (
            <div key={monthYear}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{monthYear}</h3>
              <div className="space-y-3">
                {monthBills.map((bill) => {
                  const iconConfig = statusIconConfig[bill.status] || statusIconConfig.pending
                  const StatusIcon = iconConfig.icon
                  return (
                    <Card key={bill.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${iconConfig.className}`}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{formatCurrency(bill.total_amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                Bill for {formatBillMonth(bill.for_month)}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(bill.bill_date)}
                                </span>
                                <span>Due: {formatDate(bill.due_date)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-start gap-2">
                            <div>
                              <StatusBadge status={bill.status as "pending" | "partial" | "paid" | "overdue"} />
                              {bill.bill_number && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  #{bill.bill_number}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => openReportDialog(bill)}
                              title="Report issue with this bill"
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Payment Progress */}
                        {bill.status !== "paid" && bill.paid_amount > 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Paid: {formatCurrency(bill.paid_amount)}</span>
                              <span className="text-red-600 font-medium">Due: {formatCurrency(bill.balance_due)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(bill.paid_amount / bill.total_amount) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Line Items */}
                        {bill.line_items && bill.line_items.length > 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Bill Details</p>
                            <div className="space-y-1">
                              {bill.line_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{item.name}</span>
                                  <span>{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {bills.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredBills.length} of {bills.length} bills
                </p>
              </div>
              {stats.totalDue > 0 && (
                <p className="font-medium text-red-600">
                  Total Due: {formatCurrency(stats.totalDue)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Issue Dialog */}
      {selectedBill && tenantInfo && (
        <ReportIssueDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fieldLabel={`Bill #${selectedBill.bill_number || 'N/A'}`}
          currentValue={`${formatCurrency(selectedBill.total_amount)} for ${formatBillMonth(selectedBill.for_month)}`}
          approvalType="bill_dispute"
          tenantId={tenantInfo.id}
          workspaceId={tenantInfo.workspace_id}
          ownerId={tenantInfo.owner_id}
        />
      )}
    </div>
  )
}
