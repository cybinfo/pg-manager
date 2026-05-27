"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
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
  AlertCircle,
  CheckCircle,
  Armchair,
  UserPlus,
  UserMinus,
  Calendar,
  Timer,
  CreditCard,
  Receipt,
  ArrowUpDown,
} from "lucide-react"
import { PermissionGuard, ModuleGuard } from "@/components/auth"
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
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { formatCurrencyTick } from "@/lib/format"
import { getWeekNumber, formatPeriodLabel, getPeriodKey, type GroupByPeriod } from "@/lib/report-utils"


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

// ============================================================================
// Payment Report Types
// ============================================================================

interface PaymentReportData {
  totalCollections: number
  paymentCount: number
  avgPaymentAmount: number
  outstanding: number
  revenueByPeriod: {
    period: string
    subscriptionAmount: number
    lockerAmount: number
    otherAmount: number
    total: number
    count: number
  }[]
  paymentMethodBreakdown: { name: string; value: number; count: number }[]
  topMembers: {
    memberName: string
    memberCode: string
    totalPaid: number
    paymentCount: number
    avgAmount: number
  }[]
}

// ============================================================================
// Main Component
// ============================================================================

export default function LibraryReportsPage() {
  const [loading, setLoading] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all")
  const [reportData, setReportData] = useState<LibraryReportData | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "payments">("overview")
  const { dateRange, setDateRange, startDate, endDate, lastMonthStart, lastMonthEnd } = useReportDateRange()
  const { canPerformAction, getDemoMessage } = useDemoMode()

  // Payment report state
  const [paymentGroupBy, setPaymentGroupBy] = useState<GroupByPeriod>("month")
  const [paymentReportData, setPaymentReportData] = useState<PaymentReportData | null>(null)
  const [paymentReportLoading, setPaymentReportLoading] = useState(false)
  const [paymentSortColumn, setPaymentSortColumn] = useState<string>("period")
  const [paymentSortDirection, setPaymentSortDirection] = useState<"asc" | "desc">("asc")
  const [topMembersSortColumn, setTopMembersSortColumn] = useState<string>("totalPaid")
  const [topMembersSortDirection, setTopMembersSortDirection] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    fetchReportData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibrary, dateRange])

  // Lazy load payment report data when tab activates
  useEffect(() => {
    if (activeTab === "payments" && !paymentReportData && !paymentReportLoading) {
      fetchPaymentReportData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Refetch payment report when filters change (if tab is active)
  useEffect(() => {
    if (activeTab === "payments") {
      fetchPaymentReportData()
    } else {
      // Invalidate so next tab switch refetches
      setPaymentReportData(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibrary, dateRange, paymentGroupBy])

  // Paginated fetch to bypass Supabase max-rows-per-request limit (default 1000)
  const fetchAllRows = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: ReturnType<ReturnType<typeof createClient>["from"]> & { range: (...args: unknown[]) => any },
    pageSize = 1000
  ): Promise<{ data: Record<string, unknown>[]; error: Error | null }> => {
    const allData: Record<string, unknown>[] = []
    let from = 0
    let hasMore = true
    let lastError: Error | null = null
    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1) as { data: Record<string, unknown>[] | null; error: Error | null }
      if (error) { lastError = error; break }
      if (!data || data.length === 0) { hasMore = false; break }
      allData.push(...data)
      if (data.length < pageSize) { hasMore = false; break }
      from += pageSize
    }
    return { data: allData, error: lastError }
  }

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch all required data in parallel with pagination
      const [
        librariesRes,
        seatsRes,
        membersRes,
        membershipsRes,
        paymentsRes,
        attendanceRes,
      ] = await Promise.all([
        supabase.from("libraries").select("id, name, total_seats, occupied_seats"),
        fetchAllRows(supabase.from("library_seats").select("id, section_id, status, section:library_sections!library_seats_section_id_fkey(library_id)")),
        fetchAllRows(supabase.from("library_members").select("id, library_id, status, hours_balance, hours_used, join_date, expiry_date, preferred_slot, created_at")),
        fetchAllRows(supabase.from("library_memberships").select("id, member_id, status, start_date, end_date, hours_included, hours_used, created_at, member:library_members!library_memberships_member_id_fkey(library_id)")),
        fetchAllRows(supabase.from("library_payments").select("id, member_id, amount, payment_type, payment_method, payment_date, member:library_members!library_payments_member_id_fkey(library_id)")),
        fetchAllRows(supabase.from("library_attendance").select("id, member_id, check_in_time, check_out_time, hours_spent, attendance_date, member:library_members!library_attendance_member_id_fkey(library_id)")),
      ])

      const librariesData = librariesRes.data || []
      const seatsData = (seatsRes.data || []).map((s: Record<string, unknown>) => ({
        ...s,
        section: transformJoin(s.section),
      }))
      const membersData = membersRes.data || []
      const paymentsData = (paymentsRes.data || []).map((p: Record<string, unknown>) => ({
        ...p,
        member: transformJoin(p.member),
      }))
      const attendanceData = (attendanceRes.data || []).map((a: Record<string, unknown>) => ({
        ...a,
        member: transformJoin(a.member),
      }))

      setLibraries(librariesData.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))

      // Filter by library if selected
      const filterByLibrary = (items: Record<string, unknown>[], libraryIdField: string = "library_id") => {
        if (selectedLibrary === "all") return items
        return items.filter((item) => {
          if (libraryIdField === "section.library_id") return (item.section as Record<string, unknown>)?.library_id === selectedLibrary
          if (libraryIdField === "member.library_id") return (item.member as Record<string, unknown>)?.library_id === selectedLibrary
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
        const joinDate = new Date((m.join_date || m.created_at) as string)
        return joinDate >= startDate && joinDate <= endDate
      }).length
      const churnsThisMonth = filteredMembers.filter((m) => {
        if (!m.expiry_date) return false
        const expiry = new Date(m.expiry_date as string)
        return expiry >= startDate && expiry <= endDate && m.status === "expired"
      }).length

      // Revenue
      const periodPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date as string)
        return paymentDate >= startDate && paymentDate <= endDate
      })
      const lastMonthPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date as string)
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
        const date = new Date(a.attendance_date as string)
        return date >= startDate && date <= endDate
      })
      const totalCheckInsThisMonth = periodAttendance.length
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
      const avgDailyCheckIns = totalCheckInsThisMonth / daysInPeriod

      // Peak hour
      const hourCounts: Record<number, number> = {}
      periodAttendance.forEach((a) => {
        const hour = new Date(a.check_in_time as string).getHours()
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
        const day = new Date(a.attendance_date as string).getDay()
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
          const paymentDate = new Date(p.payment_date as string)
          return paymentDate >= monthStart && paymentDate <= monthEnd
        })
        const monthNewMembers = filteredMembers.filter((m) => {
          const joinDate = new Date((m.join_date || m.created_at) as string)
          return joinDate >= monthStart && joinDate <= monthEnd
        }).length
        monthlyRevenue.push({
          month: MONTH_NAMES[monthStart.getMonth()],
          revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          members: monthNewMembers,
        })
      }

      // Payment method breakdown
      const paymentMethods = buildPaymentMethodBreakdown(periodPayments as Array<{ payment_method?: string; amount: number | string }>)

      // Time slot distribution
      const slotCounts: Record<string, number> = {}
      filteredMembers.forEach((m) => {
        const slot = (m.preferred_slot as string) || "Not Set"
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
        const libMembers = membersData.filter((m) => m.library_id === library.id)
        const libPayments = paymentsData.filter((p) => (p.member as Record<string, unknown>)?.library_id === library.id)
        const libAttendance = attendanceData.filter((a) => (a.member as Record<string, unknown>)?.library_id === library.id)

        const libPeriodPayments = libPayments.filter((p) => {
          const paymentDate = new Date((p as Record<string, unknown>).payment_date as string)
          return paymentDate >= startDate && paymentDate <= endDate
        })
        const libPeriodAttendance = libAttendance.filter((a) => {
          const date = new Date((a as Record<string, unknown>).attendance_date as string)
          return date >= startDate && date <= endDate
        })

        return {
          id: library.id,
          name: library.name,
          totalSeats: library.total_seats,
          activeMembers: libMembers.filter((m) => m.status === "active").length,
          revenue: libPeriodPayments.reduce((sum: number, p) => sum + Number((p as Record<string, unknown>).amount), 0),
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
      logger.error("Error fetching library report data:", { detail: error })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Payment Report Data Fetching
  // ============================================================================

  const fetchPaymentReportData = async () => {
    setPaymentReportLoading(true)
    const supabase = createClient()

    try {
      const [paymentsRes, membersRes, membershipsRes] = await Promise.all([
        fetchAllRows(supabase.from("library_payments").select(
          "id, member_id, amount, payment_type, payment_method, payment_date, member:library_members!library_payments_member_id_fkey(id, library_id, name, member_code)"
        )),
        fetchAllRows(supabase.from("library_members").select("id, library_id, status")),
        fetchAllRows(supabase.from("library_memberships").select(
          "id, member_id, final_amount, status, member:library_members!library_memberships_member_id_fkey(library_id)"
        )),
      ])

      const paymentsData = (paymentsRes.data || []).map((p: Record<string, unknown>) => ({
        ...p,
        member: transformJoin(p.member),
      }))
      const membersData = membersRes.data || []
      const membershipsData = (membershipsRes.data || []).map((m: Record<string, unknown>) => ({
        ...m,
        member: transformJoin(m.member),
      }))

      // Filter by library
      const filterByLibrary = (items: Record<string, unknown>[], field: string = "library_id") => {
        if (selectedLibrary === "all") return items
        return items.filter((item) => {
          if (field === "member.library_id") return (item.member as Record<string, unknown>)?.library_id === selectedLibrary
          return item[field] === selectedLibrary
        })
      }

      const filteredPayments = filterByLibrary(paymentsData, "member.library_id")
      const filteredMembers = filterByLibrary(membersData)
      const filteredMemberships = filterByLibrary(membershipsData, "member.library_id")

      // Period payments
      const periodPayments = filteredPayments.filter((p: Record<string, unknown>) => {
        const paymentDate = new Date(p.payment_date as string)
        return paymentDate >= startDate && paymentDate <= endDate
      })

      // KPIs
      const totalCollections = periodPayments.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0)
      const paymentCount = periodPayments.length
      const avgPaymentAmount = paymentCount > 0 ? totalCollections / paymentCount : 0

      // Outstanding: sum of (final_amount - linked payments) for active memberships
      const activeMembers = filteredMembers.filter((m: Record<string, unknown>) => m.status === "active")
      const activeMemberIds = new Set(activeMembers.map((m: Record<string, unknown>) => m.id as string))
      const activeMemberships = filteredMemberships.filter(
        (ms: Record<string, unknown>) => ms.status === "active" && activeMemberIds.has(ms.member_id as string)
      )
      const totalSubscriptionFees = activeMemberships.reduce(
        (sum: number, ms: Record<string, unknown>) => sum + Number(ms.final_amount || 0), 0
      )
      // Total payments by active members for subscriptions
      const activeSubPayments = filteredPayments.filter(
        (p: Record<string, unknown>) => activeMemberIds.has(p.member_id as string) && p.payment_type === "subscription"
      )
      const totalPaidByActive = activeSubPayments.reduce(
        (sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0
      )
      const outstanding = Math.max(0, totalSubscriptionFees - totalPaidByActive)

      // Revenue grouped by period
      const periodMap: Record<string, {
        period: string
        label: string
        sortKey: string
        subscriptionAmount: number
        lockerAmount: number
        otherAmount: number
        total: number
        count: number
      }> = {}

      periodPayments.forEach((p: Record<string, unknown>) => {
        const date = new Date(p.payment_date as string)
        const key = getPeriodKey(date, paymentGroupBy)
        if (!periodMap[key]) {
          periodMap[key] = {
            period: formatPeriodLabel(date, paymentGroupBy),
            label: formatPeriodLabel(date, paymentGroupBy),
            sortKey: key,
            subscriptionAmount: 0,
            lockerAmount: 0,
            otherAmount: 0,
            total: 0,
            count: 0,
          }
        }
        const amount = Number(p.amount)
        periodMap[key].total += amount
        periodMap[key].count++
        if (p.payment_type === "subscription") {
          periodMap[key].subscriptionAmount += amount
        } else if (p.payment_type === "locker_rent" || p.payment_type === "locker_deposit") {
          periodMap[key].lockerAmount += amount
        } else {
          periodMap[key].otherAmount += amount
        }
      })

      const revenueByPeriod = Object.values(periodMap).sort(
        (a, b) => a.sortKey.localeCompare(b.sortKey)
      )

      // Payment method breakdown
      const paymentMethodBreakdown = buildPaymentMethodBreakdown(periodPayments as Array<{ payment_method?: string; amount: number | string }>)

      // Top 10 members by total payment
      const memberTotals: Record<string, {
        memberName: string
        memberCode: string
        totalPaid: number
        paymentCount: number
      }> = {}

      periodPayments.forEach((p: Record<string, unknown>) => {
        const memberId = p.member_id as string
        if (!memberTotals[memberId]) {
          const memberObj = p.member as Record<string, unknown> | null
          memberTotals[memberId] = {
            memberName: (memberObj?.name as string) || "Unknown",
            memberCode: (memberObj?.member_code as string) || "-",
            totalPaid: 0,
            paymentCount: 0,
          }
        }
        memberTotals[memberId].totalPaid += Number(p.amount)
        memberTotals[memberId].paymentCount++
      })

      const topMembers = Object.values(memberTotals)
        .map((m) => ({
          ...m,
          avgAmount: m.paymentCount > 0 ? m.totalPaid / m.paymentCount : 0,
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 10)

      setPaymentReportData({
        totalCollections,
        paymentCount,
        avgPaymentAmount,
        outstanding,
        revenueByPeriod,
        paymentMethodBreakdown,
        topMembers,
      })
    } catch (error) {
      logger.error("Error fetching payment report data:", { detail: error })
    } finally {
      setPaymentReportLoading(false)
    }
  }

  // ============================================================================
  // CSV Export
  // ============================================================================

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

  const handlePaymentExportCSV = (type: string) => {
    if (!paymentReportData) return

    const rows: (string | number)[][] = []
    let filename = ""

    switch (type) {
      case "collections":
        filename = "library-collections-report.csv"
        rows.push(
          ["Period", "Subscription", "Locker", "Other", "Total", "Count"],
          ...paymentReportData.revenueByPeriod.map((r) => [
            r.period,
            formatCurrency(r.subscriptionAmount),
            formatCurrency(r.lockerAmount),
            formatCurrency(r.otherAmount),
            formatCurrency(r.total),
            r.count,
          ]),
          [
            "TOTAL",
            formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.subscriptionAmount, 0)),
            formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.lockerAmount, 0)),
            formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.otherAmount, 0)),
            formatCurrency(paymentReportData.totalCollections),
            paymentReportData.paymentCount,
          ],
        )
        break
      case "top-members":
        filename = "library-top-members-report.csv"
        rows.push(
          ["Member Name", "Member Code", "Total Paid", "Payment Count", "Avg Amount"],
          ...paymentReportData.topMembers.map((m) => [
            m.memberName,
            m.memberCode,
            formatCurrency(m.totalPaid),
            m.paymentCount,
            formatCurrency(m.avgAmount),
          ]),
        )
        break
      default:
        return
    }

    exportCSV(rows, filename, canPerformAction, getDemoMessage)
  }

  // ============================================================================
  // Sorting for Collection Table
  // ============================================================================

  const sortedRevenueByPeriod = useMemo(() => {
    if (!paymentReportData) return []
    const data = [...paymentReportData.revenueByPeriod]
    data.sort((a, b) => {
      let cmp = 0
      switch (paymentSortColumn) {
        case "period": cmp = a.period.localeCompare(b.period); break
        case "subscriptionAmount": cmp = a.subscriptionAmount - b.subscriptionAmount; break
        case "lockerAmount": cmp = a.lockerAmount - b.lockerAmount; break
        case "otherAmount": cmp = a.otherAmount - b.otherAmount; break
        case "total": cmp = a.total - b.total; break
        case "count": cmp = a.count - b.count; break
        default: cmp = 0
      }
      return paymentSortDirection === "asc" ? cmp : -cmp
    })
    return data
  }, [paymentReportData, paymentSortColumn, paymentSortDirection])

  const sortedTopMembers = useMemo(() => {
    if (!paymentReportData) return []
    const data = [...paymentReportData.topMembers]
    data.sort((a, b) => {
      let cmp = 0
      switch (topMembersSortColumn) {
        case "memberName": cmp = a.memberName.localeCompare(b.memberName); break
        case "memberCode": cmp = a.memberCode.localeCompare(b.memberCode); break
        case "totalPaid": cmp = a.totalPaid - b.totalPaid; break
        case "paymentCount": cmp = a.paymentCount - b.paymentCount; break
        case "avgAmount": cmp = a.avgAmount - b.avgAmount; break
        default: cmp = 0
      }
      return topMembersSortDirection === "asc" ? cmp : -cmp
    })
    return data
  }, [paymentReportData, topMembersSortColumn, topMembersSortDirection])

  const toggleSort = useCallback((column: string, currentCol: string, currentDir: "asc" | "desc", setCol: (c: string) => void, setDir: (d: "asc" | "desc") => void) => {
    if (currentCol === column) {
      setDir(currentDir === "asc" ? "desc" : "asc")
    } else {
      setCol(column)
      setDir("desc")
    }
  }, [])

  // ============================================================================
  // Render
  // ============================================================================

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
            onExport={() => activeTab === "overview" ? handleExportCSV("summary") : handlePaymentExportCSV("collections")}
          />

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === "payments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              Payment Report
            </button>
          </div>

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW (existing content, unchanged) */}
          {/* ============================================================ */}
          {activeTab === "overview" && (
            <>
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
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={reportData.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          width={55}
                          tickFormatter={formatCurrencyTick}
                        />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          formatter={(value, name) => [
                            name === "Revenue" ? formatCurrency(Number(value)) : value,
                            name,
                          ]}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2 }}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="members"
                          name="New Members"
                          fill="hsl(var(--chart-1))"
                          radius={[4, 4, 0, 0]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ReportChartCard>

                <PaymentMethodsChart
                  data={reportData.paymentMethods}
                  colors={CHART_COLORS}
                />
              </div>

              {/* Daily Attendance & Time Slots */}
              <div className="grid md:grid-cols-2 gap-6">
                <ReportChartCard
                  title="Daily Attendance"
                  description="Check-ins over the last 7 days"
                >
                  <div className="h-[220px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={reportData.dailyAttendance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip />
                        <Bar dataKey="checkIns" name="Check-ins" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Subscriptions</p>
                    <p className="text-lg sm:text-2xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(reportData.subscriptionRevenue)}</p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400/80">
                      {reportData.totalRevenueThisMonth > 0
                        ? ((reportData.subscriptionRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Lockers</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(reportData.lockerRevenue)}</p>
                    <p className="text-xs text-purple-500 dark:text-purple-400/80">
                      {reportData.totalRevenueThisMonth > 0
                        ? ((reportData.lockerRevenue / reportData.totalRevenueThisMonth) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-warning/10 rounded-lg">
                    <p className="text-sm text-warning font-medium">Other</p>
                    <p className="text-lg sm:text-2xl font-bold text-warning">{formatCurrency(reportData.otherRevenue)}</p>
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
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={reportData.libraryStats} margin={{ bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={55} tickFormatter={formatCurrencyTick} />
                        <Tooltip formatter={(value, name) => [
                          name === "revenue" ? formatCurrency(Number(value)) : value,
                          name === "revenue" ? "Revenue" : name === "activeMembers" ? "Active Members" : "Check-ins"
                        ]} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-6))" radius={[4, 4, 0, 0]} />
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
                    { label: "Active", value: reportData.activeMembers, color: "hsl(var(--success))" },
                    { label: "Expired", value: reportData.expiredMembers, color: "hsl(var(--warning))" },
                    { label: "Total", value: reportData.totalMembers, color: "hsl(var(--info))" },
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
                    { label: "Occupied", value: reportData.occupiedSeats, color: "hsl(var(--chart-5))" },
                    { label: "Available", value: reportData.availableSeats, color: "hsl(var(--chart-1))" },
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
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 2: PAYMENT REPORT */}
          {/* ============================================================ */}
          {activeTab === "payments" && (
            <>
              {paymentReportLoading ? (
                <PageSkeleton variant="list" />
              ) : paymentReportData ? (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Collections"
                      value={formatCurrency(paymentReportData.totalCollections)}
                      subtitle="In selected period"
                      icon={IndianRupee}
                      color="green"
                    />
                    <StatCard
                      label="Payment Count"
                      value={paymentReportData.paymentCount}
                      subtitle="Transactions"
                      icon={Receipt}
                      color="blue"
                    />
                    <StatCard
                      label="Avg Payment"
                      value={formatCurrency(paymentReportData.avgPaymentAmount)}
                      subtitle="Per transaction"
                      icon={CreditCard}
                      color="purple"
                    />
                    <StatCard
                      label="Outstanding"
                      value={formatCurrency(paymentReportData.outstanding)}
                      subtitle="Active subscriptions"
                      icon={AlertCircle}
                      color={paymentReportData.outstanding > 0 ? "red" : "green"}
                    />
                  </div>

                  {/* Group By Selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Group by:</span>
                    <div className="flex gap-1">
                      {(["day", "week", "month", "year"] as GroupByPeriod[]).map((period) => (
                        <button
                          key={period}
                          onClick={() => setPaymentGroupBy(period)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-colors",
                            paymentGroupBy === period
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Revenue Bar Chart */}
                    <ReportChartCard
                      title="Revenue Over Time"
                      description={`Collections grouped by ${paymentGroupBy}`}
                      isEmpty={paymentReportData.revenueByPeriod.length === 0}
                      emptyMessage="No payments in selected period"
                    >
                      <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={paymentReportData.revenueByPeriod}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={55} tickFormatter={formatCurrencyTick} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Bar dataKey="subscriptionAmount" name="Subscription" fill="hsl(var(--chart-3))" stackId="revenue" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="lockerAmount" name="Locker" fill="hsl(var(--chart-6))" stackId="revenue" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="otherAmount" name="Other" fill="hsl(var(--chart-2))" stackId="revenue" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ReportChartCard>

                    {/* Payment Method Donut */}
                    <PaymentMethodsChart
                      data={paymentReportData.paymentMethodBreakdown}
                      colors={CHART_COLORS}
                    />
                  </div>

                  {/* Collection Table */}
                  <ReportChartCard
                    title="Collection Breakdown"
                    description={`Payments grouped by ${paymentGroupBy}`}
                    onExport={() => handlePaymentExportCSV("collections")}
                    exportLabel="Export CSV"
                    isEmpty={paymentReportData.revenueByPeriod.length === 0}
                    emptyMessage="No payments in selected period"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {[
                              { key: "period", label: "Period", align: "left" as const },
                              { key: "subscriptionAmount", label: "Subscription", align: "right" as const },
                              { key: "lockerAmount", label: "Locker", align: "right" as const },
                              { key: "otherAmount", label: "Other", align: "right" as const },
                              { key: "total", label: "Total", align: "right" as const },
                              { key: "count", label: "Count", align: "right" as const },
                            ].map((col) => (
                              <th
                                key={col.key}
                                className={cn(
                                  "py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors",
                                  col.align === "right" ? "text-right" : "text-left"
                                )}
                                onClick={() => toggleSort(col.key, paymentSortColumn, paymentSortDirection, setPaymentSortColumn, setPaymentSortDirection)}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {col.label}
                                  {paymentSortColumn === col.key && (
                                    <ArrowUpDown className="h-3 w-3" />
                                  )}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRevenueByPeriod.map((row, index) => (
                            <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{row.period}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(row.subscriptionAmount)}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(row.lockerAmount)}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(row.otherAmount)}</td>
                              <td className="py-2 px-3 text-right font-semibold">{formatCurrency(row.total)}</td>
                              <td className="py-2 px-3 text-right">{row.count}</td>
                            </tr>
                          ))}
                          {/* Totals Row */}
                          {sortedRevenueByPeriod.length > 0 && (
                            <tr className="border-t-2 bg-muted/30 font-semibold">
                              <td className="py-2 px-3">Total</td>
                              <td className="py-2 px-3 text-right">
                                {formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.subscriptionAmount, 0))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.lockerAmount, 0))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatCurrency(paymentReportData.revenueByPeriod.reduce((s: number, r) => s + r.otherAmount, 0))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatCurrency(paymentReportData.totalCollections)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {paymentReportData.paymentCount}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </ReportChartCard>

                  {/* Top Members Table */}
                  <ReportChartCard
                    title="Top Members by Payment"
                    description="Top 10 members by total amount paid in selected period"
                    onExport={() => handlePaymentExportCSV("top-members")}
                    exportLabel="Export CSV"
                    isEmpty={paymentReportData.topMembers.length === 0}
                    emptyMessage="No payments in selected period"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {[
                              { key: "memberName", label: "Member Name", align: "left" as const },
                              { key: "memberCode", label: "Member Code", align: "left" as const },
                              { key: "totalPaid", label: "Total Paid", align: "right" as const },
                              { key: "paymentCount", label: "Payments", align: "right" as const },
                              { key: "avgAmount", label: "Avg Amount", align: "right" as const },
                            ].map((col) => (
                              <th
                                key={col.key}
                                className={cn(
                                  "py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors",
                                  col.align === "right" ? "text-right" : "text-left"
                                )}
                                onClick={() => toggleSort(col.key, topMembersSortColumn, topMembersSortDirection, setTopMembersSortColumn, setTopMembersSortDirection)}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {col.label}
                                  {topMembersSortColumn === col.key && (
                                    <ArrowUpDown className="h-3 w-3" />
                                  )}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTopMembers.map((member, index) => (
                            <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{member.memberName}</td>
                              <td className="py-2 px-3 text-muted-foreground">{member.memberCode}</td>
                              <td className="py-2 px-3 text-right font-semibold">{formatCurrency(member.totalPaid)}</td>
                              <td className="py-2 px-3 text-right">{member.paymentCount}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(member.avgAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ReportChartCard>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">Failed to load payment report data</p>
                </div>
              )}
            </>
          )}
        </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
