"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  Calendar,
  CreditCard,
  User,
  ArrowRight,
  CheckCircle,
  QrCode,
  BookOpen,
  Timer,
  AlertCircle,
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { QuickActionLink } from "@/components/portal"
import { StatsGrid } from "@/components/ui/stat-card"
import { formatDate, formatCurrency } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"

interface DashboardExtra {
  recentAttendance: Array<{
    id: string
    attendance_date: string
    check_in_time: string
    check_out_time: string | null
    hours_spent: number | null
  }>
  recentPayments: Array<{
    id: string
    amount: number
    payment_date: string
    payment_type: string
    payment_method: string
  }>
  totalPaid: number
  totalHoursThisMonth: number
  visitsThisMonth: number
}

export default function MemberHomePage() {
  const { member, loading: memberLoading } = useMemberPortalData()
  const [loading, setLoading] = useState(true)
  const [extra, setExtra] = useState<DashboardExtra>({
    recentAttendance: [],
    recentPayments: [],
    totalPaid: 0,
    totalHoursThisMonth: 0,
    visitsThisMonth: 0,
  })

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      const supabase = createClient()

      // Fetch recent attendance
      const { data: attendance } = await supabase
        .from("library_attendance")
        .select("id, attendance_date, check_in_time, check_out_time, hours_spent")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("check_in_time", { ascending: false })
        .limit(5)

      // Fetch recent payments
      const { data: payments } = await supabase
        .from("library_payments")
        .select("id, amount, payment_date, payment_type, payment_method")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })
        .limit(3)

      // Calculate total paid
      const { data: allPayments } = await supabase
        .from("library_payments")
        .select("amount")
        .eq("member_id", member.id)
        .is("deleted_at", null)

      const totalPaid = allPayments?.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) || 0

      // Calculate this month stats
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const monthStartStr = monthStart.toISOString()

      const { data: monthAttendance } = await supabase
        .from("library_attendance")
        .select("hours_spent")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .gte("attendance_date", monthStartStr.split("T")[0])

      const totalHoursThisMonth = monthAttendance?.reduce(
        (sum: number, a: { hours_spent: number | null }) => sum + (a.hours_spent || 0),
        0
      ) || 0
      const visitsThisMonth = monthAttendance?.length || 0

      setExtra({
        recentAttendance: attendance || [],
        recentPayments: payments || [],
        totalPaid,
        totalHoursThisMonth,
        visitsThisMonth,
      })
      setLoading(false)
    }

    fetchDashboardData()
  }, [member, memberLoading])

  if (memberLoading || loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  const subscription = member.current_subscription
  const hoursPercentUsed = subscription?.hours_included
    ? ((subscription.hours_included - (member.hours_balance || 0)) / subscription.hours_included) * 100
    : 0

  // Calculate days until expiry
  const daysUntilExpiry = subscription?.end_date
    ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {member.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">Here&apos;s your membership overview</p>
      </div>

      {/* Hours Balance Card - Prominent */}
      <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Hours Balance</p>
              <p className="text-4xl font-bold mt-1">
                {member.hours_balance?.toFixed(1) || "0.0"}h
              </p>
              {subscription?.hours_included && (
                <p className="text-purple-100 text-sm mt-2">
                  of {subscription.hours_included}h total
                </p>
              )}
            </div>
            <div className="text-right">
              <Timer className="h-12 w-12 text-purple-200" />
            </div>
          </div>
          {subscription?.hours_included && (
            <div className="mt-4">
              <Progress
                value={100 - hoursPercentUsed}
                className="h-2 bg-purple-400"
              />
              <p className="text-xs text-purple-100 mt-2">
                {member.hours_used?.toFixed(1) || 0}h used
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <StatsGrid
        stats={[
          {
            icon: BookOpen,
            label: "Library",
            value: member.library?.name || "-",
            bgColor: "bg-purple-50 dark:bg-purple-950",
            iconColor: "text-purple-600",
          },
          {
            icon: Clock,
            label: "This Month",
            value: `${extra.totalHoursThisMonth.toFixed(1)}h`,
            bgColor: "bg-emerald-50 dark:bg-emerald-950",
            iconColor: "text-emerald-600",
          },
          {
            icon: Calendar,
            label: "Visits",
            value: extra.visitsThisMonth,
            bgColor: "bg-sky-50 dark:bg-sky-950",
            iconColor: "text-sky-600",
          },
          {
            icon: CreditCard,
            label: "Total Paid",
            value: formatCurrency(extra.totalPaid),
            bgColor: "bg-violet-50 dark:bg-violet-950",
            iconColor: "text-violet-600",
          },
        ]}
      />

      {/* Subscription Info & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-lg">{subscription.plan_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {subscription.status}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valid Until</p>
                    <p className="font-medium">{formatDate(subscription.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Days Remaining</p>
                    <p className={`font-medium ${daysUntilExpiry && daysUntilExpiry <= 7 ? "text-amber-600" : ""}`}>
                      {daysUntilExpiry !== null ? (daysUntilExpiry > 0 ? daysUntilExpiry : 0) : "-"}
                    </p>
                  </div>
                  {member.preferred_slot && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Time Slot</p>
                        <p className="font-medium">{member.preferred_slot}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Member Since</p>
                        <p className="font-medium">{formatDate(member.join_date)}</p>
                      </div>
                    </>
                  )}
                </div>

                {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Reminder:</strong> Your subscription expires in {daysUntilExpiry} days.
                      Please renew to continue uninterrupted access.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No active subscription</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionLink
              href="/member/qr"
              icon={QrCode}
              title="My QR Code"
              description="Quick check-in"
              bgColor="bg-purple-50 dark:bg-purple-950"
              iconColor="text-purple-600"
            />
            <QuickActionLink
              href="/member/attendance"
              icon={Clock}
              title="View Attendance"
              description="Check-in history"
              bgColor="bg-emerald-50 dark:bg-emerald-950"
              iconColor="text-emerald-600"
            />
            <QuickActionLink
              href="/member/payments"
              icon={CreditCard}
              title="Payment History"
              description="View all payments"
              bgColor="bg-sky-50 dark:bg-sky-950"
              iconColor="text-sky-600"
            />
            <QuickActionLink
              href="/member/profile"
              icon={User}
              title="My Profile"
              description="View details"
              bgColor="bg-violet-50 dark:bg-violet-950"
              iconColor="text-violet-600"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
            <CardDescription>Your last 5 check-ins</CardDescription>
          </div>
          <Link href="/member/attendance">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {extra.recentAttendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance records yet</p>
          ) : (
            <div className="space-y-3">
              {extra.recentAttendance.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${att.check_out_time ? "bg-purple-50 dark:bg-purple-950" : "bg-emerald-50 dark:bg-emerald-950"}`}>
                      {att.check_out_time ? (
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(att.attendance_date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(att.check_in_time).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {att.check_out_time && (
                          <>
                            {" - "}
                            {new Date(att.check_out_time).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {att.hours_spent ? (
                      <p className="font-semibold text-purple-600">{att.hours_spent.toFixed(1)}h</p>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
