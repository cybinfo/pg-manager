"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  Loader2,
  Building2,
  Users,
  Home,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { PermissionGuard } from "@/components/auth"

interface Property {
  id: string
  name: string
}

interface ReportData {
  // Occupancy
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  maintenanceRooms: number
  totalBeds: number
  occupiedBeds: number
  occupancyRate: number

  // Tenants
  totalTenants: number
  activeTenants: number
  tenantsOnNotice: number
  newTenantsThisMonth: number
  exitsThisMonth: number

  // Revenue
  totalCollectedThisMonth: number
  totalCollectedLastMonth: number
  revenueGrowth: number
  averageRent: number
  totalBilled: number

  // Dues
  totalPendingDues: number
  tenantsWithDues: number
  overdueAmount: number

  // Dues Aging
  duesAging: {
    current: number
    days30: number
    days60: number
    days90Plus: number
  }

  // Collection Efficiency
  collectionEfficiency: {
    onTime: number
    late: number
    overdue: number
  }

  // Complaints
  openComplaints: number
  resolvedThisMonth: number
  avgResolutionDays: number

  // Property-wise data
  propertyStats: {
    id: string
    name: string
    totalRooms: number
    occupiedRooms: number
    revenue: number
    pendingDues: number
  }[]

  // Monthly revenue trend
  monthlyRevenue: {
    month: string
    collected: number
    billed: number
  }[]

  // Payment method breakdown
  paymentMethods: {
    name: string
    value: number
    count: number
  }[]

  // Previous period for comparison
  previousPeriod: {
    revenue: number
    tenants: number
    occupancy: number
    dues: number
  }

  // Expenses
  totalExpensesThisMonth: number
  totalExpensesLastMonth: number
  expenseGrowth: number
  netIncome: number

  // Expense by category
  expensesByCategory: {
    name: string
    value: number
  }[]
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const CHART_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

const dateRangeOptions = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
]

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [dateRange, setDateRange] = useState<string>("this_month")

  useEffect(() => {
    fetchReportData()
  }, [selectedProperty, dateRange])

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (dateRange) {
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case "last_3_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case "last_6_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        break
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default: // this_month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { startDate, endDate }
  }

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { startDate, endDate } = getDateRange()

      // Fetch all required data in parallel
      const [
        propertiesRes,
        roomsRes,
        tenantsRes,
        paymentsRes,
        billsRes,
        complaintsRes,
        expensesRes
      ] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("rooms").select("id, property_id, status, total_beds"),
        supabase.from("tenants").select("id, property_id, status, monthly_rent, check_in_date, check_out_date, created_at"),
        supabase.from("payments").select("id, property_id, amount, payment_method, payment_date, created_at"),
        supabase.from("bills").select("id, property_id, tenant_id, total_amount, balance_due, status, bill_date, due_date"),
        supabase.from("complaints").select("id, property_id, status, created_at, resolved_at"),
        supabase.from("expenses").select("id, property_id, amount, expense_date, expense_type_id, expense_type:expense_types(name)"),
      ])

      const propertiesData = propertiesRes.data || []
      const roomsData = roomsRes.data || []
      const tenantsData = tenantsRes.data || []
      const paymentsData = paymentsRes.data || []
      const billsData = billsRes.data || []
      const complaintsData = complaintsRes.data || []
      const expensesData = (expensesRes.data || []).map((e: any) => ({
        ...e,
        expense_type: Array.isArray(e.expense_type) ? e.expense_type[0] : e.expense_type,
      }))

      setProperties(propertiesData)

      // Filter by property if selected
      const filterByProperty = (items: any[]) => {
        if (selectedProperty === "all") return items
        return items.filter((item) => item.property_id === selectedProperty)
      }

      const filteredRooms = filterByProperty(roomsData)
      const filteredTenants = filterByProperty(tenantsData)
      const filteredPayments = filterByProperty(paymentsData)
      const filteredBills = filterByProperty(billsData)
      const filteredComplaints = filterByProperty(complaintsData)
      const filteredExpenses = filterByProperty(expensesData)

      // Date calculations
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      // Occupancy calculations
      const totalRooms = filteredRooms.length
      const occupiedRooms = filteredRooms.filter((r) => r.status === "occupied" || r.status === "partially_occupied").length
      const availableRooms = filteredRooms.filter((r) => r.status === "available").length
      const maintenanceRooms = filteredRooms.filter((r) => r.status === "maintenance").length
      const totalBeds = filteredRooms.reduce((sum, r) => sum + (r.total_beds || 1), 0)
      const activeTenants = filteredTenants.filter((t) => t.status === "active").length
      const occupancyRate = totalBeds > 0 ? (activeTenants / totalBeds) * 100 : 0

      // Tenant calculations
      const totalTenants = filteredTenants.length
      const tenantsOnNotice = filteredTenants.filter((t) => t.status === "notice_period").length
      const newTenantsThisMonth = filteredTenants.filter((t) => {
        const createdAt = new Date(t.created_at)
        return createdAt >= startDate && createdAt <= endDate
      }).length
      const exitsThisMonth = filteredTenants.filter((t) => {
        if (!t.check_out_date) return false
        const checkOut = new Date(t.check_out_date)
        return checkOut >= startDate && checkOut <= endDate
      }).length

      // Revenue calculations
      const periodPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= startDate && paymentDate <= endDate
      })
      const lastMonthPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd
      })

      const totalCollectedThisMonth = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const totalCollectedLastMonth = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const revenueGrowth = totalCollectedLastMonth > 0
        ? ((totalCollectedThisMonth - totalCollectedLastMonth) / totalCollectedLastMonth) * 100
        : 0

      // Total billed in period
      const periodBills = filteredBills.filter((b) => {
        const billDate = new Date(b.bill_date)
        return billDate >= startDate && billDate <= endDate
      })
      const totalBilled = periodBills.reduce((sum, b) => sum + Number(b.total_amount), 0)

      const activeTenantsWithRent = filteredTenants.filter((t) => t.status === "active" && t.monthly_rent)
      const averageRent = activeTenantsWithRent.length > 0
        ? activeTenantsWithRent.reduce((sum, t) => sum + Number(t.monthly_rent), 0) / activeTenantsWithRent.length
        : 0

      // Dues calculations from bills
      const unpaidBills = filteredBills.filter((b) => b.status !== "paid" && b.status !== "cancelled")
      const totalPendingDues = unpaidBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)
      const tenantsWithDues = new Set(unpaidBills.map(b => b.tenant_id)).size
      const overdueBills = unpaidBills.filter((b) => new Date(b.due_date) < now)
      const overdueAmount = overdueBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)

      // Dues Aging calculation
      const duesAging = { current: 0, days30: 0, days60: 0, days90Plus: 0 }
      unpaidBills.forEach((bill) => {
        const dueDate = new Date(bill.due_date)
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const amount = Number(bill.balance_due || 0)

        if (daysPastDue <= 0) {
          duesAging.current += amount
        } else if (daysPastDue <= 30) {
          duesAging.days30 += amount
        } else if (daysPastDue <= 60) {
          duesAging.days60 += amount
        } else {
          duesAging.days90Plus += amount
        }
      })

      // Collection Efficiency calculation
      const paidBills = filteredBills.filter((b) => b.status === "paid")
      const collectionEfficiency = { onTime: 0, late: 0, overdue: 0 }
      // Simplified: count bills paid vs overdue
      collectionEfficiency.onTime = paidBills.length
      collectionEfficiency.late = unpaidBills.filter(b => {
        const dueDate = new Date(b.due_date)
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysPastDue > 0 && daysPastDue <= 30
      }).length
      collectionEfficiency.overdue = unpaidBills.filter(b => {
        const dueDate = new Date(b.due_date)
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysPastDue > 30
      }).length

      // Complaints calculations
      const openComplaints = filteredComplaints.filter((c) =>
        c.status === "open" || c.status === "acknowledged" || c.status === "in_progress"
      ).length
      const resolvedThisMonth = filteredComplaints.filter((c) => {
        if (!c.resolved_at) return false
        const resolvedAt = new Date(c.resolved_at)
        return resolvedAt >= startDate && resolvedAt <= endDate
      }).length

      // Average resolution time
      const resolvedComplaints = filteredComplaints.filter((c) => c.resolved_at)
      const avgResolutionDays = resolvedComplaints.length > 0
        ? resolvedComplaints.reduce((sum, c) => {
            const created = new Date(c.created_at)
            const resolved = new Date(c.resolved_at)
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / resolvedComplaints.length
        : 0

      // Property-wise stats
      const propertyStats = propertiesData.map((property) => {
        const propRooms = roomsData.filter((r) => r.property_id === property.id)
        const propPayments = paymentsData.filter((p) => {
          const paymentDate = new Date(p.payment_date)
          return p.property_id === property.id && paymentDate >= startDate && paymentDate <= endDate
        })
        const propBills = billsData.filter((b) => b.property_id === property.id && b.status !== "paid" && b.status !== "cancelled")

        return {
          id: property.id,
          name: property.name,
          totalRooms: propRooms.length,
          occupiedRooms: propRooms.filter((r) => r.status === "occupied" || r.status === "partially_occupied").length,
          revenue: propPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          pendingDues: propBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0),
        }
      })

      // Monthly revenue trend (last 6 months)
      const monthlyRevenue = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthPayments = filteredPayments.filter((p) => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate >= monthStart && paymentDate <= monthEnd
        })
        const monthBills = filteredBills.filter((b) => {
          const billDate = new Date(b.bill_date)
          return billDate >= monthStart && billDate <= monthEnd
        })
        monthlyRevenue.push({
          month: monthNames[monthStart.getMonth()],
          collected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          billed: monthBills.reduce((sum, b) => sum + Number(b.total_amount), 0),
        })
      }

      // Payment method breakdown
      const methodCounts: Record<string, { count: number; amount: number }> = {}
      periodPayments.forEach((p) => {
        const method = p.payment_method || "other"
        if (!methodCounts[method]) {
          methodCounts[method] = { count: 0, amount: 0 }
        }
        methodCounts[method].count++
        methodCounts[method].amount += Number(p.amount)
      })

      const methodLabels: Record<string, string> = {
        cash: "Cash",
        upi: "UPI",
        bank_transfer: "Bank Transfer",
        cheque: "Cheque",
        card: "Card",
        other: "Other",
      }

      const paymentMethods = Object.entries(methodCounts).map(([method, data]) => ({
        name: methodLabels[method] || method,
        value: data.amount,
        count: data.count,
      }))

      // Expense calculations
      const periodExpenses = filteredExpenses.filter((e: any) => {
        const expenseDate = new Date(e.expense_date)
        return expenseDate >= startDate && expenseDate <= endDate
      })
      const lastMonthExpenses = filteredExpenses.filter((e: any) => {
        const expenseDate = new Date(e.expense_date)
        return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd
      })

      const totalExpensesThisMonth = periodExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
      const totalExpensesLastMonth = lastMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
      const expenseGrowth = totalExpensesLastMonth > 0
        ? ((totalExpensesThisMonth - totalExpensesLastMonth) / totalExpensesLastMonth) * 100
        : 0
      const netIncome = totalCollectedThisMonth - totalExpensesThisMonth

      // Expense by category
      const categoryTotals: Record<string, number> = {}
      periodExpenses.forEach((e: any) => {
        const categoryName = e.expense_type?.name || "Uncategorized"
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Number(e.amount)
      })
      const expensesByCategory = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6) // Top 6 categories

      // Previous period comparison
      const prevPeriodStart = new Date(startDate)
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1)
      const prevPeriodEnd = new Date(endDate)
      prevPeriodEnd.setMonth(prevPeriodEnd.getMonth() - 1)

      const prevPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= prevPeriodStart && paymentDate <= prevPeriodEnd
      })
      const prevTenants = filteredTenants.filter((t) => {
        const createdAt = new Date(t.created_at)
        return createdAt >= prevPeriodStart && createdAt <= prevPeriodEnd
      }).length

      const previousPeriod = {
        revenue: prevPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        tenants: prevTenants,
        occupancy: 0, // Would need historical data
        dues: 0,
      }

      setReportData({
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        totalBeds,
        occupiedBeds: activeTenants,
        occupancyRate,
        totalTenants,
        activeTenants,
        tenantsOnNotice,
        newTenantsThisMonth,
        exitsThisMonth,
        totalCollectedThisMonth,
        totalCollectedLastMonth,
        revenueGrowth,
        averageRent,
        totalBilled,
        totalPendingDues,
        tenantsWithDues,
        overdueAmount,
        duesAging,
        collectionEfficiency,
        openComplaints,
        resolvedThisMonth,
        avgResolutionDays,
        propertyStats,
        monthlyRevenue,
        paymentMethods,
        previousPeriod,
        totalExpensesThisMonth,
        totalExpensesLastMonth,
        expenseGrowth,
        netIncome,
        expensesByCategory,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (type: string) => {
    if (!reportData) return

    let csvContent = ""
    let filename = ""

    switch (type) {
      case "summary":
        filename = "pg-manager-summary-report.csv"
        csvContent = [
          ["Metric", "Value"],
          ["Total Rooms", reportData.totalRooms],
          ["Occupied Rooms", reportData.occupiedRooms],
          ["Available Rooms", reportData.availableRooms],
          ["Occupancy Rate", `${reportData.occupancyRate.toFixed(1)}%`],
          ["Active Tenants", reportData.activeTenants],
          ["New Tenants (Period)", reportData.newTenantsThisMonth],
          ["Revenue (Period)", `₹${reportData.totalCollectedThisMonth.toLocaleString("en-IN")}`],
          ["Total Billed", `₹${reportData.totalBilled.toLocaleString("en-IN")}`],
          ["Pending Dues", `₹${reportData.totalPendingDues.toLocaleString("en-IN")}`],
          ["Overdue Amount", `₹${reportData.overdueAmount.toLocaleString("en-IN")}`],
          ["Open Complaints", reportData.openComplaints],
        ].map((row) => row.join(",")).join("\n")
        break

      case "properties":
        filename = "pg-manager-property-report.csv"
        csvContent = [
          ["Property", "Total Rooms", "Occupied", "Occupancy %", "Revenue", "Pending Dues"],
          ...reportData.propertyStats.map((p) => [
            p.name,
            p.totalRooms,
            p.occupiedRooms,
            p.totalRooms > 0 ? `${((p.occupiedRooms / p.totalRooms) * 100).toFixed(1)}%` : "0%",
            `₹${p.revenue.toLocaleString("en-IN")}`,
            `₹${Math.max(0, p.pendingDues).toLocaleString("en-IN")}`,
          ]),
        ].map((row) => row.join(",")).join("\n")
        break

      case "revenue":
        filename = "pg-manager-revenue-report.csv"
        csvContent = [
          ["Month", "Collected", "Billed"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month,
            `₹${m.collected.toLocaleString("en-IN")}`,
            `₹${m.billed.toLocaleString("en-IN")}`,
          ]),
        ].map((row) => row.join(",")).join("\n")
        break

      case "aging":
        filename = "pg-manager-aging-report.csv"
        csvContent = [
          ["Age Bucket", "Amount"],
          ["Current (Not Due)", `₹${reportData.duesAging.current.toLocaleString("en-IN")}`],
          ["1-30 Days", `₹${reportData.duesAging.days30.toLocaleString("en-IN")}`],
          ["31-60 Days", `₹${reportData.duesAging.days60.toLocaleString("en-IN")}`],
          ["60+ Days", `₹${reportData.duesAging.days90Plus.toLocaleString("en-IN")}`],
        ].map((row) => row.join(",")).join("\n")
        break

      default:
        return
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  return (
    <PermissionGuard permission="reports.view">
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights and metrics for your PG business"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
              <Filter className="h-4 w-4 ml-2 text-muted-foreground" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 px-3 rounded-md border-0 bg-transparent text-sm font-medium focus:outline-none"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-white text-sm"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => exportToCSV("summary")}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold">{reportData.occupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {reportData.occupiedBeds}/{reportData.totalBeds} beds
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.occupancyRate >= 80 ? "bg-green-100" : reportData.occupancyRate >= 50 ? "bg-yellow-100" : "bg-red-100"}`}>
                <Home className={`h-5 w-5 ${reportData.occupancyRate >= 80 ? "text-green-600" : reportData.occupancyRate >= 50 ? "text-yellow-600" : "text-red-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalCollectedThisMonth)}</p>
                <div className={`flex items-center text-xs ${reportData.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {reportData.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(reportData.revenueGrowth).toFixed(1)}% vs last month
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalExpensesThisMonth)}</p>
                <div className={`flex items-center text-xs ${reportData.expenseGrowth <= 0 ? "text-green-600" : "text-red-600"}`}>
                  {reportData.expenseGrowth <= 0 ? (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(reportData.expenseGrowth).toFixed(1)}% vs last month
                </div>
              </div>
              <div className="p-3 rounded-full bg-rose-100">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={`text-2xl font-bold ${reportData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(reportData.netIncome)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Revenue - Expenses
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.netIncome >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                <TrendingUp className={`h-5 w-5 ${reportData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Tenants */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold">{reportData.activeTenants}</p>
                <p className="text-xs text-green-600">
                  +{reportData.newTenantsThisMonth} new
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Dues */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Dues</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalPendingDues)}</p>
                <p className="text-xs text-red-600">
                  {formatCurrency(reportData.overdueAmount)} overdue
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.totalPendingDues > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <AlertCircle className={`h-5 w-5 ${reportData.totalPendingDues > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rooms */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rooms</p>
                <p className="text-2xl font-bold">{reportData.totalRooms}</p>
                <p className="text-xs text-muted-foreground">
                  {reportData.availableRooms} available
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Complaints */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Complaints</p>
                <p className="text-2xl font-bold">{reportData.openComplaints}</p>
                <p className="text-xs text-green-600">
                  {reportData.resolvedThisMonth} resolved
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.openComplaints > 0 ? "bg-amber-100" : "bg-green-100"}`}>
                <Clock className={`h-5 w-5 ${reportData.openComplaints > 0 ? "text-amber-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>Collected vs Billed (Last 6 months)</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportToCSV("revenue")}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.monthlyRevenue}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: "#10B981", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="billed"
                  name="Billed"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ fill: "#6366F1", strokeWidth: 2 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>Breakdown by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.paymentMethods.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No payments in selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.paymentMethods}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {reportData.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense by Category */}
      {reportData.expensesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expenses by Category</CardTitle>
            <CardDescription>Top expense categories for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.expensesByCategory} layout="vertical">
                <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" fill="#F43F5E" radius={[0, 4, 4, 0]}>
                  {reportData.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dues Aging & Collection Efficiency */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Dues Aging Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Dues Aging Report</CardTitle>
                <CardDescription>Outstanding amounts by age</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportToCSV("aging")}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium">Current (Not Due)</span>
                </div>
                <span className="font-bold text-green-700">{formatCurrency(reportData.duesAging.current)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="font-medium">1-30 Days Overdue</span>
                </div>
                <span className="font-bold text-yellow-700">{formatCurrency(reportData.duesAging.days30)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="font-medium">31-60 Days Overdue</span>
                </div>
                <span className="font-bold text-orange-700">{formatCurrency(reportData.duesAging.days60)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium">60+ Days Overdue</span>
                </div>
                <span className="font-bold text-red-700">{formatCurrency(reportData.duesAging.days90Plus)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Collection Status</CardTitle>
            <CardDescription>Bills by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: "Paid", value: reportData.collectionEfficiency.onTime, fill: "#10B981" },
                  { name: "Late (1-30d)", value: reportData.collectionEfficiency.late, fill: "#F59E0B" },
                  { name: "Overdue (30d+)", value: reportData.collectionEfficiency.overdue, fill: "#EF4444" },
                ]}
                layout="vertical"
              >
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[
                    { name: "Paid", fill: "#10B981" },
                    { name: "Late (1-30d)", fill: "#F59E0B" },
                    { name: "Overdue (30d+)", fill: "#EF4444" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Bills</span>
                <span className="font-medium">
                  {reportData.collectionEfficiency.onTime + reportData.collectionEfficiency.late + reportData.collectionEfficiency.overdue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Property Performance</CardTitle>
              <CardDescription>Revenue comparison across properties</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportToCSV("properties")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportData.propertyStats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No properties found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.propertyStats}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendingDues" name="Pending Dues" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Room Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Occupied</span>
                </div>
                <span className="font-medium">{reportData.occupiedRooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Available</span>
                </div>
                <span className="font-medium">{reportData.availableRooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Maintenance</span>
                </div>
                <span className="font-medium">{reportData.maintenanceRooms}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenant Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-medium">{reportData.activeTenants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On Notice</span>
                <span className="font-medium text-yellow-600">{reportData.tenantsOnNotice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New (Period)</span>
                <span className="font-medium text-green-600">+{reportData.newTenantsThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exits (Period)</span>
                <span className="font-medium text-red-600">-{reportData.exitsThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaints Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open</span>
                <span className={`font-medium ${reportData.openComplaints > 0 ? "text-red-600" : "text-green-600"}`}>
                  {reportData.openComplaints}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolved (Period)</span>
                <span className="font-medium text-green-600">{reportData.resolvedThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Resolution</span>
                <span className="font-medium">
                  {reportData.avgResolutionDays > 0 ? `${reportData.avgResolutionDays.toFixed(1)} days` : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {reportData.occupancyRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Low Occupancy</p>
                  <p className="text-sm text-yellow-700">
                    Occupancy is at {reportData.occupancyRate.toFixed(1)}%. Consider marketing or adjusting pricing.
                  </p>
                </div>
              </div>
            )}
            {reportData.overdueAmount > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <IndianRupee className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Overdue Payments</p>
                  <p className="text-sm text-red-700">
                    {formatCurrency(reportData.overdueAmount)} is overdue. Send payment reminders.
                  </p>
                </div>
              </div>
            )}
            {reportData.openComplaints > 5 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">Open Complaints</p>
                  <p className="text-sm text-orange-700">
                    {reportData.openComplaints} complaints pending. Review and resolve them.
                  </p>
                </div>
              </div>
            )}
            {reportData.revenueGrowth > 10 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Revenue Growing</p>
                  <p className="text-sm text-green-700">
                    Revenue increased by {reportData.revenueGrowth.toFixed(1)}% compared to last period!
                  </p>
                </div>
              </div>
            )}
            {reportData.newTenantsThisMonth > reportData.exitsThisMonth && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Positive Tenant Flow</p>
                  <p className="text-sm text-blue-700">
                    Net gain of {reportData.newTenantsThisMonth - reportData.exitsThisMonth} tenants this period.
                  </p>
                </div>
              </div>
            )}
            {reportData.occupancyRate >= 90 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">High Occupancy</p>
                  <p className="text-sm text-green-700">
                    Excellent! {reportData.occupancyRate.toFixed(1)}% occupancy. Consider expanding.
                  </p>
                </div>
              </div>
            )}
            {reportData.duesAging.days90Plus > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Critical Overdue</p>
                  <p className="text-sm text-red-700">
                    {formatCurrency(reportData.duesAging.days90Plus)} is overdue by 60+ days. Take immediate action.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
