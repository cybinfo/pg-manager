import { calculateGrowth, buildPaymentMethodBreakdown } from "@/components/reports"
import { MONTH_NAMES } from "@/lib/format"

// ============================================================================
// Input types — raw Supabase rows (expenses already have transformJoin applied)
// ============================================================================

export interface PGReportInput {
  roomsData: Record<string, unknown>[]
  tenantsData: Record<string, unknown>[]
  paymentsData: Record<string, unknown>[]
  billsData: Record<string, unknown>[]
  complaintsData: Record<string, unknown>[]
  expensesData: Record<string, unknown>[]
  propertiesData: { id: string; name: string }[]
  selectedProperty: string
  startDate: Date
  endDate: Date
  lastMonthStart: Date
  lastMonthEnd: Date
}

// ============================================================================
// Output type
// ============================================================================

export interface PGReportData {
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

// ============================================================================
// Pure computation — no Supabase, no React, no side effects
// ============================================================================

export function computePGReport(input: PGReportInput): PGReportData {
  const {
    roomsData, tenantsData, paymentsData, billsData, complaintsData, expensesData,
    propertiesData, selectedProperty, startDate, endDate, lastMonthStart, lastMonthEnd,
  } = input

  // Filter by property if selected
  const filterByProperty = (items: Record<string, unknown>[]) => {
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
  const totalBeds = filteredRooms.reduce((sum, r) => sum + (Number(r.total_beds) || 1), 0)
  const activeTenants = filteredTenants.filter((t) => t.status === "active").length
  const occupancyRate = totalBeds > 0 ? (activeTenants / totalBeds) * 100 : 0

  // Tenant calculations
  const totalTenants = filteredTenants.length
  const tenantsOnNotice = filteredTenants.filter((t) => t.status === "notice_period").length
  const newTenantsThisMonth = filteredTenants.filter((t) => {
    const createdAt = new Date(t.created_at as string)
    return createdAt >= startDate && createdAt <= endDate
  }).length
  const exitsThisMonth = filteredTenants.filter((t) => {
    if (!t.check_out_date) return false
    const checkOut = new Date(t.check_out_date as string)
    return checkOut >= startDate && checkOut <= endDate
  }).length

  // Revenue calculations
  const periodPayments = filteredPayments.filter((p) => {
    const paymentDate = new Date(p.payment_date as string)
    return paymentDate >= startDate && paymentDate <= endDate
  })
  const lastMonthPayments = filteredPayments.filter((p) => {
    const paymentDate = new Date(p.payment_date as string)
    return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd
  })

  const totalCollectedThisMonth = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalCollectedLastMonth = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const revenueGrowth = calculateGrowth(totalCollectedThisMonth, totalCollectedLastMonth)

  // Total billed in period
  const periodBills = filteredBills.filter((b) => {
    const billDate = new Date(b.bill_date as string)
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
  const tenantsWithDues = new Set(unpaidBills.map((b) => b.tenant_id)).size
  const overdueBills = unpaidBills.filter((b) => new Date(b.due_date as string) < now)
  const overdueAmount = overdueBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)

  // Dues Aging calculation
  const duesAging = { current: 0, days30: 0, days60: 0, days90Plus: 0 }
  unpaidBills.forEach((bill) => {
    const dueDate = new Date(bill.due_date as string)
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
  collectionEfficiency.late = unpaidBills.filter((b) => {
    const daysPastDue = Math.floor((now.getTime() - new Date(b.due_date as string).getTime()) / (1000 * 60 * 60 * 24))
    return daysPastDue > 0 && daysPastDue <= 30
  }).length
  collectionEfficiency.overdue = unpaidBills.filter((b) => {
    const daysPastDue = Math.floor((now.getTime() - new Date(b.due_date as string).getTime()) / (1000 * 60 * 60 * 24))
    return daysPastDue > 30
  }).length

  // Complaints
  const openComplaints = filteredComplaints.filter((c) =>
    c.status === "open" || c.status === "acknowledged" || c.status === "in_progress"
  ).length
  const resolvedThisMonth = filteredComplaints.filter((c) => {
    if (!c.resolved_at) return false
    const resolvedAt = new Date(c.resolved_at as string)
    return resolvedAt >= startDate && resolvedAt <= endDate
  }).length
  const resolvedComplaints = filteredComplaints.filter((c) => c.resolved_at)
  const avgResolutionDays = resolvedComplaints.length > 0
    ? resolvedComplaints.reduce((sum, c) => {
        const created = new Date(c.created_at as string)
        const resolved = new Date(c.resolved_at as string)
        return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      }, 0) / resolvedComplaints.length
    : 0

  // Property-wise stats (always computed against all unfiltered data so every property row appears)
  const propertyStats = propertiesData.map((property) => {
    const propRooms = roomsData.filter((r) => r.property_id === property.id)
    const propPayments = paymentsData.filter((p) => {
      const paymentDate = new Date(p.payment_date as string)
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
      const paymentDate = new Date(p.payment_date as string)
      return paymentDate >= monthStart && paymentDate <= monthEnd
    })
    const monthBills = filteredBills.filter((b) => {
      const billDate = new Date(b.bill_date as string)
      return billDate >= monthStart && billDate <= monthEnd
    })
    monthlyRevenue.push({
      month: MONTH_NAMES[monthStart.getMonth()],
      collected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      billed: monthBills.reduce((sum, b) => sum + Number(b.total_amount), 0),
    })
  }

  // Payment method breakdown
  const paymentMethods = buildPaymentMethodBreakdown(
    periodPayments as Array<{ payment_method?: string; amount: number | string }>
  )

  // Expense calculations
  const periodExpenses = filteredExpenses.filter((e) => {
    const expenseDate = new Date(e.expense_date as string)
    return expenseDate >= startDate && expenseDate <= endDate
  })
  const lastMonthExpenses = filteredExpenses.filter((e) => {
    const expenseDate = new Date(e.expense_date as string)
    return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd
  })
  const totalExpensesThisMonth = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalExpensesLastMonth = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const expenseGrowth = calculateGrowth(totalExpensesThisMonth, totalExpensesLastMonth)
  const netIncome = totalCollectedThisMonth - totalExpensesThisMonth

  // Expense by category
  const categoryTotals: Record<string, number> = {}
  periodExpenses.forEach((e) => {
    const expenseType = e.expense_type as { name?: string } | null
    const categoryName = expenseType?.name || "Uncategorized"
    categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Number(e.amount)
  })
  const expensesByCategory = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return {
    totalRooms, occupiedRooms, availableRooms, maintenanceRooms, totalBeds,
    occupiedBeds: activeTenants, occupancyRate, totalTenants, activeTenants,
    tenantsOnNotice, newTenantsThisMonth, exitsThisMonth,
    totalCollectedThisMonth, totalCollectedLastMonth, revenueGrowth,
    averageRent, totalBilled, totalPendingDues, tenantsWithDues,
    overdueAmount, duesAging, collectionEfficiency, openComplaints,
    resolvedThisMonth, avgResolutionDays, propertyStats, monthlyRevenue,
    paymentMethods, totalExpensesThisMonth, totalExpensesLastMonth,
    expenseGrowth, netIncome, expensesByCategory,
  }
}
