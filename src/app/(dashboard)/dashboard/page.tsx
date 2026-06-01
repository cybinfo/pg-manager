"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { useAuth, useCurrentContext } from "@/lib/auth"
import { PermissionGuard } from "@/components/auth/permission-guard"
import Link from "next/link"
import {
  BarChart,
  Bar,
  CartesianGrid,
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
  Clock,
  Percent,
  MessageSquare,
  CalendarDays,
  Library,
  Armchair,
} from "lucide-react"
import { ModuleGuard } from "@/components/auth/module-guard"
import { InfoBanner } from "@/components/ui/info-banner"
import { formatCurrency, formatCurrencyTick, calculateOccupancyRate, getGreeting } from "@/lib/format"
import { brandGradient } from "@/lib/design-tokens"
import { useDashboardData } from "@/lib/hooks/useDashboardData"
import type { PaymentStatus } from "@/lib/hooks/useDashboardData"

const quickActionsConfig = [
  { name: "Add Entity", href: "/entities/new", icon: Building2, permission: "properties.create" },
  { name: "Add Room", href: "/rooms/new", icon: Home, permission: "rooms.create" },
  { name: "Add Tenant", href: "/tenants/new", icon: Users, permission: "tenants.create" },
  { name: "Record Payment", href: "/payments/new", icon: CreditCard, permission: "payments.create" },
  { name: "Create Bill", href: "/bills/new", icon: FileText, permission: "bills.create" },
  { name: "Add Expense", href: "/expenses/new", icon: Wallet, permission: "expenses.create" },
]

function getGreetingIcon(): typeof Sun {
  const hour = new Date().getHours()
  if (hour < 12) return Sunrise
  if (hour < 17) return Sun
  return Moon
}

export default function DashboardPage() {
  const { hasPermission, user } = useAuth()
  const { isOwner } = useCurrentContext()
  const { loading, userName, stats, monthlyRevenue, paymentStatus, gettingStarted } = useDashboardData()

  const greetingText = getGreeting()
  const GreetingIcon = getGreetingIcon()

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
    .map(({ permission: _permission, ...rest }) => rest)

  // Filter quick actions based on permissions
  const quickActions = quickActionsConfig.filter(action => canView(action.permission))

  const completedTasks = gettingStarted.filter((item) => item.done).length
  const allTasksDone = completedTasks === gettingStarted.length

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  // AUTH-001: Dashboard accessible to staff with any core permission
  // Content is filtered per-permission basis inside the page
  return (
    <PermissionGuard
      permission={[
        "properties.view",
        "tenants.view",
        "payments.view",
        "bills.view",
        "rooms.view",
        "reports.view",
      ]}
    >
    <div className="space-y-6">
      <InfoBanner storageKey="dashboard-welcome" variant="tip">
        Welcome to ManageKar! Start by adding a property, then rooms and tenants. Use the sidebar to navigate between modules.
      </InfoBanner>

      {/* Welcome header with greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl ${brandGradient.solid} flex items-center justify-center shadow-lg ${brandGradient.shadow} animate-float`}>
            <GreetingIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greetingText}{userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-muted-foreground">
              {isOwner
                ? "Here's your business overview for today."
                : "Here's your operational summary for today."}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Bar - main stats */}
      {loading ? (
        <div className="bg-card rounded-xl border shadow-sm p-8 flex items-center justify-center">
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
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card rounded-lg shadow-sm">
                    <Percent className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{occupancyRate}%</p>
                    <p className="text-xs text-primary/80">Occupancy Rate</p>
                  </div>
                </div>
                <p className="text-xs text-primary/60 mt-2">
                  {stats.occupiedBeds}/{stats.totalBeds} beds filled
                </p>
              </CardContent>
            </Card>
          )}

          {/* Overdue Payments - visible to those with payments.view permission */}
          {canView("payments.view") && (
            <Link href="/payments">
              <Card className={`h-full ${stats.overdueCount > 0 ? "bg-destructive/10 border-destructive/20" : "bg-card"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.overdueCount > 0 ? "bg-card" : "bg-muted"}`}>
                      <Clock className={`h-4 w-4 ${stats.overdueCount > 0 ? "text-destructive" : "text-foreground"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
                        {stats.overdueCount}
                      </p>
                      <p className={`text-xs ${stats.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
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
              <Card className={`h-full ${stats.openComplaints > 0 ? "bg-warning/10 border-warning/20" : "bg-card"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.openComplaints > 0 ? "bg-card" : "bg-muted"}`}>
                      <MessageSquare className={`h-4 w-4 ${stats.openComplaints > 0 ? "text-warning" : "text-foreground"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.openComplaints > 0 ? "text-warning" : "text-foreground"}`}>
                        {stats.openComplaints}
                      </p>
                      <p className={`text-xs ${stats.openComplaints > 0 ? "text-warning" : "text-foreground"}`}>
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
              <Card className={`h-full ${stats.expiringLeases > 0 ? "bg-info/10 border-info/20" : "bg-card"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${stats.expiringLeases > 0 ? "bg-card" : "bg-muted"}`}>
                      <CalendarDays className={`h-4 w-4 ${stats.expiringLeases > 0 ? "text-info" : "text-foreground"}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${stats.expiringLeases > 0 ? "text-info" : "text-foreground"}`}>
                        {stats.expiringLeases}
                      </p>
                      <p className={`text-xs ${stats.expiringLeases > 0 ? "text-info" : "text-foreground"}`}>
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

      {/* Library Overview - only show if user has libraries */}
      {!loading && stats.libraries > 0 && (
        <ModuleGuard module="members">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-100 dark:border-purple-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card rounded-lg shadow-sm">
                    <Library className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-base font-medium text-purple-900 dark:text-purple-100">Library Overview</CardTitle>
                </div>
                <Link href="/library">
                  <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/library" className="block">
                  <div className="p-3 bg-card/70 rounded-lg hover:bg-card transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Library className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">Libraries</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.libraries}</p>
                  </div>
                </Link>
                <Link href="/library-members" className="block">
                  <div className="p-3 bg-card/70 rounded-lg hover:bg-card transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">Active Members</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.libraryActiveMembers}</p>
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70">{stats.libraryMembers} total</p>
                  </div>
                </Link>
                <Link href="/library-attendance" className="block">
                  <div className="p-3 bg-card/70 rounded-lg hover:bg-card transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-success" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">Checked In Now</span>
                    </div>
                    <p className="text-2xl font-bold text-success">{stats.libraryCheckedIn}</p>
                  </div>
                </Link>
                <Link href="/library-attendance/new" className="block">
                  <div className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                    <Armchair className="h-5 w-5" />
                    <span className="font-medium">Quick Check-In</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </ModuleGuard>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={formatCurrencyTick}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="url(#colorGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" />
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
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${brandGradient.solid} flex items-center justify-center`}>
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
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${brandGradient.horizontal} transition-all duration-500`}
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
                  item.done ? "bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <div className={`h-5 w-5 rounded-full ${brandGradient.solid} flex items-center justify-center`}>
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
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
                <Button variant="outline" size="sm" className="gap-2 hover:bg-muted">
                  <action.icon className="h-4 w-4 text-foreground" />
                  {action.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {stats.properties === 0 && !loading && (
        <div className="bg-card rounded-xl border shadow-sm p-8 text-center">
          <div className={`h-16 w-16 rounded-2xl ${brandGradient.solid} flex items-center justify-center mx-auto mb-4 shadow-lg ${brandGradient.shadow}`}>
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Welcome to ManageKar!</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Get started by adding your first property
          </p>
          <Link href="/entities/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </Link>
        </div>
      )}
    </div>
    </PermissionGuard>
  )
}
