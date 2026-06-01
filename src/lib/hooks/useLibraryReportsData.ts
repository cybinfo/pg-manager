"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import {
  useReportDateRange,
  calculateGrowth,
  buildPaymentMethodBreakdown,
  MONTH_NAMES,
  DAY_NAMES,
} from "@/components/reports"
import { getTodayISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

// ============================================================================
// Types
// ============================================================================

export interface LibraryOption {
  id: string
  name: string
}

export interface LibraryReportData {
  totalSeats: number
  occupiedSeats: number
  availableSeats: number
  utilizationRate: number
  currentlyCheckedIn: number
  totalMembers: number
  activeMembers: number
  expiredMembers: number
  newMembersThisMonth: number
  churnsThisMonth: number
  totalRevenueThisMonth: number
  totalRevenueLastMonth: number
  revenueGrowth: number
  subscriptionRevenue: number
  lockerRevenue: number
  otherRevenue: number
  totalHoursUsed: number
  avgHoursPerMember: number
  hoursRemaining: number
  totalCheckInsThisMonth: number
  avgDailyCheckIns: number
  peakHour: string
  peakDay: string
  monthlyRevenue: { month: string; revenue: number; members: number }[]
  paymentMethods: { name: string; value: number; count: number }[]
  timeSlotDistribution: { slot: string; count: number; percentage: number }[]
  dailyAttendance: { date: string; checkIns: number }[]
  libraryStats: { id: string; name: string; totalSeats: number; activeMembers: number; revenue: number; checkIns: number }[]
}

export type GroupByPeriod = "day" | "week" | "month" | "year"

export interface PaymentReportData {
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

export interface UseLibraryReportsDataReturn {
  loading: boolean
  libraries: LibraryOption[]
  reportData: LibraryReportData | null
  dateRange: ReturnType<typeof useReportDateRange>["dateRange"]
  setDateRange: ReturnType<typeof useReportDateRange>["setDateRange"]
  selectedLibrary: string
  setSelectedLibrary: (value: string) => void
  paymentGroupBy: GroupByPeriod
  setPaymentGroupBy: (value: GroupByPeriod) => void
  paymentReportData: PaymentReportData | null
  paymentReportLoading: boolean
  fetchPaymentReportData: () => void
}

// ============================================================================
// Paginated fetch helper — bypasses Supabase max-rows-per-request limit
// ============================================================================

async function fetchAllRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: ReturnType<ReturnType<typeof createClient>["from"]> & { range: (...args: unknown[]) => any },
  pageSize = 1000
): Promise<{ data: Record<string, unknown>[]; error: Error | null }> {
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

// ============================================================================
// Hook
// ============================================================================

export function useLibraryReportsData(): UseLibraryReportsDataReturn {
  const [loading, setLoading] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all")
  const [reportData, setReportData] = useState<LibraryReportData | null>(null)
  const { dateRange, setDateRange, startDate, endDate, lastMonthStart, lastMonthEnd } = useReportDateRange()

  const [paymentGroupBy, setPaymentGroupBy] = useState<GroupByPeriod>("month")
  const [paymentReportData, setPaymentReportData] = useState<PaymentReportData | null>(null)
  const [paymentReportLoading, setPaymentReportLoading] = useState(false)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const [
        librariesRes,
        seatsRes,
        membersRes,
        membershipsRes,
        paymentsRes,
        attendanceRes,
      ] = await Promise.all([
        supabase.from("entities").eq("type", "library").select("id, name, total_seats, occupied_seats"),
        fetchAllRows(supabase.from("entity_seats").select("id, section_id, status, section:entity_sections!library_seats_section_id_fkey(entity_id)")),
        fetchAllRows(supabase.from("entity_members").select("id, entity_id, status, hours_balance, hours_used, join_date, expiry_date, preferred_slot, created_at")),
        fetchAllRows(supabase.from("entity_memberships").select("id, member_id, status, start_date, end_date, hours_included, hours_used, created_at, member:entity_members!library_memberships_member_id_fkey(entity_id)")),
        fetchAllRows(supabase.from("entity_payments").select("id, member_id, amount, payment_type, payment_method, payment_date, member:entity_members!library_payments_member_id_fkey(entity_id)")),
        fetchAllRows(supabase.from("entity_attendance").select("id, member_id, check_in_time, check_out_time, hours_spent, attendance_date, member:entity_members!library_attendance_member_id_fkey(entity_id)")),
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

      const filterByLibrary = (items: Record<string, unknown>[], libraryIdField: string = "entity_id") => {
        if (selectedLibrary === "all") return items
        return items.filter((item) => {
          if (libraryIdField === "section.entity_id") return (item.section as Record<string, unknown>)?.entity_id === selectedLibrary
          if (libraryIdField === "member.entity_id") return (item.member as Record<string, unknown>)?.entity_id === selectedLibrary
          return item[libraryIdField] === selectedLibrary
        })
      }

      const filteredSeats = filterByLibrary(seatsData, "section.entity_id")
      const filteredMembers = filterByLibrary(membersData)
      const filteredPayments = filterByLibrary(paymentsData, "member.entity_id")
      const filteredAttendance = filterByLibrary(attendanceData, "member.entity_id")

      const now = new Date()

      const totalSeats = filteredSeats.length
      const occupiedSeats = filteredSeats.filter((s) => s.status === "occupied").length
      const availableSeats = filteredSeats.filter((s) => s.status === "available").length
      const utilizationRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

      const today = getTodayISO()
      const currentlyCheckedIn = filteredAttendance.filter(
        (a) => a.attendance_date === today && !a.check_out_time
      ).length

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

      const totalHoursUsed = filteredMembers.reduce((sum, m) => sum + Number(m.hours_used || 0), 0)
      const hoursRemaining = filteredMembers
        .filter((m) => m.status === "active")
        .reduce((sum, m) => sum + Number(m.hours_balance || 0), 0)
      const avgHoursPerMember = activeMembers > 0 ? totalHoursUsed / activeMembers : 0

      const periodAttendance = filteredAttendance.filter((a) => {
        const date = new Date(a.attendance_date as string)
        return date >= startDate && date <= endDate
      })
      const totalCheckInsThisMonth = periodAttendance.length
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
      const avgDailyCheckIns = totalCheckInsThisMonth / daysInPeriod

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

      const paymentMethods = buildPaymentMethodBreakdown(periodPayments as Array<{ payment_method?: string; amount: number | string }>)

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

      const libraryStats = librariesData.map((library: { id: string; name: string; total_seats: number }) => {
        const libMembers = membersData.filter((m) => m.entity_id === library.id)
        const libPayments = paymentsData.filter((p) => (p.member as Record<string, unknown>)?.entity_id === library.id)
        const libAttendance = attendanceData.filter((a) => (a.member as Record<string, unknown>)?.entity_id === library.id)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibrary, dateRange])

  const fetchPaymentReportData = useCallback(async () => {
    setPaymentReportLoading(true)
    const supabase = createClient()

    try {
      const [paymentsRes, membersRes, membershipsRes] = await Promise.all([
        fetchAllRows(supabase.from("entity_payments").select(
          "id, member_id, amount, payment_type, payment_method, payment_date, member:entity_members!library_payments_member_id_fkey(id, entity_id, name, member_code)"
        )),
        fetchAllRows(supabase.from("entity_members").select("id, entity_id, status")),
        fetchAllRows(supabase.from("entity_memberships").select(
          "id, member_id, final_amount, status, member:entity_members!library_memberships_member_id_fkey(entity_id)"
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

      const filterByLibrary = (items: Record<string, unknown>[], field: string = "entity_id") => {
        if (selectedLibrary === "all") return items
        return items.filter((item) => {
          if (field === "member.entity_id") return (item.member as Record<string, unknown>)?.entity_id === selectedLibrary
          return item[field] === selectedLibrary
        })
      }

      const filteredPayments = filterByLibrary(paymentsData, "member.entity_id")
      const filteredMembers = filterByLibrary(membersData)
      const filteredMemberships = filterByLibrary(membershipsData, "member.entity_id")

      const periodPayments = filteredPayments.filter((p: Record<string, unknown>) => {
        const paymentDate = new Date(p.payment_date as string)
        return paymentDate >= startDate && paymentDate <= endDate
      })

      const totalCollections = periodPayments.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0)
      const paymentCount = periodPayments.length
      const avgPaymentAmount = paymentCount > 0 ? totalCollections / paymentCount : 0

      const activeMembers = filteredMembers.filter((m: Record<string, unknown>) => m.status === "active")
      const activeMemberIds = new Set(activeMembers.map((m: Record<string, unknown>) => m.id as string))
      const activeMemberships = filteredMemberships.filter(
        (ms: Record<string, unknown>) => ms.status === "active" && activeMemberIds.has(ms.member_id as string)
      )
      const totalSubscriptionFees = activeMemberships.reduce(
        (sum: number, ms: Record<string, unknown>) => sum + Number(ms.final_amount || 0), 0
      )
      const activeSubPayments = filteredPayments.filter(
        (p: Record<string, unknown>) => activeMemberIds.has(p.member_id as string) && p.payment_type === "subscription"
      )
      const totalPaidByActive = activeSubPayments.reduce(
        (sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0
      )
      const outstanding = Math.max(0, totalSubscriptionFees - totalPaidByActive)

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

      const paymentMethodBreakdown = buildPaymentMethodBreakdown(periodPayments as Array<{ payment_method?: string; amount: number | string }>)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibrary, dateRange, paymentGroupBy])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReportData()
  }, [fetchReportData])

  // Invalidate payment report when overview filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaymentReportData(null)
   
  }, [selectedLibrary, dateRange])

  return {
    loading,
    libraries,
    reportData,
    dateRange,
    setDateRange,
    selectedLibrary,
    setSelectedLibrary,
    paymentGroupBy,
    setPaymentGroupBy,
    paymentReportData,
    paymentReportLoading,
    fetchPaymentReportData,
  }
}

// ============================================================================
// Period helpers (used inside the hook for payment report grouping)
// ============================================================================

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function formatPeriodLabel(date: Date, groupBy: GroupByPeriod): string {
  switch (groupBy) {
    case "day":
      return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`
    case "week":
      return `W${getWeekNumber(date)} ${MONTH_NAMES[date.getMonth()]}`
    case "month":
      return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    case "year":
      return `${date.getFullYear()}`
  }
}

function getPeriodKey(date: Date, groupBy: GroupByPeriod): string {
  switch (groupBy) {
    case "day":
      return date.toISOString().split("T")[0]
    case "week":
      return `${date.getFullYear()}-W${getWeekNumber(date)}`
    case "month":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    case "year":
      return `${date.getFullYear()}`
  }
}
