"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Building2,
  Users,
  CreditCard,
  AlertCircle,
  TrendingUp,
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
  BarChart3
} from "lucide-react"

interface DashboardStats {
  properties: number
  rooms: number
  tenants: number
  pendingDues: number
  totalRevenue: number
  totalExpenses: number
}

interface GettingStartedItem {
  task: string
  href: string
  done: boolean
}

const quickActions = [
  { name: "Add Property", href: "/dashboard/properties/new", icon: Building2, color: "from-teal-500 to-emerald-500" },
  { name: "Add Room", href: "/dashboard/rooms/new", icon: Home, color: "from-violet-500 to-purple-500" },
  { name: "Add Tenant", href: "/dashboard/tenants/new", icon: Users, color: "from-sky-500 to-blue-500" },
  { name: "Record Payment", href: "/dashboard/payments/new", icon: CreditCard, color: "from-amber-500 to-orange-500" },
]

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Good morning", icon: Sunrise }
  if (hour < 17) return { text: "Good afternoon", icon: Sun }
  return { text: "Good evening", icon: Moon }
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    properties: 0,
    rooms: 0,
    tenants: 0,
    pendingDues: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  })
  const [gettingStarted, setGettingStarted] = useState<GettingStartedItem[]>([
    { task: "Add your first property", href: "/dashboard/properties/new", done: false },
    { task: "Create rooms in your property", href: "/dashboard/rooms/new", done: false },
    { task: "Add your first tenant", href: "/dashboard/tenants/new", done: false },
    { task: "Configure charge types", href: "/dashboard/settings/charges", done: false },
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

      // Fetch counts in parallel
      const [propertiesRes, roomsRes, tenantsRes, chargesRes, chargeTypesRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("charges").select("amount, paid_amount").in("status", ["pending", "partial", "overdue"]),
        supabase.from("charge_types").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
        supabase.from("expenses").select("amount"),
      ])

      // Calculate pending dues
      let pendingDues = 0
      if (chargesRes.data) {
        pendingDues = chargesRes.data.reduce((sum, charge) => {
          return sum + (Number(charge.amount) - Number(charge.paid_amount || 0))
        }, 0)
      }

      // Calculate total revenue
      let totalRevenue = 0
      if (paymentsRes.data) {
        totalRevenue = paymentsRes.data.reduce((sum, payment) => sum + Number(payment.amount), 0)
      }

      // Calculate total expenses
      let totalExpenses = 0
      if (expensesRes.data) {
        totalExpenses = expensesRes.data.reduce((sum, expense) => sum + Number(expense.amount), 0)
      }

      setStats({
        properties: propertiesRes.count || 0,
        rooms: roomsRes.count || 0,
        tenants: tenantsRes.count || 0,
        pendingDues,
        totalRevenue,
        totalExpenses,
      })

      // Update getting started checklist
      setGettingStarted([
        { task: "Add your first property", href: "/dashboard/properties/new", done: (propertiesRes.count || 0) > 0 },
        { task: "Create rooms in your property", href: "/dashboard/rooms/new", done: (roomsRes.count || 0) > 0 },
        { task: "Add your first tenant", href: "/dashboard/tenants/new", done: (tenantsRes.count || 0) > 0 },
        { task: "Configure charge types", href: "/dashboard/settings/charges", done: (chargeTypesRes.count || 0) > 0 },
      ])

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const statCards = [
    {
      name: "Total Properties",
      value: stats.properties.toString(),
      icon: Building2,
      href: "/dashboard/properties",
      color: "text-teal-600",
      bgColor: "bg-gradient-to-br from-teal-50 to-emerald-50",
      iconBg: "bg-gradient-to-br from-teal-500 to-emerald-500",
    },
    {
      name: "Active Tenants",
      value: stats.tenants.toString(),
      icon: Users,
      href: "/dashboard/tenants",
      color: "text-violet-600",
      bgColor: "bg-gradient-to-br from-violet-50 to-purple-50",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    },
    {
      name: "Pending Dues",
      value: `₹${stats.pendingDues.toLocaleString("en-IN")}`,
      icon: CreditCard,
      href: "/dashboard/payments",
      color: "text-amber-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-orange-50",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      highlight: stats.pendingDues > 0,
    },
    {
      name: "Net Income",
      value: `₹${(stats.totalRevenue - stats.totalExpenses).toLocaleString("en-IN")}`,
      icon: BarChart3,
      href: "/dashboard/reports",
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
    },
  ]

  const completedTasks = gettingStarted.filter((item) => item.done).length
  const allTasksDone = completedTasks === gettingStarted.length

  return (
    <div className="space-y-8">
      {/* Welcome header with greeting */}
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

      {/* Stats grid with animations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card
              variant="interactive"
              className={`${stat.bgColor} border-0 overflow-hidden ${stat.highlight ? "ring-2 ring-amber-300" : ""}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.iconBg} shadow-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting Started */}
        {!allTasksDone && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Getting Started
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {completedTasks}/{gettingStarted.length} completed
                </span>
              </CardTitle>
              <CardDescription>
                Complete these steps to set up your PG management
              </CardDescription>
              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${(completedTasks / gettingStarted.length) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gettingStarted.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      item.done
                        ? "bg-teal-50/50 border-teal-100"
                        : "hover:bg-muted/50 hover:border-teal-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full transition-colors ${
                        item.done ? "bg-gradient-to-br from-teal-500 to-emerald-500" : "bg-muted"
                      }`}>
                        {item.done ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>
                        {item.task}
                      </span>
                    </div>
                    {!item.done && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card variant="elevated" className={allTasksDone ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks you can do right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${allTasksDone ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}>
              {quickActions.map((action) => (
                <Link key={action.name} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-6 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Expenses Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-3xl font-bold text-emerald-600 tabular-nums">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">All time collected payments</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-3xl font-bold text-rose-600 tabular-nums">
                ₹{stats.totalExpenses.toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">All time recorded expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates from your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.properties === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No recent activity yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding your first property and tenants
              </p>
              <Link href="/dashboard/properties/new">
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <p className="text-foreground font-medium">You&apos;re all set up!</p>
              <p className="text-sm text-muted-foreground">
                Activity feed coming soon...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
