"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import {
  useReportDateRange,
  calculateGrowth,
  buildPaymentMethodBreakdown,
  MONTH_NAMES,
} from "@/components/reports"
import { logger } from "@/lib/logger"

// ============================================================================
// Types
// ============================================================================

export interface ReportsProperty {
  id: string
  name: string
}

export interface ReportData {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  maintenanceRooms: number
  totalBeds: number
  occupiedBeds: number
  occupancyRate: number
  totalTenants: number
  activeTenants: number
  tenantsOnNotice: number
  newTenantsThisMonth: number
  exitsThisMonth: number
  totalCollectedThisMonth: number
  totalCollectedLastMonth: number
  revenueGrowth: number
  averageRent: number
  totalBilled: number
  totalPendingDues: number
  tenantsWithDues: number
  overdueAmount: number
  duesAging: { current: number; days30: number; days60: number; days90Plus: number }
  collectionEfficiency: { onTime: number; late: number; overdue: number }
  openComplaints: number
  resolvedThisMonth: number
  avgResolutionDays: number
  propertyStats: {
    id: string; name: string; totalRooms: number; occupiedRooms: number; revenue: number; pendingDues: number
  }[]
  monthlyRevenue: { month: string; collected: number; billed: number }[]
  paymentMethods: { name: string; value: number; count: number }[]
  totalExpensesThisMonth: number
  totalExpensesLastMonth: number
  expenseGrowth: number
  netIncome: number
  expensesByCategory: { name: string; value: number }[]
}

export interface UseReportsDataReturn {
  loading: boolean
  properties: ReportsProperty[]
  reportData: ReportData | null
  dateRange: ReturnType<typeof useReportDateRange>["dateRange"]
  setDateRange: ReturnType<typeof useReportDateRange>["setDateRange"]
  selectedProperty: string
  setSelectedProperty: (value: string) => void
  refetch: () => void
}

// ============================================================================
// Hook
// ============================================================================

export function useReportsData(): UseReportsDataReturn {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<ReportsProperty[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const { dateRange, setDateRange, startDate, endDate, lastMonthStart, lastMonthEnd } = useReportDateRange()

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const [
        propertiesRes,
        roomsRes,
        tenantsRes,
        paymentsRes,
        billsRes,
        complaintsRes,
        expensesRes,
      ] = await Promise.all([
        supabase.from("entities").select("id, name").eq("type", "pg"),
        supabase.from("rooms").select("id, entity_id, status, total_beds"),
        supabase.from("tenants").select("id, entity_id, status, monthly_rent, check_in_date, check_out_date, created_at"),
        supabase.from("payments").select("id, entity_id, amount, payment_method, payment_date, created_at"),
        supabase.from("bills").select("id, entity_id, tenant_id, total_amount, balance_due, status, bill_date, due_date"),
        supabase.from("complaints").select("id, entity_id, status, created_at, resolved_at"),
        supabase.from("expenses").select("id, entity_id, amount, expense_date, expense_type_id, expense_type:expense_types(name)"),
      ])

      const propertiesData = propertiesRes.data || []
      const roomsData = roomsRes.data || []
      const tenantsData = tenantsRes.data || []
      const paymentsData = paymentsRes.data || []
      const billsData = billsRes.data || []
      const complaintsData = complaintsRes.data || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expensesData = (expensesRes.data || []).map((e: any) => ({
        ...e,
        expense_type: transformJoin(e.expense_type),
      }))

      setProperties(propertiesData)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filterByProperty = (items: any[]) => {
        if (selectedProperty === "all") return items
        return items.filter((item: Record<string, unknown>) => item.entity_id === selectedProperty)
      }

      const filteredRooms = filterByProperty(roomsData)
      const filteredTenants = filterByProperty(tenantsData)
      const filteredPayments = filterByProperty(paymentsData)
      const filteredBills = filterByProperty(billsData)
      const filteredComplaints = filterByProperty(complaintsData)
      const filteredExpenses = filterByProperty(expensesData)

      const now = new Date()

      const totalRooms = filteredRooms.length
      const occupiedRooms = filteredRooms.filter((r) => r.status === "occupied" || r.status === "partially_occupied").length
      const availableRooms = filteredRooms.filter((r) => r.status === "available").length
      const maintenanceRooms = filteredRooms.filter((r) => r.status === "maintenance").length
      const totalBeds = filteredRooms.reduce((sum, r) => sum + (r.total_beds || 1), 0)
      const activeTenants = filteredTenants.filter((t) => t.status === "active").length
      const occupancyRate = totalBeds > 0 ? (activeTenants / totalBeds) * 100 : 0

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

      const periodBills = filteredBills.filter((b) => {
        const billDate = new Date(b.bill_date)
        return billDate >= startDate && billDate <= endDate
      })
      const totalBilled = periodBills.reduce((sum, b) => sum + Number(b.total_amount), 0)

      const activeTenantsWithRent = filteredTenants.filter((t) => t.status === "active" && t.monthly_rent)
      const averageRent = activeTenantsWithRent.length > 0
        ? activeTenantsWithRent.reduce((sum, t) => sum + Number(t.monthly_rent), 0) / activeTenantsWithRent.length
        : 0

      const unpaidBills = filteredBills.filter((b) => b.status !== "paid" && b.status !== "cancelled")
      const totalPendingDues = unpaidBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)
      const tenantsWithDues = new Set(unpaidBills.map(b => b.tenant_id)).size
      const overdueBills = unpaidBills.filter((b) => new Date(b.due_date) < now)
      const overdueAmount = overdueBills.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)

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

      const propertyStats = propertiesData.map((property: { id: string; name: string }) => {
        const propRooms = roomsData.filter((r: { entity_id: string }) => r.entity_id === property.id)
        const propPayments = paymentsData.filter((p: { entity_id: string; payment_date: string }) => {
          const paymentDate = new Date(p.payment_date)
          return p.entity_id === property.id && paymentDate >= startDate && paymentDate <= endDate
        })
        const propBills = billsData.filter((b: { entity_id: string; status: string }) => b.entity_id === property.id && b.status !== "paid" && b.status !== "cancelled")
        return {
          id: property.id,
          name: property.name,
          totalRooms: propRooms.length,
          occupiedRooms: propRooms.filter((r: { status: string }) => r.status === "occupied" || r.status === "partially_occupied").length,
          revenue: propPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
          pendingDues: propBills.reduce((sum: number, b: { balance_due?: number }) => sum + Number(b.balance_due || 0), 0),
        }
      })

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

      const paymentMethods = buildPaymentMethodBreakdown(periodPayments)

      const periodExpenses = filteredExpenses.filter((e: Record<string, unknown>) => {
        const expenseDate = new Date(e.expense_date as string)
        return expenseDate >= startDate && expenseDate <= endDate
      })
      const lastMonthExpenses = filteredExpenses.filter((e: Record<string, unknown>) => {
        const expenseDate = new Date(e.expense_date as string)
        return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd
      })
      const totalExpensesThisMonth = periodExpenses.reduce((sum: number, e: Record<string, unknown>) => sum + Number(e.amount), 0)
      const totalExpensesLastMonth = lastMonthExpenses.reduce((sum: number, e: Record<string, unknown>) => sum + Number(e.amount), 0)
      const expenseGrowth = calculateGrowth(totalExpensesThisMonth, totalExpensesLastMonth)
      const netIncome = totalCollectedThisMonth - totalExpensesThisMonth

      const categoryTotals: Record<string, number> = {}
      periodExpenses.forEach((e: Record<string, unknown>) => {
        const expenseType = e.expense_type as { name?: string } | null
        const categoryName = expenseType?.name || "Uncategorized"
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
      logger.error("Error fetching report data:", { detail: error })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty, dateRange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReportData()
  }, [fetchReportData])

  return {
    loading,
    properties,
    reportData,
    dateRange,
    setDateRange,
    selectedProperty,
    setSelectedProperty,
    refetch: fetchReportData,
  }
}
