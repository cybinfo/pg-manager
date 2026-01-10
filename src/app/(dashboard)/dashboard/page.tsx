"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { useAuth, useCurrentContext } from "@/lib/auth"
import Link from "next/link"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart-container"
import {
  Building2,
  Users,
  CreditCard,
  Home,
  Plus,
  ArrowRight,
  CheckCircle,
  Loader2,
  Sun,
  Moon,
  Sunrise,
  Receipt,
  TrendingDown,
  BarChart3,
  FileText,
  Wallet,
  AlertCircle,
  Clock,
  Percent,
  MessageSquare,
  CalendarDays,
} from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface DashboardStats {
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
}

interface GettingStartedItem {
  task: string
  href: string
  done: boolean
}

interface MonthlyRevenue {
  month: string
  amount: number
}

interface PaymentStatus {
  name: string
  value: number
  color: string
  [key: string]: string | number // Index signature for recharts compatibility
}

const quickActionsConfig = [
  { name: "Add Property", href: "/properties/new", icon: Building2, permission: "properties.create" },
  { name: "Add Room", href: "/rooms/new", icon: Home, permission: "rooms.create" },
  { name: "Add Tenant", href: "/tenants/new", icon: Users, permission: "tenants.create" },
  { name: "Record Payment", href: "/payments/new", icon: CreditCard, permission: "payments.create" },
  { name: "Create Bill", href: "/bills/new", icon: FileText, permission: "bills.create" },
  { name: "Add Expense", href: "/expenses/new", icon: Wallet, permission: "expenses.create" },
]

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Good morning", icon: Sunrise }
  if (hour < 17) return { text: "Good afternoon", icon: Sun }
  return { text: "Good evening", icon: Moon }
}

const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"]

export default function DashboardPage() {
  const { hasPermission } = useAuth()
  const { isOwner } = useCurrentContext()
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
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
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus[]>([])
  const [gettingStarted, setGettingStarted] = useState<GettingStartedItem[]>([
    { task: "Add your first property", href: "/properties/new", done: false },
    { task: "Create rooms in your property", href: "/rooms/new", done: false },
    { task: "Add your first tenant", href: "/tenants/new", done: false },
    { task: "Configure charge types", href: "/settings", done: false },
  ])

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Set user name
      if (user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(" ")[0])
      }

      // Calculate date ranges
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Fetch counts in parallel
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
      ] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("total_beds, occupied_beds"),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("charges").select("amount, paid_amount, status").in("status", ["pending", "partial", "overdue"]),
        supabase.from("charge_types").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
        supabase.from("expenses").select("amount"),
        supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("tenants").select("id", { count: "exact", head: true })
          .eq("status", "active")
          .not("expected_exit_date", "is", null)
          .lte("expected_exit_date", thirtyDaysFromNow.toISOString()),
        // Get payments for last 6 months for chart
        supabase.from("payments")
          .select("amount, payment_date")
          .gte("payment_date", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
          .order("payment_date"),
      ])

      // Calculate room stats
      let totalBeds = 0
      let occupiedBeds = 0
      if (roomsRes.data) {
        roomsRes.data.forEach((room: { total_beds?: number; occupied_beds?: number }) => {
          totalBeds += room.total_beds || 0
          occupiedBeds += room.occupied_beds || 0
        })
      }

      // Calculate pending dues and overdue count
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

      // Calculate total revenue
      let totalRevenue = 0
      if (paymentsRes.data) {
        totalRevenue = paymentsRes.data.reduce((sum: number, payment: { amount: number }) => sum + Number(payment.amount), 0)
      }

      // Calculate total expenses
      let totalExpenses = 0
      if (expensesRes.data) {
        totalExpenses = expensesRes.data.reduce((sum: number, expense: { amount: number }) => sum + Number(expense.amount), 0)
      }

      // Process monthly revenue for chart
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const revenueByMonth: Record<string, number> = {}

      // Initialize last 6 months
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

      const revenueData = Object.entries(revenueByMonth).map(([month, amount]) => ({
        month,
        amount,
      }))

      setMonthlyRevenue(revenueData)

      // Payment status for pie chart
      setPaymentStatus([
        { name: "Paid", value: paidCount, color: "#10b981" },
        { name: "Partial", value: partialCount, color: "#f59e0b" },
        { name: "Overdue", value: overdueCount, color: "#ef4444" },
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
      })

      // Update getting started checklist
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

  const occupancyRate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0

  // Check if user has permission (owners always have access)
  const canView = (permission: string) => isOwner || hasPermission(permission)

  // Filter metrics based on permissions
  const allMetricsItems: (MetricItem & { permission?: string })[] = [
    {
      label: "Properties",
      value: stats.properties,
      icon: Building2,
      href: "/properties",
      permission: "properties.view",
    },
    {
      label: "Tenants",
      value: stats.tenants,
      icon: Users,
      href: "/tenants",
      permission: "tenants.view",
    },
    {
      label: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: Receipt,
      href: "/reports",
      permission: "reports.view",
    },
    {
      label: "Pending Dues",
      value: formatCurrency(stats.pendingDues),
      icon: CreditCard,
      highlight: stats.pendingDues > 0,
      href: "/payments",
      permission: "payments.view",
    },
    {
      label: "Expenses",
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingDown,
      href: "/expenses",
      permission: "expenses.view",
    },
    {
      label: "Net Income",
      value: formatCurrency(stats.totalRevenue - stats.totalExpenses),
      icon: BarChart3,
      href: "/reports",
      permission: "reports.view",
    },
  ]

  // Filter metrics based on user permissions
  const metricsItems: MetricItem[] = allMetricsItems
    .filter(item => !item.permission || canView(item.permission))
    .map(({ permission, ...rest }) => rest)

  // Filter quick actions based on permissions
  const quickActions = quickActionsConfig.filter(action => canView(action.permission))

  const completedTasks = gettingStarted.filter((item) => item.done).length
  const allTasksDone = completedTasks === gettingStarted.length

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Welcome header with greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 animate-float">
            <GreetingIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting.text}{userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening with your PG today.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Bar - main stats */}
      {loading ? (
        <div className="bg-white rounded-xl border shadow-sm p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MetricsBar items={metricsItems} />
      )}

      {/* Additional Quick Stats - filtered by permissions */}
      {!loading && stats.properties > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Occupancy Rate - visible to those with rooms.view permission */}
          {canView("rooms.view") && (
            <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Percent className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{occupancyRate}%</p>
                    <p className="text-xs text-teal-600">Occupancy Rate</p>
                  </div>
                </div>
                <p className="text-xs text-teal-600/70 mt-2">
                  {stats.occupiedBeds}/{stats.totalBeds} beds filled
                </p>
              </CardContent>
            </Card>
          )}

          {/* Overdue Payments - visible to those with payments.view permission */}
          {canView("payments.view") && (
            <Link href="/payments">
              <Card className={`h-full ${stats.overdueCount > 0 ? "bg-gradient-to-br from-rose-50 to-red-50 border-rose-100" : "bg-white"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.overdueCount > 0 ? "bg-white" : "bg-slate-100"}`}>
                      <Clock className={`h-4 w-4 ${stats.overdueCount > 0 ? "text-rose-600" : "text-slate-600"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? "text-rose-700" : "text-slate-700"}`}>
                        {stats.overdueCount}
                      </p>
                      <p className={`text-xs ${stats.overdueCount > 0 ? "text-rose-600" : "text-slate-600"}`}>
                        Overdue Payments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Open Complaints - visible to those with complaints.view permission */}
          {canView("complaints.view") && (
            <Link href="/complaints">
              <Card className={`h-full ${stats.openComplaints > 0 ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100" : "bg-white"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.openComplaints > 0 ? "bg-white" : "bg-slate-100"}`}>
                      <MessageSquare className={`h-4 w-4 ${stats.openComplaints > 0 ? "text-amber-600" : "text-slate-600"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.openComplaints > 0 ? "text-amber-700" : "text-slate-700"}`}>
                        {stats.openComplaints}
                      </p>
                      <p className={`text-xs ${stats.openComplaints > 0 ? "text-amber-600" : "text-slate-600"}`}>
                        Open Complaints
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Exiting Soon - visible to those with tenants.view permission */}
          {canView("tenants.view") && (
            <Link href="/tenants">
              <Card className={`h-full ${stats.expiringLeases > 0 ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100" : "bg-white"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.expiringLeases > 0 ? "bg-white" : "bg-slate-100"}`}>
                      <CalendarDays className={`h-4 w-4 ${stats.expiringLeases > 0 ? "text-blue-600" : "text-slate-600"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.expiringLeases > 0 ? "text-blue-700" : "text-slate-700"}`}>
                        {stats.expiringLeases}
                      </p>
                      <p className={`text-xs ${stats.expiringLeases > 0 ? "text-blue-600" : "text-slate-600"}`}>
                        Exiting Soon (30d)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Charts Section - only visible to those with reports.view permission */}
      {!loading && stats.properties > 0 && monthlyRevenue.length > 0 && canView("reports.view") && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Revenue Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer height={192}>
                <BarChart data={monthlyRevenue}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="url(#colorGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Payment Status Pie */}
          {paymentStatus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ChartContainer height={192} className="flex-1">
                    <PieChart>
                      <Pie
                        data={paymentStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {paymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} charges`, ""]}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-2 min-w-[100px]">
                    {paymentStatus.map((status, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-muted-foreground">{status.name}</span>
                        <span className="font-medium">{status.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Getting Started - only show if not complete */}
      {!allTasksDone && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">Getting Started</h2>
                <p className="text-xs text-muted-foreground">
                  {completedTasks} of {gettingStarted.length} completed
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(completedTasks / gettingStarted.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="divide-y">
            {gettingStarted.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  item.done ? "bg-teal-50/30" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={`text-sm ${item.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {item.task}
                  </span>
                </div>
                {!item.done && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - filtered by permissions */}
      {quickActions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <Button variant="outline" size="sm" className="gap-2 hover:bg-slate-50">
                  <action.icon className="h-4 w-4 text-slate-600" />
                  {action.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {stats.properties === 0 && !loading && (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Welcome to ManageKar!</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Get started by adding your first property
          </p>
          <Link href="/properties/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
