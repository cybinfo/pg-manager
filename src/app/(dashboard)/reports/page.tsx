"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { PageSkeleton } from "@/components/ui/loading"
import {
  Building2,
  Users,
  Home,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { InfoBanner } from "@/components/ui/info-banner"
import { useDemoMode } from "@/lib/demo-mode"
import { transformJoin } from "@/lib/supabase/transforms"
import {
  KPICard,
  RevenueTrendChart,
  DuesAgingCard,
  QuickInsights,
  SummaryStatCard,
  ReportChartCard,
  PaymentMethodsChart,
  ReportPageHeader,
  StatusBreakdownCard,
  useReportDateRange,
  formatCurrency,
  calculateGrowth,
  buildPaymentMethodBreakdown,
  CHART_COLORS,
  MONTH_NAMES,
  exportCSV,
} from "@/components/reports"

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
  duesAging: { current: number; days30: number; days60: number; days90Plus: number }
  // Collection Efficiency
  collectionEfficiency: { onTime: number; late: number; overdue: number }
  // Complaints
  openComplaints: number
  resolvedThisMonth: number
  avgResolutionDays: number
  // Property-wise data
  propertyStats: {
    id: string; name: string; totalRooms: number; occupiedRooms: number; revenue: number; pendingDues: number
  }[]
  // Monthly revenue trend
  monthlyRevenue: { month: string; collected: number; billed: number }[]
  // Payment method breakdown
  paymentMethods: { name: string; value: number; count: number }[]
  // Expenses
  totalExpensesThisMonth: number
  totalExpensesLastMonth: number
  expenseGrowth: number
  netIncome: number
  expensesByCategory: { name: string; value: number }[]
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const { dateRange, setDateRange, startDate, endDate, lastMonthStart, lastMonthEnd } = useReportDateRange()
  const { canPerformAction, getDemoMessage } = useDemoMode()

  useEffect(() => {
    fetchReportData()
  }, [selectedProperty, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
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
        expense_type: transformJoin(e.expense_type),
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

      const now = new Date()

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
      const revenueGrowth = calculateGrowth(totalCollectedThisMonth, totalCollectedLastMonth)

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
        if (daysPastDue <= 0) duesAging.current += amount
        else if (daysPastDue <= 30) duesAging.days30 += amount
        else if (daysPastDue <= 60) duesAging.days60 += amount
        else duesAging.days90Plus += amount
      })

      // Collection Efficiency
      const paidBills = filteredBills.filter((b) => b.status === "paid")
      const collectionEfficiency = { onTime: 0, late: 0, overdue: 0 }
      collectionEfficiency.onTime = paidBills.length
      collectionEfficiency.late = unpaidBills.filter(b => {
        const daysPastDue = Math.floor((now.getTime() - new Date(b.due_date).getTime()) / (1000 * 60 * 60 * 24))
        return daysPastDue > 0 && daysPastDue <= 30
      }).length
      collectionEfficiency.overdue = unpaidBills.filter(b => {
        const daysPastDue = Math.floor((now.getTime() - new Date(b.due_date).getTime()) / (1000 * 60 * 60 * 24))
        return daysPastDue > 30
      }).length

      // Complaints
      const openComplaints = filteredComplaints.filter((c) =>
        c.status === "open" || c.status === "acknowledged" || c.status === "in_progress"
      ).length
      const resolvedThisMonth = filteredComplaints.filter((c) => {
        if (!c.resolved_at) return false
        const resolvedAt = new Date(c.resolved_at)
        return resolvedAt >= startDate && resolvedAt <= endDate
      }).length
      const resolvedComplaints = filteredComplaints.filter((c) => c.resolved_at)
      const avgResolutionDays = resolvedComplaints.length > 0
        ? resolvedComplaints.reduce((sum, c) => {
            const created = new Date(c.created_at)
            const resolved = new Date(c.resolved_at)
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / resolvedComplaints.length
        : 0

      // Property-wise stats
      const propertyStats = propertiesData.map((property: { id: string; name: string }) => {
        const propRooms = roomsData.filter((r: { property_id: string }) => r.property_id === property.id)
        const propPayments = paymentsData.filter((p: { property_id: string; payment_date: string }) => {
          const paymentDate = new Date(p.payment_date)
          return p.property_id === property.id && paymentDate >= startDate && paymentDate <= endDate
        })
        const propBills = billsData.filter((b: { property_id: string; status: string }) => b.property_id === property.id && b.status !== "paid" && b.status !== "cancelled")
        return {
          id: property.id,
          name: property.name,
          totalRooms: propRooms.length,
          occupiedRooms: propRooms.filter((r: { status: string }) => r.status === "occupied" || r.status === "partially_occupied").length,
          revenue: propPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
          pendingDues: propBills.reduce((sum: number, b: { balance_due?: number }) => sum + Number(b.balance_due || 0), 0),
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
          month: MONTH_NAMES[monthStart.getMonth()],
          collected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          billed: monthBills.reduce((sum, b) => sum + Number(b.total_amount), 0),
        })
      }

      // Payment method breakdown
      const paymentMethods = buildPaymentMethodBreakdown(periodPayments)

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
      const expenseGrowth = calculateGrowth(totalExpensesThisMonth, totalExpensesLastMonth)
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
        .slice(0, 6)

      setReportData({
        totalRooms, occupiedRooms, availableRooms, maintenanceRooms, totalBeds,
        occupiedBeds: activeTenants, occupancyRate, totalTenants, activeTenants,
        tenantsOnNotice, newTenantsThisMonth, exitsThisMonth,
        totalCollectedThisMonth, totalCollectedLastMonth, revenueGrowth,
        averageRent, totalBilled, totalPendingDues, tenantsWithDues,
        overdueAmount, duesAging, collectionEfficiency, openComplaints,
        resolvedThisMonth, avgResolutionDays, propertyStats, monthlyRevenue,
        paymentMethods, totalExpensesThisMonth, totalExpensesLastMonth,
        expenseGrowth, netIncome, expensesByCategory,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = (type: string) => {
    if (!reportData) return

    const rows: (string | number)[][] = []
    let filename = ""

    switch (type) {
      case "summary":
        filename = "pg-manager-summary-report.csv"
        rows.push(
          ["Metric", "Value"],
          ["Total Rooms", reportData.totalRooms],
          ["Occupied Rooms", reportData.occupiedRooms],
          ["Available Rooms", reportData.availableRooms],
          ["Occupancy Rate", `${reportData.occupancyRate.toFixed(1)}%`],
          ["Active Tenants", reportData.activeTenants],
          ["New Tenants (Period)", reportData.newTenantsThisMonth],
          ["Revenue (Period)", `\u20B9${reportData.totalCollectedThisMonth.toLocaleString("en-IN")}`],
          ["Total Billed", `\u20B9${reportData.totalBilled.toLocaleString("en-IN")}`],
          ["Pending Dues", `\u20B9${reportData.totalPendingDues.toLocaleString("en-IN")}`],
          ["Overdue Amount", `\u20B9${reportData.overdueAmount.toLocaleString("en-IN")}`],
          ["Open Complaints", reportData.openComplaints],
        )
        break
      case "properties":
        filename = "pg-manager-property-report.csv"
        rows.push(
          ["Property", "Total Rooms", "Occupied", "Occupancy %", "Revenue", "Pending Dues"],
          ...reportData.propertyStats.map((p) => [
            p.name, p.totalRooms, p.occupiedRooms,
            p.totalRooms > 0 ? `${((p.occupiedRooms / p.totalRooms) * 100).toFixed(1)}%` : "0%",
            `\u20B9${p.revenue.toLocaleString("en-IN")}`,
            `\u20B9${Math.max(0, p.pendingDues).toLocaleString("en-IN")}`,
          ]),
        )
        break
      case "revenue":
        filename = "pg-manager-revenue-report.csv"
        rows.push(
          ["Month", "Collected", "Billed"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month,
            `\u20B9${m.collected.toLocaleString("en-IN")}`,
            `\u20B9${m.billed.toLocaleString("en-IN")}`,
          ]),
        )
        break
      case "aging":
        filename = "pg-manager-aging-report.csv"
        rows.push(
          ["Age Bucket", "Amount"],
          ["Current (Not Due)", `\u20B9${reportData.duesAging.current.toLocaleString("en-IN")}`],
          ["1-30 Days", `\u20B9${reportData.duesAging.days30.toLocaleString("en-IN")}`],
          ["31-60 Days", `\u20B9${reportData.duesAging.days60.toLocaleString("en-IN")}`],
          ["60+ Days", `\u20B9${reportData.duesAging.days90Plus.toLocaleString("en-IN")}`],
        )
        break
      default:
        return
    }

    exportCSV(rows, filename, canPerformAction, getDemoMessage)
  }

  if (loading) {
    return <PageSkeleton variant="list" />
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  return (
    <FeatureGuard feature="reports">
      <PermissionGuard permission="reports.view">
        <div className="space-y-6">
      <ReportPageHeader
        title="Reports & Analytics"
        description="Insights and metrics for your PG business"
        breadcrumbLabel="Reports"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterOptions={properties}
        filterValue={selectedProperty}
        onFilterChange={setSelectedProperty}
        filterAllLabel="All Properties"
        onExport={() => handleExportCSV("summary")}
        showPrint
      />

      <InfoBanner storageKey="reports-intro">
        Reports show data for your current workspace. Use filters to narrow down by date range or property.
      </InfoBanner>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Occupancy Rate"
          value={`${reportData.occupancyRate.toFixed(1)}%`}
          subtitle={`${reportData.occupiedBeds}/${reportData.totalBeds} beds`}
          icon={Home}
          iconColor={reportData.occupancyRate >= 80 ? "green" : reportData.occupancyRate >= 50 ? "amber" : "red"}
        />
        <KPICard
          title="Revenue Collected"
          value={formatCurrency(reportData.totalCollectedThisMonth)}
          icon={IndianRupee}
          iconColor="green"
          trend={{
            value: reportData.revenueGrowth,
            isPositive: reportData.revenueGrowth >= 0,
            label: "vs last month",
          }}
        />
        <KPICard
          title="Total Expenses"
          value={formatCurrency(reportData.totalExpensesThisMonth)}
          icon={TrendingDown}
          iconColor="rose"
          trend={{
            value: reportData.expenseGrowth,
            isPositive: reportData.expenseGrowth <= 0,
            label: "vs last month",
          }}
        />
        <KPICard
          title="Net Income"
          value={formatCurrency(reportData.netIncome)}
          subtitle="Revenue - Expenses"
          icon={TrendingUp}
          iconColor={reportData.netIncome >= 0 ? "green" : "red"}
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Active Tenants"
          value={reportData.activeTenants}
          subtitle={`+${reportData.newTenantsThisMonth} new`}
          icon={Users}
          iconColor="blue"
        />
        <KPICard
          title="Pending Dues"
          value={formatCurrency(reportData.totalPendingDues)}
          subtitle={`${formatCurrency(reportData.overdueAmount)} overdue`}
          icon={AlertCircle}
          iconColor={reportData.totalPendingDues > 0 ? "red" : "green"}
        />
        <KPICard
          title="Rooms"
          value={reportData.totalRooms}
          subtitle={`${reportData.availableRooms} available`}
          icon={Building2}
          iconColor="purple"
        />
        <KPICard
          title="Open Complaints"
          value={reportData.openComplaints}
          subtitle={`${reportData.resolvedThisMonth} resolved`}
          icon={Clock}
          iconColor={reportData.openComplaints > 0 ? "amber" : "green"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <RevenueTrendChart
          data={reportData.monthlyRevenue}
          onExport={() => handleExportCSV("revenue")}
          formatCurrency={formatCurrency}
        />
        <PaymentMethodsChart data={reportData.paymentMethods} />
      </div>

      {/* Expense by Category */}
      {reportData.expensesByCategory.length > 0 && (
        <ReportChartCard
          title="Expenses by Category"
          description="Top expense categories for the period"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.expensesByCategory} layout="vertical">
              <XAxis type="number" tickFormatter={(value: number) => `\u20B9${(value / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" fill="#F43F5E" radius={[0, 4, 4, 0]}>
                {reportData.expensesByCategory.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportChartCard>
      )}

      {/* Dues Aging & Collection Efficiency */}
      <div className="grid md:grid-cols-2 gap-6">
        <DuesAgingCard
          data={reportData.duesAging}
          onExport={() => handleExportCSV("aging")}
          formatCurrency={formatCurrency}
        />

        {/* Collection Efficiency */}
        <ReportChartCard
          title="Collection Status"
          description="Bills by payment status"
        >
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
        </ReportChartCard>
      </div>

      {/* Property Performance */}
      <ReportChartCard
        title="Property Performance"
        description="Revenue comparison across properties"
        onExport={() => handleExportCSV("properties")}
        exportLabel="Export"
        isEmpty={reportData.propertyStats.length === 0}
        emptyMessage="No properties found"
        height={128}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.propertyStats}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => `\u20B9${(value / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pendingDues" name="Pending Dues" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatusBreakdownCard
          title="Room Status"
          items={[
            { label: "Occupied", value: reportData.occupiedRooms, color: "#22c55e" },
            { label: "Available", value: reportData.availableRooms, color: "#3b82f6" },
            { label: "Maintenance", value: reportData.maintenanceRooms, color: "#eab308" },
          ]}
        />
        <SummaryStatCard
          title="Tenant Overview"
          stats={[
            { label: "Active", value: reportData.activeTenants },
            { label: "On Notice", value: reportData.tenantsOnNotice, highlight: "warning" },
            { label: "New (Period)", value: `+${reportData.newTenantsThisMonth}`, highlight: "positive" },
            { label: "Exits (Period)", value: `-${reportData.exitsThisMonth}`, highlight: "negative" },
          ]}
        />
        <SummaryStatCard
          title="Complaints"
          stats={[
            { label: "Open", value: reportData.openComplaints, highlight: reportData.openComplaints > 0 ? "negative" : "positive" },
            { label: "Resolved (Period)", value: reportData.resolvedThisMonth, highlight: "positive" },
            { label: "Avg. Resolution", value: reportData.avgResolutionDays > 0 ? `${reportData.avgResolutionDays.toFixed(1)} days` : "-" },
          ]}
        />
      </div>

      {/* Quick Insights */}
      <QuickInsights
        insights={[
          {
            id: "low-occupancy",
            title: "Low Occupancy",
            message: `Occupancy is at ${reportData.occupancyRate.toFixed(1)}%. Consider marketing or adjusting pricing.`,
            icon: AlertCircle,
            type: "warning",
            condition: reportData.occupancyRate < 70,
          },
          {
            id: "overdue-payments",
            title: "Overdue Payments",
            message: `${formatCurrency(reportData.overdueAmount)} is overdue. Send payment reminders.`,
            icon: IndianRupee,
            type: "error",
            condition: reportData.overdueAmount > 0,
          },
          {
            id: "open-complaints",
            title: "Open Complaints",
            message: `${reportData.openComplaints} complaints pending. Review and resolve them.`,
            icon: Clock,
            type: "warning",
            condition: reportData.openComplaints > 5,
          },
          {
            id: "revenue-growing",
            title: "Revenue Growing",
            message: `Revenue increased by ${reportData.revenueGrowth.toFixed(1)}% compared to last period!`,
            icon: TrendingUp,
            type: "success",
            condition: reportData.revenueGrowth > 10,
          },
          {
            id: "positive-tenant-flow",
            title: "Positive Tenant Flow",
            message: `Net gain of ${reportData.newTenantsThisMonth - reportData.exitsThisMonth} tenants this period.`,
            icon: Users,
            type: "info",
            condition: reportData.newTenantsThisMonth > reportData.exitsThisMonth,
          },
          {
            id: "high-occupancy",
            title: "High Occupancy",
            message: `Excellent! ${reportData.occupancyRate.toFixed(1)}% occupancy. Consider expanding.`,
            icon: CheckCircle,
            type: "success",
            condition: reportData.occupancyRate >= 90,
          },
          {
            id: "critical-overdue",
            title: "Critical Overdue",
            message: `${formatCurrency(reportData.duesAging.days90Plus)} is overdue by 60+ days. Take immediate action.`,
            icon: AlertCircle,
            type: "error",
            condition: reportData.duesAging.days90Plus > 0,
          },
        ]}
      />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
