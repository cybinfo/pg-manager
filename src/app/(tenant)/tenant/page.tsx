"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Home,
  Building2,
  Calendar,
  IndianRupee,
  CreditCard,
  MessageSquare,
  Bell,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  User
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { PortalStatsGrid, QuickActionLink, PaymentListItem } from "@/components/portal"
import { formatDate, formatCurrency } from "@/lib/format"
import { useTenantPortalData } from "@/lib/hooks/useTenantPortalData"

interface TenantFeatures {
  view_bills: boolean
  view_payments: boolean
  submit_complaints: boolean
  view_notices: boolean
  request_visitors: boolean
  download_receipts: boolean
  update_profile: boolean
}

const defaultTenantFeatures: TenantFeatures = {
  view_bills: true,
  view_payments: true,
  submit_complaints: true,
  view_notices: true,
  request_visitors: false,
  download_receipts: true,
  update_profile: true,
}

export default function TenantHomePage() {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [loading, setLoading] = useState(true)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [openComplaints, setOpenComplaints] = useState(0)
  const [unreadNotices, setUnreadNotices] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      const supabase = createClient()

      // Fetch recent payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method, for_period")
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })
        .limit(3)

      // Fetch open complaints count
      const { count: complaintsCount } = await supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .in("status", ["open", "acknowledged", "in_progress"])

      // Fetch notices count
      const { count: noticesCount } = await supabase
        .from("notices")
        .select("id", { count: "exact", head: true })
        .eq("property_id", tenant.property_id)
        .is("deleted_at", null)
        .eq("is_active", true)

      // Calculate total paid this year
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const { data: yearPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .gte("payment_date", yearStart)

      const totalPaidAmount = yearPayments?.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) || 0

      setRecentPayments(payments || [])
      setOpenComplaints(complaintsCount || 0)
      setUnreadNotices(noticesCount || 0)
      setTotalPaid(totalPaidAmount)
      setLoading(false)
    }

    fetchDashboardData()
  }, [tenant, tenantLoading])


  const getDaysStayed = () => {
    if (!tenant?.check_in_date) return 0
    const checkIn = new Date(tenant.check_in_date)
    const now = new Date()
    return Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (tenantLoading || loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Tenancy</h2>
        <p className="text-muted-foreground">You don&apos;t have an active tenancy record.</p>
      </div>
    )
  }

  const features: TenantFeatures = {
    ...defaultTenantFeatures,
    ...(tenant?.property?.tenant_features || {}),
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome, {tenant.name.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">Here&apos;s your tenancy overview</p>
      </div>

      {/* Quick Stats */}
      <PortalStatsGrid
        stats={[
          {
            icon: Home,
            label: "Room",
            value: tenant.room?.room_number || "-",
            bgColor: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            icon: IndianRupee,
            label: "Monthly Rent",
            value: formatCurrency(tenant.monthly_rent),
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            icon: Calendar,
            label: "Days Stayed",
            value: getDaysStayed(),
            bgColor: "bg-sky-50",
            iconColor: "text-sky-600",
          },
          {
            icon: CreditCard,
            label: "Paid This Year",
            value: formatCurrency(totalPaid),
            bgColor: "bg-violet-50",
            iconColor: "text-violet-600",
          },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Accommodation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-lg">{tenant.property?.name || "Unknown Property"}</p>
              <p className="text-sm text-muted-foreground">
                {tenant.property?.address && `${tenant.property.address}, `}
                {tenant.property?.city || ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Room Number</p>
                <p className="font-medium">{tenant.room?.room_number || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Room Type</p>
                <p className="font-medium capitalize">{tenant.room?.room_type || "Standard"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Check-in Date</p>
                <p className="font-medium">{formatDate(tenant.check_in_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <span className="inline-flex items-center gap-1 text-teal-600 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </span>
              </div>
            </div>

            {tenant.room?.amenities && tenant.room.amenities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {tenant.room.amenities.map((amenity: string) => (
                    <span
                      key={amenity}
                      className="px-2 py-1 bg-muted rounded text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
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
            {features.view_payments && (
              <QuickActionLink
                href="/tenant/payments"
                icon={CreditCard}
                title="View Payments"
                description="Payment history & receipts"
                bgColor="bg-emerald-50"
                iconColor="text-emerald-600"
              />
            )}

            {features.submit_complaints && (
              <QuickActionLink
                href="/tenant/complaints"
                icon={MessageSquare}
                title="Submit Complaint"
                description={
                  openComplaints > 0
                    ? `${openComplaints} open complaint${openComplaints > 1 ? "s" : ""}`
                    : "Report an issue"
                }
                bgColor="bg-amber-50"
                iconColor="text-amber-600"
              />
            )}

            {features.view_notices && (
              <QuickActionLink
                href="/tenant/notices"
                icon={Bell}
                title="View Notices"
                description={
                  unreadNotices > 0
                    ? `${unreadNotices} active notice${unreadNotices > 1 ? "s" : ""}`
                    : "No new notices"
                }
                bgColor="bg-sky-50"
                iconColor="text-sky-600"
              />
            )}

            {features.update_profile && (
              <QuickActionLink
                href="/tenant/profile"
                icon={User}
                title="My Profile"
                description="View & update your details"
                bgColor="bg-violet-50"
                iconColor="text-violet-600"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments - Show only if view_payments is enabled */}
      {features.view_payments && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
              <CardDescription>Your last 3 payments</CardDescription>
            </div>
            <Link href="/tenant/payments">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <PaymentListItem
                    key={payment.id}
                    amount={payment.amount}
                    date={payment.payment_date}
                    method={payment.payment_method}
                    label={payment.for_period || formatDate(payment.payment_date)}
                    statusBgColor="bg-teal-50"
                    statusIconColor="text-teal-600"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
