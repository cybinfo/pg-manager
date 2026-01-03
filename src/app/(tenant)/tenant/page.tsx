"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Home,
  Building2,
  Calendar,
  IndianRupee,
  CreditCard,
  MessageSquare,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  User
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"

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

interface TenantData {
  id: string
  name: string
  phone: string
  monthly_rent: number
  check_in_date: string
  status: string
  property_id: string
  property: {
    name: string
    address: string | null
    city: string
    tenant_features: TenantFeatures | null
  }
  room: {
    room_number: string
    room_type: string
    amenities: string[] | null
  }
}

interface DashboardData {
  tenant: TenantData | null
  recentPayments: any[]
  openComplaints: number
  unreadNotices: number
  totalPaid: number
}

export default function TenantHomePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    tenant: null,
    recentPayments: [],
    openComplaints: 0,
    unreadNotices: 0,
    totalPaid: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Fetch tenant data with property features
      const { data: tenantData } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(name, address, city, tenant_features),
          room:rooms(room_number, room_type, amenities)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!tenantData) {
        setLoading(false)
        return
      }

      // Transform Supabase join arrays to objects (Supabase returns joins as arrays)
      const normalizedTenant = {
        ...tenantData,
        property: Array.isArray(tenantData.property)
          ? tenantData.property[0]
          : tenantData.property,
        room: Array.isArray(tenantData.room)
          ? tenantData.room[0]
          : tenantData.room,
      }

      // Fetch recent payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method, for_period")
        .eq("tenant_id", tenantData.id)
        .order("payment_date", { ascending: false })
        .limit(3)

      // Fetch open complaints count
      const { count: complaintsCount } = await supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantData.id)
        .in("status", ["open", "acknowledged", "in_progress"])

      // Fetch notices count
      const { count: noticesCount } = await supabase
        .from("notices")
        .select("id", { count: "exact", head: true })
        .eq("property_id", tenantData.property_id)
        .eq("is_active", true)

      // Calculate total paid this year
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const { data: yearPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", tenantData.id)
        .gte("payment_date", yearStart)

      const totalPaid = yearPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      setData({
        tenant: normalizedTenant as TenantData,
        recentPayments: payments || [],
        openComplaints: complaintsCount || 0,
        unreadNotices: noticesCount || 0,
        totalPaid,
      })
      setLoading(false)
    }

    fetchData()
  }, [])


  const getDaysStayed = () => {
    if (!data.tenant?.check_in_date) return 0
    const checkIn = new Date(data.tenant.check_in_date)
    const now = new Date()
    return Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data.tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Tenancy</h2>
        <p className="text-muted-foreground">You don&apos;t have an active tenancy record.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome, {data.tenant.name.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">Here&apos;s your tenancy overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Room</p>
                <p className="font-semibold">{data.tenant.room?.room_number || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">{formatCurrency(data.tenant.monthly_rent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-lg">
                <Calendar className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Stayed</p>
                <p className="font-semibold">{getDaysStayed()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid This Year</p>
                <p className="font-semibold">{formatCurrency(data.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <p className="font-semibold text-lg">{data.tenant.property?.name || "Unknown Property"}</p>
              <p className="text-sm text-muted-foreground">
                {data.tenant.property?.address && `${data.tenant.property.address}, `}
                {data.tenant.property?.city || ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Room Number</p>
                <p className="font-medium">{data.tenant.room?.room_number || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Room Type</p>
                <p className="font-medium capitalize">{data.tenant.room?.room_type || "Standard"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Check-in Date</p>
                <p className="font-medium">{formatDate(data.tenant.check_in_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <span className="inline-flex items-center gap-1 text-teal-600 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </span>
              </div>
            </div>

            {data.tenant.room?.amenities && data.tenant.room.amenities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {data.tenant.room.amenities.map((amenity: string) => (
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
            {/* Get tenant features from property, with defaults */}
            {(() => {
              const features: TenantFeatures = {
                ...defaultTenantFeatures,
                ...(data.tenant?.property?.tenant_features || {}),
              }

              return (
                <>
                  {features.view_payments && (
                    <Link href="/tenant/payments" className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg">
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">View Payments</p>
                            <p className="text-xs text-muted-foreground">Payment history & receipts</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}

                  {features.submit_complaints && (
                    <Link href="/tenant/complaints" className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg">
                            <MessageSquare className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">Submit Complaint</p>
                            <p className="text-xs text-muted-foreground">
                              {data.openComplaints > 0
                                ? `${data.openComplaints} open complaint${data.openComplaints > 1 ? "s" : ""}`
                                : "Report an issue"}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}

                  {features.view_notices && (
                    <Link href="/tenant/notices" className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-sky-50 rounded-lg">
                            <Bell className="h-4 w-4 text-sky-600" />
                          </div>
                          <div>
                            <p className="font-medium">View Notices</p>
                            <p className="text-xs text-muted-foreground">
                              {data.unreadNotices > 0
                                ? `${data.unreadNotices} active notice${data.unreadNotices > 1 ? "s" : ""}`
                                : "No new notices"}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}

                  {features.update_profile && (
                    <Link href="/tenant/profile" className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-50 rounded-lg">
                            <User className="h-4 w-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-medium">My Profile</p>
                            <p className="text-xs text-muted-foreground">View & update your details</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments - Show only if view_payments is enabled */}
      {(() => {
        const features: TenantFeatures = {
          ...defaultTenantFeatures,
          ...(data.tenant?.property?.tenant_features || {}),
        }

        if (!features.view_payments) return null

        return (
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
              {data.recentPayments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {data.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-full">
                          <CheckCircle className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.for_period || formatDate(payment.payment_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm capitalize">{payment.payment_method}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
