"use client"

import {
  BarChart,
  Bar,
  CartesianGrid,
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
import { PermissionGuard, ModuleGuard, FeatureGate } from "@/components/auth"
import { useFeatures } from "@/lib/features/use-features"
import { InfoBanner } from "@/components/ui/info-banner"
import { useDemoMode } from "@/lib/demo-mode"
import {
  RevenueTrendChart,
  DuesAgingCard,
  QuickInsights,
  ReportChartCard,
  PaymentMethodsChart,
  ReportPageHeader,
  StatusBreakdownCard,
  formatCurrency,
  exportCSV,
  CHART_COLORS,
} from "@/components/reports"
import { StatCard } from "@/components/ui/stat-card"
import { SummaryCard } from "@/components/ui/quick-stats-grid"
import { useReportsData } from "@/lib/hooks/useReportsData"

export default function ReportsPage() {
  const {
    loading,
    properties,
    reportData,
    dateRange,
    setDateRange,
    selectedProperty,
    setSelectedProperty,
  } = useReportsData()
  const { canPerformAction, getDemoMessage } = useDemoMode()
  const { isFeatureEnabled } = useFeatures()

  const handleExportCSV = (type: string) => {
    if (!reportData) return
    if (!isFeatureEnabled("reports", "csvExport")) return

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
          ["Revenue (Period)", formatCurrency(reportData.totalCollectedThisMonth)],
          ["Total Billed", formatCurrency(reportData.totalBilled)],
          ["Pending Dues", formatCurrency(reportData.totalPendingDues)],
          ["Overdue Amount", formatCurrency(reportData.overdueAmount)],
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
            formatCurrency(p.revenue),
            formatCurrency(Math.max(0, p.pendingDues)),
          ]),
        )
        break
      case "revenue":
        filename = "pg-manager-revenue-report.csv"
        rows.push(
          ["Month", "Collected", "Billed"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month,
            formatCurrency(m.collected),
            formatCurrency(m.billed),
          ]),
        )
        break
      case "aging":
        filename = "pg-manager-aging-report.csv"
        rows.push(
          ["Age Bucket", "Amount"],
          ["Current (Not Due)", formatCurrency(reportData.duesAging.current)],
          ["1-30 Days", formatCurrency(reportData.duesAging.days30)],
          ["31-60 Days", formatCurrency(reportData.duesAging.days60)],
          ["60+ Days", formatCurrency(reportData.duesAging.days90Plus)],
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
    <ModuleGuard module="reports">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatCard
          label="Occupancy Rate"
          value={`${reportData.occupancyRate.toFixed(1)}%`}
          subtitle={`${reportData.occupiedBeds}/${reportData.totalBeds} beds`}
          icon={Home}
          color={reportData.occupancyRate >= 80 ? "green" : reportData.occupancyRate >= 50 ? "amber" : "red"}
        />
        <StatCard
          label="Revenue Collected"
          value={formatCurrency(reportData.totalCollectedThisMonth)}
          subtitle={`${reportData.revenueGrowth >= 0 ? "+" : ""}${reportData.revenueGrowth.toFixed(1)}% vs last month`}
          icon={IndianRupee}
          color="green"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(reportData.totalExpensesThisMonth)}
          subtitle={`${reportData.expenseGrowth >= 0 ? "+" : ""}${reportData.expenseGrowth.toFixed(1)}% vs last month`}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          label="Net Income"
          value={formatCurrency(reportData.netIncome)}
          subtitle="Revenue - Expenses"
          icon={TrendingUp}
          color={reportData.netIncome >= 0 ? "green" : "red"}
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Tenants"
          value={reportData.activeTenants}
          subtitle={`+${reportData.newTenantsThisMonth} new`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Pending Dues"
          value={formatCurrency(reportData.totalPendingDues)}
          subtitle={`${formatCurrency(reportData.overdueAmount)} overdue`}
          icon={AlertCircle}
          color={reportData.totalPendingDues > 0 ? "red" : "green"}
        />
        <StatCard
          label="Rooms"
          value={reportData.totalRooms}
          subtitle={`${reportData.availableRooms} available`}
          icon={Building2}
          color="purple"
        />
        <StatCard
          label="Open Complaints"
          value={reportData.openComplaints}
          subtitle={`${reportData.resolvedThisMonth} resolved`}
          icon={Clock}
          color={reportData.openComplaints > 0 ? "amber" : "green"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <FeatureGate module="reports" feature="revenueReports">
          <RevenueTrendChart
            data={reportData.monthlyRevenue}
            onExport={() => handleExportCSV("revenue")}
            formatCurrency={formatCurrency}
          />
        </FeatureGate>
        <FeatureGate module="reports" feature="paymentAnalytics">
          <PaymentMethodsChart data={reportData.paymentMethods} />
        </FeatureGate>
      </div>

      {/* Expense by Category */}
      {reportData.expensesByCategory.length > 0 && (
        <ReportChartCard
          title="Expenses by Category"
          description="Top expense categories for the period"
        >
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={reportData.expensesByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value: number) => {
                  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
                  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
                  return `₹${value}`
                }} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]}>
                  {reportData.expensesByCategory.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
          <div className="h-[220px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={[
                  { name: "Paid", value: reportData.collectionEfficiency.onTime, fill: "hsl(var(--chart-1))" },
                  { name: "Late (1-30d)", value: reportData.collectionEfficiency.late, fill: "hsl(var(--chart-2))" },
                  { name: "Overdue (30d+)", value: reportData.collectionEfficiency.overdue, fill: "hsl(var(--chart-5))" },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={60} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[
                    { name: "Paid", fill: "hsl(var(--chart-1))" },
                    { name: "Late (1-30d)", fill: "hsl(var(--chart-2))" },
                    { name: "Overdue (30d+)", fill: "hsl(var(--chart-5))" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
        <div className="h-[250px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={reportData.propertyStats} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={55} tickFormatter={(value: number) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
                if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
                return `₹${value}`
              }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendingDues" name="Pending Dues" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatusBreakdownCard
          title="Room Status"
          items={[
            { label: "Occupied", value: reportData.occupiedRooms, color: "hsl(var(--success))" },
            { label: "Available", value: reportData.availableRooms, color: "hsl(var(--info))" },
            { label: "Maintenance", value: reportData.maintenanceRooms, color: "hsl(var(--warning))" },
          ]}
        />
        <SummaryCard
          title="Tenant Overview"
          value={reportData.activeTenants}
          sublabel="Active tenants"
          icon={Users}
          stats={[
            { label: "On Notice", value: reportData.tenantsOnNotice },
            { label: "New (Period)", value: `+${reportData.newTenantsThisMonth}` },
            { label: "Exits (Period)", value: `-${reportData.exitsThisMonth}` },
          ]}
        />
        <SummaryCard
          title="Complaints"
          value={reportData.openComplaints}
          sublabel="Open complaints"
          icon={AlertCircle}
          stats={[
            { label: "Resolved (Period)", value: reportData.resolvedThisMonth },
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
    </ModuleGuard>
  )
}
