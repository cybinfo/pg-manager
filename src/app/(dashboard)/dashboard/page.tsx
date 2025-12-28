"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import Link from "next/link"
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
  Wallet
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
  { name: "Add Property", href: "/dashboard/properties/new", icon: Building2 },
  { name: "Add Room", href: "/dashboard/rooms/new", icon: Home },
  { name: "Add Tenant", href: "/dashboard/tenants/new", icon: Users },
  { name: "Record Payment", href: "/dashboard/payments/new", icon: CreditCard },
  { name: "Create Bill", href: "/dashboard/bills/new", icon: FileText },
  { name: "Add Expense", href: "/dashboard/expenses/new", icon: Wallet },
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

  const metricsItems: MetricItem[] = [
    {
      label: "Properties",
      value: stats.properties,
      icon: Building2,
      href: "/dashboard/properties",
    },
    {
      label: "Tenants",
      value: stats.tenants,
      icon: Users,
      href: "/dashboard/tenants",
    },
    {
      label: "Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: Receipt,
      href: "/dashboard/reports",
    },
    {
      label: "Pending Dues",
      value: `₹${stats.pendingDues.toLocaleString("en-IN")}`,
      icon: CreditCard,
      highlight: stats.pendingDues > 0,
      href: "/dashboard/payments",
    },
    {
      label: "Expenses",
      value: `₹${stats.totalExpenses.toLocaleString("en-IN")}`,
      icon: TrendingDown,
      href: "/dashboard/expenses",
    },
    {
      label: "Net Income",
      value: `₹${(stats.totalRevenue - stats.totalExpenses).toLocaleString("en-IN")}`,
      icon: BarChart3,
      href: "/dashboard/reports",
    },
  ]

  const completedTasks = gettingStarted.filter((item) => item.done).length
  const allTasksDone = completedTasks === gettingStarted.length

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

      {/* Metrics Bar - replaces 4 separate stat cards */}
      {loading ? (
        <div className="bg-white rounded-xl border shadow-sm p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MetricsBar items={metricsItems} />
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

      {/* Quick Actions - cleaner inline buttons */}
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

      {/* Empty state for new users */}
      {stats.properties === 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Welcome to ManageKar!</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Get started by adding your first property
          </p>
          <Link href="/dashboard/properties/new">
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
