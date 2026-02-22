"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { PageSkeleton } from "@/components/ui/loading"
import {
  Library,
  Users,
  Clock,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Armchair,
  UserPlus,
  UserMinus,
  Calendar,
  Timer,
} from "lucide-react"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { useDemoMode } from "@/lib/demo-mode"
import { transformJoin } from "@/lib/supabase/transforms"
import {
  QuickInsights,
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
  DAY_NAMES,
  exportCSV,
} from "@/components/reports"
import { StatCard } from "@/components/ui/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTodayISO } from "@/lib/date-helpers"

interface LibraryOption {
  id: string
  name: string
}

interface LibraryReportData {
  // Utilization
  totalSeats: number
  occupiedSeats: number
  availableSeats: number
  utilizationRate: number
  currentlyCheckedIn: number
  // Members
  totalMembers: number
  activeMembers: number
  expiredMembers: number
  newMembersThisMonth: number
  churnsThisMonth: number
  // Revenue
  totalRevenueThisMonth: number
  totalRevenueLastMonth: number
  revenueGrowth: number
  subscriptionRevenue: number
  lockerRevenue: number
  otherRevenue: number
  // Hours
  totalHoursUsed: number
  avgHoursPerMember: number
  hoursRemaining: number
  // Attendance
  totalCheckInsThisMonth: number
  avgDailyCheckIns: number
  peakHour: string
  peakDay: string
  // Monthly trends
  monthlyRevenue: { month: string; revenue: number; members: number }[]
  // Payment methods
  paymentMethods: { name: string; value: number; count: number }[]
  // Time slot distribution
  timeSlotDistribution: { slot: string; count: number; percentage: number }[]
  // Daily attendance (last 7 days)
  dailyAttendance: { date: string; checkIns: number }[]
  // Library-wise stats
  libraryStats: { id: string; name: string; totalSeats: number; activeMembers: number; revenue: number; checkIns: number }[]
}

export default function LibraryReportsPage() {
  const [loading, setLoading] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all")
  const [reportData, setReportData] = useState<LibraryReportData | null>(null)
  const { dateRange, setDateRange, startDate, endDate, lastMonthStart, lastMonthEnd } = useReportDateRange()
  const { canPerformAction, getDemoMessage } = useDemoMode()

  useEffect(() => {
    fetchReportData()
  }, [selectedLibrary, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch all required data in parallel
      const [
        librariesRes,
        seatsRes,
        membersRes,
        membershipsRes,
        paymentsRes,
        attendanceRes,
      ] = await Promise.all([
        supabase.from("libraries").select("id, name, total_seats, occupied_seats"),
        supabase.from("library_seats").select("id, section_id, status, section:library_sections!library_seats_section_id_fkey(library_id)"),
        supabase.from("library_members").select("id, library_id, status, hours_balance, hours_used, join_date, expiry_date, preferred_slot, created_at"),
        supabase.from("library_memberships").select("id, member_id, status, start_date, end_date, hours_included, hours_used, created_at, member:library_members!library_memberships_member_id_fkey(library_id)"),
        supabase.from("library_payments").select("id, member_id, amount, payment_type, payment_method, payment_date, member:library_members!library_payments_member_id_fkey(library_id)"),
        supabase.from("library_attendance").select("id, member_id, check_in_time, check_out_time, hours_spent, attendance_date, member:library_members!library_attendance_member_id_fkey(library_id)"),
      ])

      const librariesData = librariesRes.data || []
      const seatsData = (seatsRes.data || []).map((s: any) => ({
        ...s,
        section: transformJoin(s.section),
      }))
      const membersData = membersRes.data || []
      const membershipsData = (membershipsRes.data || []).map((m: any) => ({
        ...m,
        member: transformJoin(m.member),
      }))
      const paymentsData = (paymentsRes.data || []).map((p: any) => ({
        ...p,
        member: transformJoin(p.member),
      }))
      const attendanceData = (attendanceRes.data || []).map((a: any) => ({
        ...a,
        member: transformJoin(a.member),
      }))

      setLibraries(librariesData.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))

      // Filter by library if selected
      const filterByLibrary = (items: any[], libraryIdField: string = "library_id") => {
        if (selectedLibrary === "all") return items
        return items.filter((item) => {
          if (libraryIdField === "section.library_id") return item.section?.library_id === selectedLibrary
          if (libraryIdField === "member.library_id") return item.member?.library_id === selectedLibrary
          return item[libraryIdField] === selectedLibrary
        })
      }

      const filteredSeats = filterByLibrary(seatsData, "section.library_id")
      const filteredMembers = filterByLibrary(membersData)
      const filteredPayments = filterByLibrary(paymentsData, "member.library_id")
      const filteredAttendance = filterByLibrary(attendanceData, "member.library_id")

      const now = new Date()

      // Utilization
      const totalSeats = filteredSeats.length
      const occupiedSeats = filteredSeats.filter((s) => s.status === "occupied").length
      const availableSeats = filteredSeats.filter((s) => s.status === "available").length
      const utilizationRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

      const today = getTodayISO()
      const currentlyCheckedIn = filteredAttendance.filter(
        (a) => a.attendance_date === today && !a.check_out_time
      ).length

      // Members
      const totalMembers = filteredMembers.length
      const activeMembers = filteredMembers.filter((m) => m.status === "active").length
      const expiredMembers = filteredMembers.filter((m) => m.status === "expired").length
      const newMembersThisMonth = filteredMembers.filter((m) => {
        const createdAt = new Date(m.created_at)
        return createdAt >= startDate && createdAt <= endDate
      }).length
      const churnsThisMonth = filteredMembers.filter((m) => {
        if (!m.expiry_date) return false
        const expiry = new Date(m.expiry_date)
        return expiry >= startDate && expiry <= endDate && m.status === "expired"
      }).length

      // Revenue
      const periodPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= startDate && paymentDate <= endDate
      })
      const lastMonthPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd
      })
      const totalRevenueThisMonth = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const totalRevenueLastMonth = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const revenueGrowth = calculateGrowth(totalRevenueThisMonth, totalRevenueLastMonth)

      const subscriptionRevenue = periodPayments
        .filter((p) => p.payment_type === "subscription")
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const lockerRevenue = periodPayments
        .filter((p) => p.payment_type === "locker_rent" || p.payment_type === "locker_deposit")
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const otherRevenue = periodPayments
        .filter((p) => p.payment_type !== "subscription" && p.payment_type !== "locker_rent" && p.payment_type !== "locker_deposit")
        .reduce((sum, p) => sum + Number(p.amount), 0)

      // Hours
      const totalHoursUsed = filteredMembers.reduce((sum, m) => sum + Number(m.hours_used || 0), 0)
      const hoursRemaining = filteredMembers
        .filter((m) => m.status === "active")
        .reduce((sum, m) => sum + Number(m.hours_balance || 0), 0)
      const avgHoursPerMember = activeMembers > 0 ? totalHoursUsed / activeMembers : 0

      // Attendance
      const periodAttendance = filteredAttendance.filter((a) => {
        const date = new Date(a.attendance_date)
        return date >= startDate && date <= endDate
      })
      const totalCheckInsThisMonth = periodAttendance.length
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
      const avgDailyCheckIns = totalCheckInsThisMonth / daysInPeriod

      // Peak hour
      const hourCounts: Record<number, number> = {}
      periodAttendance.forEach((a) => {
        const hour = new Date(a.check_in_time).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })
      const peakHourNum = Object.entries(hourCounts).reduce(
        (max, [hour, count]) => (count > max.count ? { hour: Number(hour), count } : max),
        { hour: 0, count: 0 }
      ).hour
      const peakHour = peakHourNum >= 12 ? `${peakHourNum - 12 || 12} PM` : `${peakHourNum || 12} AM`

      // Peak day
      const dayCounts: Record<number, number> = {}
      periodAttendance.forEach((a) => {
        const day = new Date(a.attendance_date).getDay()
        dayCounts[day] = (dayCounts[day] || 0) + 1
      })
      const peakDayNum = Object.entries(dayCounts).reduce(
        (max, [day, count]) => (count > max.count ? { day: Number(day), count } : max),
        { day: 0, count: 0 }
      ).day
      const peakDay = DAY_NAMES[peakDayNum]

      // Monthly revenue trend (last 6 months)
      const monthlyRevenue = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthPayments = filteredPayments.filter((p) => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate >= monthStart && paymentDate <= monthEnd
        })
        const monthNewMembers = filteredMembers.filter((m) => {
          const createdAt = new Date(m.created_at)
          return createdAt >= monthStart && createdAt <= monthEnd
        }).length
        monthlyRevenue.push({
          month: MONTH_NAMES[monthStart.getMonth()],
          revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          members: monthNewMembers,
        })
      }

      // Payment method breakdown
      const paymentMethods = buildPaymentMethodBreakdown(periodPayments)

      // Time slot distribution
      const slotCounts: Record<string, number> = {}
      filteredMembers.forEach((m) => {
        const slot = m.preferred_slot || "Not Set"
        slotCounts[slot] = (slotCounts[slot] || 0) + 1
      })
      const totalSlotCount = Object.values(slotCounts).reduce((a: number, b: number) => a + b, 0)
      const timeSlotDistribution = Object.entries(slotCounts).map(([slot, count]) => ({
        slot,
        count,
        percentage: totalSlotCount > 0 ? (count / totalSlotCount) * 100 : 0,
      }))

      // Daily attendance (last 7 days)
      const dailyAttendance = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]
        const dayCheckIns = filteredAttendance.filter((a) => a.attendance_date === dateStr).length
        dailyAttendance.push({
          date: DAY_NAMES[date.getDay()],
          checkIns: dayCheckIns,
        })
      }

      // Library-wise stats
      const libraryStats = librariesData.map((library: { id: string; name: string; total_seats: number }) => {
        const libMembers = membersData.filter((m: { library_id: string }) => m.library_id === library.id)
        const libPayments = paymentsData.filter((p: { member?: { library_id: string } }) => p.member?.library_id === library.id)
        const libAttendance = attendanceData.filter((a: { member?: { library_id: string } }) => a.member?.library_id === library.id)

        const libPeriodPayments = libPayments.filter((p: { payment_date: string }) => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate >= startDate && paymentDate <= endDate
        })
        const libPeriodAttendance = libAttendance.filter((a: { attendance_date: string }) => {
          const date = new Date(a.attendance_date)
          return date >= startDate && date <= endDate
        })

        return {
          id: library.id,
          name: library.name,
          totalSeats: library.total_seats,
          activeMembers: libMembers.filter((m: { status: string }) => m.status === "active").length,
          revenue: libPeriodPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
          checkIns: libPeriodAttendance.length,
        }
      })

      setReportData({
        totalSeats, occupiedSeats, availableSeats, utilizationRate, currentlyCheckedIn,
        totalMembers, activeMembers, expiredMembers, newMembersThisMonth, churnsThisMonth,
        totalRevenueThisMonth, totalRevenueLastMonth, revenueGrowth,
        subscriptionRevenue, lockerRevenue, otherRevenue,
        totalHoursUsed, avgHoursPerMember, hoursRemaining,
        totalCheckInsThisMonth, avgDailyCheckIns, peakHour, peakDay,
        monthlyRevenue, paymentMethods, timeSlotDistribution, dailyAttendance, libraryStats,
      })
    } catch (error) {
      console.error("Error fetching library report data:", error)
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
        filename = "library-summary-report.csv"
        rows.push(
          ["Metric", "Value"],
          ["Total Seats", reportData.totalSeats],
          ["Occupied Seats", reportData.occupiedSeats],
          ["Available Seats", reportData.availableSeats],
          ["Utilization Rate", `${reportData.utilizationRate.toFixed(1)}%`],
          ["Active Members", reportData.activeMembers],
          ["New Members (Period)", reportData.newMembersThisMonth],
          ["Revenue (Period)", formatCurrency(reportData.totalRevenueThisMonth)],
          ["Total Hours Used", reportData.totalHoursUsed.toFixed(1)],
          ["Total Check-ins (Period)", reportData.totalCheckInsThisMonth],
        )
        break
      case "libraries":
        filename = "library-performance-report.csv"
        rows.push(
          ["Library", "Total Seats", "Active Members", "Revenue", "Check-ins"],
          ...reportData.libraryStats.map((l) => [
            l.name, l.totalSeats, l.activeMembers,
            formatCurrency(l.revenue), l.checkIns,
          ]),
        )
        break
      case "revenue":
        filename = "library-revenue-report.csv"
        rows.push(
          ["Month", "Revenue", "New Members"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month, formatCurrency(m.revenue), m.members,
          ]),
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
    <FeatureGuard feature="library">
      <PermissionGuard permission="library.view">
        <div className="space-y-6">
          <ReportPageHeader
            title="Library Reports"
            description="Insights and analytics for your study library"
            breadcrumbLabel="Library Reports"
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            filterOptions={libraries}
            filterValue={selectedLibrary}
            onFilterChange={setSelectedLibrary}
            filterAllLabel="All Libraries"
            onExport={() => handleExportCSV("summary")}
          />

          {/* KPI Cards - Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <StatCard
              label="Seat Utilization"
              value={`${reportData.utilizationRate.toFixed(1)}%`}
              subtitle={`${reportData.occupiedSeats}/${reportData.totalSeats} seats`}
              icon={Armchair}
              color={reportData.utilizationRate >= 80 ? "green" : reportData.utilizationRate >= 50 ? "amber" : "red"}
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(reportData.totalRevenueThisMonth)}
              subtitle={`${reportData.revenueGrowth >= 0 ? "+" : ""}${reportData.revenueGrowth.toFixed(1)}% vs last month`}
              icon={IndianRupee}
              color="green"
            />
            <StatCard
              label="Active Members"
              value={reportData.activeMembers}
              subtitle={`+${reportData.newMembersThisMonth} new`}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Studying Now"
              value={reportData.currentlyCheckedIn}
              subtitle={`${reportData.availableSeats} seats free`}
              icon={Library}
              color="purple"
            />
          </div>

          {/* KPI Cards - Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <StatCard
              label="Hours Consumed"
              value={`${reportData.totalHoursUsed.toFixed(0)}h`}
              subtitle={`Avg ${reportData.avgHoursPerMember.toFixed(1)}h/member`}
              icon={Timer}
              color="purple"
            />
            <StatCard
              label="Check-ins"
              value={reportData.totalCheckInsThisMonth}
              subtitle={`Avg ${reportData.avgDailyCheckIns.toFixed(1)}/day`}
              icon={Clock}
              color="amber"
            />
            <StatCard
              label="Peak Hour"
              value={reportData.peakHour}
              subtitle={`Busiest: ${reportData.peakDay}`}
              icon={Calendar}
              color="rose"
            />
            <StatCard
              label="Hours Balance"
              value={`${reportData.hoursRemaining.toFixed(0)}h`}
              subtitle="Active members"
              icon={CheckCircle}
              color="green"
            />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Trend Chart (Library-specific with dual axis) */}
            <ReportChartCard
              title="Revenue Trend"
              description="Revenue & new members (Last 6 months)"
              onExport={() => handleExportCSV("revenue")}
            >
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.monthlyRevenue}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      width={70}
                      tickFormatter={(value: number) => {
                        if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(1)}Cr`
                        if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`
                        if (value >= 1000) return `\u20B9${(value / 1000).toFixed(0)}k`
                        return `\u20B9${value}`
                      }}
                    />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue" ? formatCurrency(Number(value)) : value,
                        name === "revenue" ? "Revenue" : "New Members",
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ fill: "#6366F1", strokeWidth: 2 }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="members"
                      name="New Members"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ReportChartCard>

            <PaymentMethodsChart
              data={reportData.paymentMethods}
              colors={["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]}
            />
          </div>

          {/* Daily Attendance & Time Slots */}
          <div className="grid md:grid-cols-2 gap-6">
            <ReportChartCard
              title="Daily Attendance"
              description="Check-ins over the last 7 days"
            >
              <div className="h-[180px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.dailyAttendance}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="checkIns" name="Check-ins" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportChartCard>

            {/* Time Slot Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Slot Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.timeSlotDistribution.map((slot, index) => (
                    <div key={slot.slot} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{slot.slot}</span>
                        <span className="text-muted-foreground">
                          {slot.count} members ({slot.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${slot.percentage}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <ReportChartCard
            title="Revenue Breakdown"
            description="Revenue by category"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-600 font-medium">Subscriptions</p>
                <p className="text-2xl font-bold text-indigo-700">{formatCurrency(reportData.subscriptionRevenue)}</p>
                <p className="text-xs text-indigo-500">
                  {reportData.totalRevenueThisMonth > 0
                    ? ((reportData.subscriptionRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Lockers</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.lockerRevenue)}</p>
                <p className="text-xs text-purple-500">
                  {reportData.totalRevenueThisMonth > 0
                    ? ((reportData.lockerRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-4 bg-warning/10 rounded-lg">
                <p className="text-sm text-warning font-medium">Other</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(reportData.otherRevenue)}</p>
                <p className="text-xs text-warning/80">
                  {reportData.totalRevenueThisMonth > 0
                    ? ((reportData.otherRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </ReportChartCard>

          {/* Library Performance */}
          {reportData.libraryStats.length > 0 && (
            <ReportChartCard
              title="Library Performance"
              description="Comparison across libraries"
              onExport={() => handleExportCSV("libraries")}
              exportLabel="Export"
            >
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.libraryStats} margin={{ bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 12 }} width={70} tickFormatter={(value: number) => {
                      if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(1)}Cr`
                      if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`
                      if (value >= 1000) return `\u20B9${(value / 1000).toFixed(0)}k`
                      return `\u20B9${value}`
                    }} />
                    <Tooltip formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(Number(value)) : value,
                      name === "revenue" ? "Revenue" : name === "activeMembers" ? "Active Members" : "Check-ins"
                    ]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportChartCard>
          )}

          {/* Member Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <StatusBreakdownCard
              title="Member Status"
              items={[
                { label: "Active", value: reportData.activeMembers, color: "#22c55e" },
                { label: "Expired", value: reportData.expiredMembers, color: "#eab308" },
                { label: "Total", value: reportData.totalMembers, color: "#3b82f6" },
              ]}
            />

            {/* Member Flow - unique to library */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Member Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-success" />
                      <span className="text-sm">New Members</span>
                    </div>
                    <span className="font-medium text-success">+{reportData.newMembersThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Churned</span>
                    </div>
                    <span className="font-medium text-destructive">-{reportData.churnsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Net Change</span>
                    <span className={`font-bold ${reportData.newMembersThisMonth - reportData.churnsThisMonth >= 0 ? "text-success" : "text-destructive"}`}>
                      {reportData.newMembersThisMonth - reportData.churnsThisMonth >= 0 ? "+" : ""}
                      {reportData.newMembersThisMonth - reportData.churnsThisMonth}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <StatusBreakdownCard
              title="Seat Status"
              items={[
                { label: "Occupied", value: reportData.occupiedSeats, color: "#ef4444" },
                { label: "Available", value: reportData.availableSeats, color: "#22c55e" },
              ]}
              summary={{ label: "Total Seats", value: reportData.totalSeats }}
            />
          </div>

          {/* Quick Insights */}
          <QuickInsights
            insights={[
              {
                id: "low-utilization",
                title: "Low Utilization",
                message: `Only ${reportData.utilizationRate.toFixed(1)}% seats utilized. Consider marketing or promotions.`,
                icon: AlertCircle,
                type: "warning",
                condition: reportData.utilizationRate < 50,
              },
              {
                id: "revenue-growing",
                title: "Revenue Growing",
                message: `Revenue increased by ${reportData.revenueGrowth.toFixed(1)}% compared to last month!`,
                icon: TrendingUp,
                type: "success",
                condition: reportData.revenueGrowth > 10,
              },
              {
                id: "positive-member-growth",
                title: "Positive Member Growth",
                message: `Net gain of ${reportData.newMembersThisMonth - reportData.churnsThisMonth} members this period.`,
                icon: Users,
                type: "info",
                condition: reportData.newMembersThisMonth > reportData.churnsThisMonth,
              },
              {
                id: "expired-memberships",
                title: "Expired Memberships",
                message: `${reportData.expiredMembers} members with expired subscriptions. Consider renewal reminders.`,
                icon: Clock,
                type: "warning",
                condition: reportData.expiredMembers > 0,
              },
              {
                id: "high-utilization",
                title: "High Utilization",
                message: `Excellent! ${reportData.utilizationRate.toFixed(1)}% utilization. Consider expanding capacity.`,
                icon: CheckCircle,
                type: "success",
                condition: reportData.utilizationRate >= 90,
              },
            ]}
          />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
