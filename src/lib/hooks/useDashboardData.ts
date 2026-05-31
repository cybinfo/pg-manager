"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { OUTSTANDING_BILL_STATUSES } from "@/lib/status"

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

export interface GettingStartedItem {
  task: string
  href: string
  done: boolean
}

export interface MonthlyRevenue {
  month: string
  amount: number
}

export interface PaymentStatus {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

export interface UseDashboardDataReturn {
  loading: boolean
  userName: string
  stats: DashboardStats
  monthlyRevenue: MonthlyRevenue[]
  paymentStatus: PaymentStatus[]
  gettingStarted: GettingStartedItem[]
}

const INITIAL_STATS: DashboardStats = {
  properties: 0,
  rooms: 0,
  totalBeds: 0,
  occupiedBeds: 0,
  tenants: 0,
  pendingDues: 0,
  totalRevenue: 0,
  totalExpenses: 0,
  overdueCount: 0,
  openComplaints: 0,
  expiringLeases: 0,
  libraries: 0,
  libraryMembers: 0,
  libraryActiveMembers: 0,
  libraryCheckedIn: 0,
}

const INITIAL_GETTING_STARTED: GettingStartedItem[] = [
  { task: "Add your first property", href: "/properties/new", done: false },
  { task: "Create rooms in your property", href: "/rooms/new", done: false },
  { task: "Add your first tenant", href: "/tenants/new", done: false },
  { task: "Configure charge types", href: "/settings", done: false },
]

export function useDashboardData(): UseDashboardDataReturn {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS)
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus[]>([])
  const [gettingStarted, setGettingStarted] = useState<GettingStartedItem[]>(INITIAL_GETTING_STARTED)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      if (user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(" ")[0])
      }

      const now = new Date()
      const _thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const _nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const today = now.toISOString().split("T")[0]

      const [
        propertiesRes,
        roomsRes,
        tenantsRes,
        chargesRes,
        chargeTypesRes,
        paymentsRes,
        expensesRes,
        complaintsRes,
        expiringLeasesRes,
        monthlyPaymentsRes,
        librariesRes,
        libraryMembersRes,
        libraryActiveMembersRes,
        libraryCheckedInRes,
      ] = await Promise.all([
        supabase.from("entities").eq("type", "pg").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("rooms").select("total_beds, occupied_beds").is("deleted_at", null),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
        supabase.from("charges").select("amount, paid_amount, status").in("status", [...OUTSTANDING_BILL_STATUSES]),
        supabase.from("charge_types").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
        supabase.from("expenses").select("amount"),
        supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("tenants").select("id", { count: "exact", head: true })
          .eq("status", "active")
          .is("deleted_at", null)
          .not("expected_exit_date", "is", null)
          .lte("expected_exit_date", thirtyDaysFromNow.toISOString()),
        supabase.from("payments")
          .select("amount, payment_date")
          .gte("payment_date", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
          .order("payment_date"),
        supabase.from("entities").eq("type", "library").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("library_members").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("library_members").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
        supabase.from("library_attendance").select("id", { count: "exact", head: true })
          .eq("attendance_date", today)
          .is("check_out_time", null)
          .is("deleted_at", null),
      ])

      let totalBeds = 0
      let occupiedBeds = 0
      if (roomsRes.data) {
        roomsRes.data.forEach((room: { total_beds?: number; occupied_beds?: number }) => {
          totalBeds += room.total_beds || 0
          occupiedBeds += room.occupied_beds || 0
        })
      }

      let pendingDues = 0
      let overdueCount = 0
      let paidCount = 0
      let partialCount = 0
      if (chargesRes.data) {
        chargesRes.data.forEach((charge: { amount: number; paid_amount?: number; status: string }) => {
          const due = Number(charge.amount) - Number(charge.paid_amount || 0)
          pendingDues += due
          if (charge.status === "overdue") overdueCount++
          else if (charge.status === "partial") partialCount++
          else paidCount++
        })
      }

      let totalRevenue = 0
      if (paymentsRes.data) {
        totalRevenue = paymentsRes.data.reduce((sum: number, payment: { amount: number }) => sum + Number(payment.amount), 0)
      }

      let totalExpenses = 0
      if (expensesRes.data) {
        totalExpenses = expensesRes.data.reduce((sum: number, expense: { amount: number }) => sum + Number(expense.amount), 0)
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const revenueByMonth: Record<string, number> = {}

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${monthNames[d.getMonth()]}`
        revenueByMonth[key] = 0
      }

      if (monthlyPaymentsRes.data) {
        monthlyPaymentsRes.data.forEach((payment: { payment_date: string; amount: number }) => {
          const d = new Date(payment.payment_date)
          const key = monthNames[d.getMonth()]
          if (revenueByMonth[key] !== undefined) {
            revenueByMonth[key] += Number(payment.amount)
          }
        })
      }

      setMonthlyRevenue(Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount })))

      setPaymentStatus([
        { name: "Paid", value: paidCount, color: "hsl(var(--chart-1))" },
        { name: "Partial", value: partialCount, color: "hsl(var(--chart-2))" },
        { name: "Overdue", value: overdueCount, color: "hsl(var(--chart-5))" },
      ].filter(s => s.value > 0))

      setStats({
        properties: propertiesRes.count || 0,
        rooms: roomsRes.data?.length || 0,
        totalBeds,
        occupiedBeds,
        tenants: tenantsRes.count || 0,
        pendingDues,
        totalRevenue,
        totalExpenses,
        overdueCount,
        openComplaints: complaintsRes.count || 0,
        expiringLeases: expiringLeasesRes.count || 0,
        libraries: librariesRes.count || 0,
        libraryMembers: libraryMembersRes.count || 0,
        libraryActiveMembers: libraryActiveMembersRes.count || 0,
        libraryCheckedIn: libraryCheckedInRes.count || 0,
      })

      setGettingStarted([
        { task: "Add your first property", href: "/properties/new", done: (propertiesRes.count || 0) > 0 },
        { task: "Create rooms in your property", href: "/rooms/new", done: (roomsRes.data?.length || 0) > 0 },
        { task: "Add your first tenant", href: "/tenants/new", done: (tenantsRes.count || 0) > 0 },
        { task: "Configure charge types", href: "/settings", done: (chargeTypesRes.count || 0) > 0 },
      ])

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  return { loading, userName, stats, monthlyRevenue, paymentStatus, gettingStarted }
}
