import { calculateGrowth, buildPaymentMethodBreakdown, MONTH_NAMES, DAY_NAMES } from "@/components/reports"
import { getTodayISO } from "@/lib/date-helpers"
import { getPeriodKey, formatPeriodLabel, type GroupByPeriod } from "@/lib/report-utils"

// ============================================================================
// Input types — raw Supabase rows after transformJoin has been applied
// ============================================================================

export interface RawSeat {
  id: string
  status: string
  section?: { library_id?: string } | null
}

export interface RawMember {
  id: string
  library_id?: string
  status: string
  hours_balance?: number
  hours_used?: number
  join_date?: string
  expiry_date?: string
  preferred_slot?: string
  created_at: string
}

export interface RawPayment {
  id: string
  member_id: string
  amount: number | string
  payment_type?: string
  payment_method?: string
  payment_date: string
  member?: { library_id?: string; name?: string; member_code?: string } | null
}

export interface RawAttendance {
  id: string
  member_id: string
  check_in_time: string
  check_out_time?: string | null
  hours_spent?: number
  attendance_date: string
  member?: { library_id?: string } | null
}

export interface RawLibrary {
  id: string
  name: string
  total_seats: number
  occupied_seats?: number
}

export interface RawMembership {
  id: string
  member_id: string
  final_amount?: number | null
  status: string
  member?: { library_id?: string } | null
}

// ============================================================================
// Output types
// ============================================================================

export interface LibraryReportResult {
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
  // Trends & breakdowns
  monthlyRevenue: { month: string; revenue: number; members: number }[]
  paymentMethods: { name: string; value: number; count: number }[]
  timeSlotDistribution: { slot: string; count: number; percentage: number }[]
  dailyAttendance: { date: string; checkIns: number }[]
  libraryStats: {
    id: string
    name: string
    totalSeats: number
    activeMembers: number
    revenue: number
    checkIns: number
  }[]
}

export interface PaymentReportResult {
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
// Computation inputs
// ============================================================================

export interface LibraryReportInputs {
  seats: RawSeat[]
  members: RawMember[]
  payments: RawPayment[]
  attendance: RawAttendance[]
  libraries: RawLibrary[]
  startDate: Date
  endDate: Date
  lastMonthStart: Date
  lastMonthEnd: Date
}

export interface PaymentReportInputs {
  payments: RawPayment[]
  members: RawMember[]
  memberships: RawMembership[]
  startDate: Date
  endDate: Date
  groupBy: GroupByPeriod
}

// ============================================================================
// Library-filter helper — kept pure, no React
// ============================================================================

function filterByLibrary<T extends Record<string, unknown>>(
  items: T[],
  selectedLibrary: string,
  libraryIdField: string = "library_id"
): T[] {
  if (selectedLibrary === "all") return items
  return items.filter((item) => {
    if (libraryIdField === "section.library_id")
      return (item.section as Record<string, unknown> | undefined)?.library_id === selectedLibrary
    if (libraryIdField === "member.library_id")
      return (item.member as Record<string, unknown> | undefined)?.library_id === selectedLibrary
    return item[libraryIdField] === selectedLibrary
  })
}

// ============================================================================
// Main overview aggregation
// ============================================================================

export function computeLibraryOverviewReport(
  inputs: LibraryReportInputs,
  selectedLibrary: string
): LibraryReportResult {
  const { seats, members, payments, attendance, libraries, startDate, endDate, lastMonthStart, lastMonthEnd } = inputs

  const filteredSeats = filterByLibrary(seats as unknown as Record<string, unknown>[], selectedLibrary, "section.library_id") as unknown as RawSeat[]
  const filteredMembers = filterByLibrary(members as unknown as Record<string, unknown>[], selectedLibrary) as unknown as RawMember[]
  const filteredPayments = filterByLibrary(payments as unknown as Record<string, unknown>[], selectedLibrary, "member.library_id") as unknown as RawPayment[]
  const filteredAttendance = filterByLibrary(attendance as unknown as Record<string, unknown>[], selectedLibrary, "member.library_id") as unknown as RawAttendance[]

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
  const paymentMethods = buildPaymentMethodBreakdown(
    periodPayments as Array<{ payment_method?: string; amount: number | string }>
  )

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

  // Library-wise stats (always uses unfiltered data so per-library rows always show)
  const libraryStats = libraries.map((library) => {
    const libMembers = members.filter((m) => m.library_id === library.id)
    const libPayments = payments.filter((p) => p.member?.library_id === library.id)
    const libAttendance = attendance.filter((a) => a.member?.library_id === library.id)

    const libPeriodPayments = libPayments.filter((p) => {
      const paymentDate = new Date(p.payment_date)
      return paymentDate >= startDate && paymentDate <= endDate
    })
    const libPeriodAttendance = libAttendance.filter((a) => {
      const date = new Date(a.attendance_date)
      return date >= startDate && date <= endDate
    })

    return {
      id: library.id,
      name: library.name,
      totalSeats: library.total_seats,
      activeMembers: libMembers.filter((m) => m.status === "active").length,
      revenue: libPeriodPayments.reduce((sum: number, p) => sum + Number(p.amount), 0),
      checkIns: libPeriodAttendance.length,
    }
  })

  return {
    totalSeats, occupiedSeats, availableSeats, utilizationRate, currentlyCheckedIn,
    totalMembers, activeMembers, expiredMembers, newMembersThisMonth, churnsThisMonth,
    totalRevenueThisMonth, totalRevenueLastMonth, revenueGrowth,
    subscriptionRevenue, lockerRevenue, otherRevenue,
    totalHoursUsed, avgHoursPerMember, hoursRemaining,
    totalCheckInsThisMonth, avgDailyCheckIns, peakHour, peakDay,
    monthlyRevenue, paymentMethods, timeSlotDistribution, dailyAttendance, libraryStats,
  }
}

// ============================================================================
// Payment report aggregation
// ============================================================================

export function computePaymentReport(
  inputs: PaymentReportInputs,
  selectedLibrary: string
): PaymentReportResult {
  const { payments, members, memberships, startDate, endDate, groupBy } = inputs

  const filteredPayments = filterByLibrary(payments as unknown as Record<string, unknown>[], selectedLibrary, "member.library_id") as unknown as RawPayment[]
  const filteredMembers = filterByLibrary(members as unknown as Record<string, unknown>[], selectedLibrary) as unknown as RawMember[]
  const filteredMemberships = filterByLibrary(memberships as unknown as Record<string, unknown>[], selectedLibrary, "member.library_id") as unknown as RawMembership[]

  // Period payments
  const periodPayments = filteredPayments.filter((p) => {
    const paymentDate = new Date(p.payment_date)
    return paymentDate >= startDate && paymentDate <= endDate
  })

  // KPIs
  const totalCollections = periodPayments.reduce((sum: number, p) => sum + Number(p.amount), 0)
  const paymentCount = periodPayments.length
  const avgPaymentAmount = paymentCount > 0 ? totalCollections / paymentCount : 0

  // Outstanding: sum of (final_amount - linked subscription payments) for active memberships
  const activeMembers = filteredMembers.filter((m) => m.status === "active")
  const activeMemberIds = new Set(activeMembers.map((m) => m.id))
  const activeMemberships = filteredMemberships.filter(
    (ms) => ms.status === "active" && activeMemberIds.has(ms.member_id)
  )
  const totalSubscriptionFees = activeMemberships.reduce(
    (sum: number, ms) => sum + Number(ms.final_amount || 0), 0
  )
  const activeSubPayments = filteredPayments.filter(
    (p) => activeMemberIds.has(p.member_id) && p.payment_type === "subscription"
  )
  const totalPaidByActive = activeSubPayments.reduce((sum: number, p) => sum + Number(p.amount), 0)
  const outstanding = Math.max(0, totalSubscriptionFees - totalPaidByActive)

  // Revenue grouped by period
  const periodMap: Record<string, {
    period: string
    sortKey: string
    subscriptionAmount: number
    lockerAmount: number
    otherAmount: number
    total: number
    count: number
  }> = {}

  periodPayments.forEach((p) => {
    const date = new Date(p.payment_date)
    const key = getPeriodKey(date, groupBy)
    if (!periodMap[key]) {
      periodMap[key] = {
        period: formatPeriodLabel(date, groupBy),
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

  const revenueByPeriod = Object.values(periodMap)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey: _sortKey, ...rest }) => rest)

  // Payment method breakdown
  const paymentMethodBreakdown = buildPaymentMethodBreakdown(
    periodPayments as Array<{ payment_method?: string; amount: number | string }>
  )

  // Top 10 members by total payment
  const memberTotals: Record<string, {
    memberName: string
    memberCode: string
    totalPaid: number
    paymentCount: number
  }> = {}

  periodPayments.forEach((p) => {
    const memberId = p.member_id
    if (!memberTotals[memberId]) {
      memberTotals[memberId] = {
        memberName: p.member?.name || "Unknown",
        memberCode: p.member?.member_code || "-",
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

  return {
    totalCollections,
    paymentCount,
    avgPaymentAmount,
    outstanding,
    revenueByPeriod,
    paymentMethodBreakdown,
    topMembers,
  }
}
