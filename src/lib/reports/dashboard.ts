import { MONTH_NAMES } from "@/lib/format"

export interface DashboardRawInputs {
  rooms: { total_beds?: number; occupied_beds?: number }[]
  charges: { amount: number; paid_amount?: number; status: string }[]
  payments: { amount: number }[]
  allPayments: { payment_date: string; amount: number }[]
  expenses: { amount: number }[]
  propertiesCount: number
  tenantsCount: number
  complaintsCount: number
  expiringLeasesCount: number
  librariesCount: number
  libraryMembersCount: number
  libraryActiveMembersCount: number
  libraryCheckedInCount: number
  chargeTypesCount: number
  roomsCount: number
}

export interface DashboardStats {
  properties: number
  rooms: number
  totalBeds: number
  occupiedBeds: number
  tenants: number
  pendingDues: number
  totalRevenue: number
  totalExpenses: number
  overdueCount: number
  openComplaints: number
  expiringLeases: number
  libraries: number
  libraryMembers: number
  libraryActiveMembers: number
  libraryCheckedIn: number
}

export interface DashboardComputeResult {
  stats: DashboardStats
  monthlyRevenue: { month: string; amount: number }[]
  paymentStatus: { name: string; value: number; color: string }[]
  gettingStartedDone: { property: boolean; room: boolean; tenant: boolean; chargeType: boolean }
}

export function computeDashboardStats(inputs: DashboardRawInputs, now: Date): DashboardComputeResult {
  const {
    rooms, charges, payments, allPayments, expenses,
    propertiesCount, tenantsCount, complaintsCount, expiringLeasesCount,
    librariesCount, libraryMembersCount, libraryActiveMembersCount, libraryCheckedInCount,
    chargeTypesCount, roomsCount,
  } = inputs

  // Room bed counts
  let totalBeds = 0
  let occupiedBeds = 0
  rooms.forEach((room) => {
    totalBeds += room.total_beds || 0
    occupiedBeds += room.occupied_beds || 0
  })

  // Dues and overdue counts
  let pendingDues = 0
  let overdueCount = 0
  let paidCount = 0
  let partialCount = 0
  charges.forEach((charge) => {
    const due = Number(charge.amount) - Number(charge.paid_amount || 0)
    pendingDues += due
    if (charge.status === "overdue") overdueCount++
    else if (charge.status === "partial") partialCount++
    else paidCount++
  })

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Monthly revenue for chart (last 6 months)
  const revenueByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    revenueByMonth[MONTH_NAMES[d.getMonth()]] = 0
  }
  allPayments.forEach((payment) => {
    const d = new Date(payment.payment_date)
    const key = MONTH_NAMES[d.getMonth()]
    if (revenueByMonth[key] !== undefined) {
      revenueByMonth[key] += Number(payment.amount)
    }
  })
  const monthlyRevenue = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount }))

  const paymentStatus = [
    { name: "Paid", value: paidCount, color: "hsl(var(--chart-1))" },
    { name: "Partial", value: partialCount, color: "hsl(var(--chart-2))" },
    { name: "Overdue", value: overdueCount, color: "hsl(var(--chart-5))" },
  ].filter((s) => s.value > 0)

  return {
    stats: {
      properties: propertiesCount,
      rooms: roomsCount,
      totalBeds,
      occupiedBeds,
      tenants: tenantsCount,
      pendingDues,
      totalRevenue,
      totalExpenses,
      overdueCount,
      openComplaints: complaintsCount,
      expiringLeases: expiringLeasesCount,
      libraries: librariesCount,
      libraryMembers: libraryMembersCount,
      libraryActiveMembers: libraryActiveMembersCount,
      libraryCheckedIn: libraryCheckedInCount,
    },
    monthlyRevenue,
    paymentStatus,
    gettingStartedDone: {
      property: propertiesCount > 0,
      room: roomsCount > 0,
      tenant: tenantsCount > 0,
      chargeType: chargeTypesCount > 0,
    },
  }
}
