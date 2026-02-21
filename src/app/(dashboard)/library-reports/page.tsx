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
  Download,
  BarChart3,
  Armchair,
  UserPlus,
  UserMinus,
  Calendar,
  Timer,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { useDemoMode } from "@/lib/demo-mode"
import { transformJoin } from "@/lib/supabase/transforms"
import { showError } from "@/lib/toast-helpers"

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
  monthlyRevenue: {
    month: string
    revenue: number
    members: number
  }[]

  // Payment methods
  paymentMethods: {
    name: string
    value: number
    count: number
  }[]

  // Time slot distribution
  timeSlotDistribution: {
    slot: string
    count: number
    percentage: number
  }[]

  // Daily attendance (last 7 days)
  dailyAttendance: {
    date: string
    checkIns: number
  }[]

  // Library-wise stats
  libraryStats: {
    id: string
    name: string
    totalSeats: number
    activeMembers: number
    revenue: number
    checkIns: number
  }[]
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const CHART_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

// Default date range: This month
function getDefaultDateRange(): DateRange {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: start, to: now, label: "This month" }
}

export default function LibraryReportsPage() {
  const [loading, setLoading] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all")
  const [reportData, setReportData] = useState<LibraryReportData | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const { canPerformAction, getDemoMessage } = useDemoMode()

  useEffect(() => {
    fetchReportData()
  }, [selectedLibrary, dateRange])

  const getDateRange = () => {
    return { startDate: dateRange.from, endDate: dateRange.to }
  }

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { startDate, endDate } = getDateRange()

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
          if (libraryIdField === "section.library_id") {
            return item.section?.library_id === selectedLibrary
          }
          if (libraryIdField === "member.library_id") {
            return item.member?.library_id === selectedLibrary
          }
          return item[libraryIdField] === selectedLibrary
        })
      }

      const filteredSeats = filterByLibrary(seatsData, "section.library_id")
      const filteredMembers = filterByLibrary(membersData)
      const filteredPayments = filterByLibrary(paymentsData, "member.library_id")
      const filteredAttendance = filterByLibrary(attendanceData, "member.library_id")

      // Date calculations
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      // Utilization calculations
      const totalSeats = filteredSeats.length
      const occupiedSeats = filteredSeats.filter((s) => s.status === "occupied").length
      const availableSeats = filteredSeats.filter((s) => s.status === "available").length
      const utilizationRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

      // Currently checked in (attendance with no check_out_time today)
      const today = new Date().toISOString().split("T")[0]
      const currentlyCheckedIn = filteredAttendance.filter(
        (a) => a.attendance_date === today && !a.check_out_time
      ).length

      // Member calculations
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

      // Revenue calculations
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
      const revenueGrowth = totalRevenueLastMonth > 0
        ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100
        : 0

      const subscriptionRevenue = periodPayments
        .filter((p) => p.payment_type === "subscription")
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const lockerRevenue = periodPayments
        .filter((p) => p.payment_type === "locker_rent" || p.payment_type === "locker_deposit")
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const otherRevenue = periodPayments
        .filter((p) => p.payment_type !== "subscription" && p.payment_type !== "locker_rent" && p.payment_type !== "locker_deposit")
        .reduce((sum, p) => sum + Number(p.amount), 0)

      // Hours calculations
      const totalHoursUsed = filteredMembers.reduce((sum, m) => sum + Number(m.hours_used || 0), 0)
      const hoursRemaining = filteredMembers
        .filter((m) => m.status === "active")
        .reduce((sum, m) => sum + Number(m.hours_balance || 0), 0)
      const avgHoursPerMember = activeMembers > 0 ? totalHoursUsed / activeMembers : 0

      // Attendance calculations
      const periodAttendance = filteredAttendance.filter((a) => {
        const date = new Date(a.attendance_date)
        return date >= startDate && date <= endDate
      })
      const totalCheckInsThisMonth = periodAttendance.length
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
      const avgDailyCheckIns = totalCheckInsThisMonth / daysInPeriod

      // Peak hour calculation
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

      // Peak day calculation
      const dayCounts: Record<number, number> = {}
      periodAttendance.forEach((a) => {
        const day = new Date(a.attendance_date).getDay()
        dayCounts[day] = (dayCounts[day] || 0) + 1
      })
      const peakDayNum = Object.entries(dayCounts).reduce(
        (max, [day, count]) => (count > max.count ? { day: Number(day), count } : max),
        { day: 0, count: 0 }
      ).day
      const peakDay = dayNames[peakDayNum]

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
          month: monthNames[monthStart.getMonth()],
          revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          members: monthNewMembers,
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
        paytm: "Paytm",
        other: "Other",
      }

      const paymentMethods = Object.entries(methodCounts).map(([method, data]) => ({
        name: methodLabels[method] || method,
        value: data.amount,
        count: data.count,
      }))

      // Time slot distribution
      const slotCounts: Record<string, number> = {}
      filteredMembers.forEach((m) => {
        const slot = m.preferred_slot || "Not Set"
        slotCounts[slot] = (slotCounts[slot] || 0) + 1
      })
      const totalSlotCount = Object.values(slotCounts).reduce((a, b) => a + b, 0)
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
          date: dayNames[date.getDay()],
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
        totalSeats,
        occupiedSeats,
        availableSeats,
        utilizationRate,
        currentlyCheckedIn,
        totalMembers,
        activeMembers,
        expiredMembers,
        newMembersThisMonth,
        churnsThisMonth,
        totalRevenueThisMonth,
        totalRevenueLastMonth,
        revenueGrowth,
        subscriptionRevenue,
        lockerRevenue,
        otherRevenue,
        totalHoursUsed,
        avgHoursPerMember,
        hoursRemaining,
        totalCheckInsThisMonth,
        avgDailyCheckIns,
        peakHour,
        peakDay,
        monthlyRevenue,
        paymentMethods,
        timeSlotDistribution,
        dailyAttendance,
        libraryStats,
      })
    } catch (error) {
      console.error("Error fetching library report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (type: string) => {
    if (!reportData) return

    if (!canPerformAction("export_data")) {
      showError(getDemoMessage("export_data"))
      return
    }

    let csvContent = ""
    let filename = ""

    switch (type) {
      case "summary":
        filename = "library-summary-report.csv"
        csvContent = [
          ["Metric", "Value"],
          ["Total Seats", reportData.totalSeats],
          ["Occupied Seats", reportData.occupiedSeats],
          ["Available Seats", reportData.availableSeats],
          ["Utilization Rate", `${reportData.utilizationRate.toFixed(1)}%`],
          ["Active Members", reportData.activeMembers],
          ["New Members (Period)", reportData.newMembersThisMonth],
          ["Revenue (Period)", `₹${reportData.totalRevenueThisMonth.toLocaleString("en-IN")}`],
          ["Total Hours Used", reportData.totalHoursUsed.toFixed(1)],
          ["Total Check-ins (Period)", reportData.totalCheckInsThisMonth],
        ].map((row) => row.join(",")).join("\n")
        break

      case "libraries":
        filename = "library-performance-report.csv"
        csvContent = [
          ["Library", "Total Seats", "Active Members", "Revenue", "Check-ins"],
          ...reportData.libraryStats.map((l) => [
            l.name,
            l.totalSeats,
            l.activeMembers,
            `₹${l.revenue.toLocaleString("en-IN")}`,
            l.checkIns,
          ]),
        ].map((row) => row.join(",")).join("\n")
        break

      case "revenue":
        filename = "library-revenue-report.csv"
        csvContent = [
          ["Month", "Revenue", "New Members"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month,
            `₹${m.revenue.toLocaleString("en-IN")}`,
            m.members,
          ]),
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
          <PageHeader
            title="Library Reports"
            description="Insights and analytics for your study library"
            icon={BarChart3}
            breadcrumbs={[{ label: "Library Reports" }]}
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
                <select
                  value={selectedLibrary}
                  onChange={(e) => setSelectedLibrary(e.target.value)}
                  className="h-10 px-3 rounded-md border border-input bg-white text-sm"
                >
                  <option value="all">All Libraries</option>
                  {libraries.map((library) => (
                    <option key={library.id} value={library.id}>
                      {library.name}
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
            {/* Utilization Rate */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Seat Utilization</p>
                    <p className="text-2xl font-bold">{reportData.utilizationRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {reportData.occupiedSeats}/{reportData.totalSeats} seats
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${reportData.utilizationRate >= 80 ? "bg-green-100" : reportData.utilizationRate >= 50 ? "bg-yellow-100" : "bg-red-100"}`}>
                    <Armchair className={`h-5 w-5 ${reportData.utilizationRate >= 80 ? "text-green-600" : reportData.utilizationRate >= 50 ? "text-yellow-600" : "text-red-600"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(reportData.totalRevenueThisMonth)}</p>
                    <div className={`flex items-center text-xs ${reportData.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {reportData.revenueGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
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

            {/* Active Members */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{reportData.activeMembers}</p>
                    <p className="text-xs text-green-600">
                      +{reportData.newMembersThisMonth} new
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Currently Checked In */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Studying Now</p>
                    <p className="text-2xl font-bold">{reportData.currentlyCheckedIn}</p>
                    <p className="text-xs text-muted-foreground">
                      {reportData.availableSeats} seats free
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-indigo-100">
                    <Library className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards - Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Hours Used */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Consumed</p>
                    <p className="text-2xl font-bold">{reportData.totalHoursUsed.toFixed(0)}h</p>
                    <p className="text-xs text-muted-foreground">
                      Avg {reportData.avgHoursPerMember.toFixed(1)}h/member
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Timer className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-ins */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-ins</p>
                    <p className="text-2xl font-bold">{reportData.totalCheckInsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg {reportData.avgDailyCheckIns.toFixed(1)}/day
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peak Time */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Peak Hour</p>
                    <p className="text-2xl font-bold">{reportData.peakHour}</p>
                    <p className="text-xs text-muted-foreground">
                      Busiest: {reportData.peakDay}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-rose-100">
                    <Calendar className="h-5 w-5 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours Remaining */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Balance</p>
                    <p className="text-2xl font-bold">{reportData.hoursRemaining.toFixed(0)}h</p>
                    <p className="text-xs text-muted-foreground">
                      Active members
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-teal-100">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
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
                    <CardDescription>Revenue & new members (Last 6 months)</CardDescription>
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
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue" ? `₹${Number(value).toLocaleString("en-IN")}` : value,
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

          {/* Daily Attendance & Time Slots */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Attendance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Attendance</CardTitle>
                <CardDescription>Check-ins over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.dailyAttendance}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="checkIns" name="Check-ins" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Slot Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Slot Preferences</CardTitle>
                <CardDescription>Member distribution by preferred slot</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
              <CardDescription>Revenue by category</CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600 font-medium">Other</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(reportData.otherRevenue)}</p>
                  <p className="text-xs text-amber-500">
                    {reportData.totalRevenueThisMonth > 0
                      ? ((reportData.otherRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Library Performance */}
          {reportData.libraryStats.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Library Performance</CardTitle>
                    <CardDescription>Comparison across libraries</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => exportToCSV("libraries")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.libraryStats}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(Number(value)) : value,
                      name === "revenue" ? "Revenue" : name === "activeMembers" ? "Active Members" : "Check-ins"
                    ]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Member Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Member Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Member Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Active</span>
                    </div>
                    <span className="font-medium">{reportData.activeMembers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Expired</span>
                    </div>
                    <span className="font-medium">{reportData.expiredMembers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Total</span>
                    </div>
                    <span className="font-medium">{reportData.totalMembers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Member Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-500" />
                      <span className="text-sm">New Members</span>
                    </div>
                    <span className="font-medium text-green-600">+{reportData.newMembersThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Churned</span>
                    </div>
                    <span className="font-medium text-red-600">-{reportData.churnsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Net Change</span>
                    <span className={`font-bold ${reportData.newMembersThisMonth - reportData.churnsThisMonth >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {reportData.newMembersThisMonth - reportData.churnsThisMonth >= 0 ? "+" : ""}
                      {reportData.newMembersThisMonth - reportData.churnsThisMonth}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seat Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seat Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Occupied</span>
                    </div>
                    <span className="font-medium">{reportData.occupiedSeats}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Available</span>
                    </div>
                    <span className="font-medium">{reportData.availableSeats}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total Seats</span>
                    <span className="font-bold">{reportData.totalSeats}</span>
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
                {reportData.utilizationRate < 50 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Low Utilization</p>
                      <p className="text-sm text-yellow-700">
                        Only {reportData.utilizationRate.toFixed(1)}% seats utilized. Consider marketing or promotions.
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
                        Revenue increased by {reportData.revenueGrowth.toFixed(1)}% compared to last month!
                      </p>
                    </div>
                  </div>
                )}
                {reportData.newMembersThisMonth > reportData.churnsThisMonth && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Positive Member Growth</p>
                      <p className="text-sm text-blue-700">
                        Net gain of {reportData.newMembersThisMonth - reportData.churnsThisMonth} members this period.
                      </p>
                    </div>
                  </div>
                )}
                {reportData.expiredMembers > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Expired Memberships</p>
                      <p className="text-sm text-orange-700">
                        {reportData.expiredMembers} members with expired subscriptions. Consider renewal reminders.
                      </p>
                    </div>
                  </div>
                )}
                {reportData.utilizationRate >= 90 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">High Utilization</p>
                      <p className="text-sm text-green-700">
                        Excellent! {reportData.utilizationRate.toFixed(1)}% utilization. Consider expanding capacity.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
