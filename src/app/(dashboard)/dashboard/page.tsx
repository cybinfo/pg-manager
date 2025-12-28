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
  Loader2
} from "lucide-react"

interface DashboardStats {
  properties: number
  rooms: number
  tenants: number
  pendingDues: number
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
]

export default function DashboardPage() {
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    properties: 0,
    rooms: 0,
    tenants: 0,
    pendingDues: 0,
  })
  const [gettingStarted, setGettingStarted] = useState<GettingStartedItem[]>([
    { task: "Add your first property", href: "/dashboard/properties/new", done: false },
    { task: "Create rooms in your property", href: "/dashboard/rooms/new", done: false },
    { task: "Add your first tenant", href: "/dashboard/tenants/new", done: false },
    { task: "Configure charge types", href: "/dashboard/settings/charges", done: false },
  ])

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
      const [propertiesRes, roomsRes, tenantsRes, chargesRes, chargeTypesRes] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("charges").select("amount, paid_amount").in("status", ["pending", "partial", "overdue"]),
        supabase.from("charge_types").select("id", { count: "exact", head: true }),
      ])

      // Calculate pending dues
      let pendingDues = 0
      if (chargesRes.data) {
        pendingDues = chargesRes.data.reduce((sum, charge) => {
          return sum + (Number(charge.amount) - Number(charge.paid_amount || 0))
        }, 0)
      }

      setStats({
        properties: propertiesRes.count || 0,
        rooms: roomsRes.count || 0,
        tenants: tenantsRes.count || 0,
        pendingDues,
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
      bgColor: "bg-teal-50",
    },
    {
      name: "Total Rooms",
      value: stats.rooms.toString(),
      icon: Home,
      href: "/dashboard/rooms",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      name: "Active Tenants",
      value: stats.tenants.toString(),
      icon: Users,
      href: "/dashboard/tenants",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      name: "Pending Dues",
      value: `₹${stats.pendingDues.toLocaleString("en-IN")}`,
      icon: CreditCard,
      href: "/dashboard/payments",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ]

  const completedTasks = gettingStarted.filter((item) => item.done).length
  const allTasksDone = completedTasks === gettingStarted.length

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your PG today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting Started */}
        {!allTasksDone && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Getting Started
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {completedTasks}/{gettingStarted.length} completed
                </span>
              </CardTitle>
              <CardDescription>
                Complete these steps to set up your PG management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gettingStarted.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-full ${item.done ? "bg-teal-50" : "bg-muted"}`}>
                        {item.done ? (
                          <CheckCircle className="h-4 w-4 text-teal-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <span className={item.done ? "text-muted-foreground line-through" : ""}>
                        {item.task}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className={allTasksDone ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks you can do right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${allTasksDone ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}>
              {quickActions.map((action) => (
                <Link key={action.name} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-sm">{action.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.properties === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No recent activity yet</p>
              <p className="text-sm text-muted-foreground">
                Start by adding your first property and tenants
              </p>
              <Link href="/dashboard/properties/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-teal-500/50 mb-4" />
              <p className="text-muted-foreground">You&apos;re all set up!</p>
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
