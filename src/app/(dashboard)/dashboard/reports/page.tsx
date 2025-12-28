"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  Loader2,
  Building2,
  Users,
  Home,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

interface Property {
  id: string
  name: string
}

interface ReportData {
  // Occupancy
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  maintenanceRooms: number
  totalBeds: number
  occupiedBeds: number
  occupancyRate: number

  // Tenants
  totalTenants: number
  activeTenants: number
  tenantsOnNotice: number
  newTenantsThisMonth: number
  exitsThisMonth: number

  // Revenue
  totalCollectedThisMonth: number
  totalCollectedLastMonth: number
  revenueGrowth: number
  averageRent: number

  // Dues
  totalPendingDues: number
  tenantsWithDues: number
  overdueAmount: number

  // Complaints
  openComplaints: number
  resolvedThisMonth: number
  avgResolutionDays: number

  // Property-wise data
  propertyStats: {
    id: string
    name: string
    totalRooms: number
    occupiedRooms: number
    revenue: number
    pendingDues: number
  }[]

  // Monthly revenue trend
  monthlyRevenue: {
    month: string
    amount: number
  }[]

  // Payment method breakdown
  paymentMethods: {
    method: string
    count: number
    amount: number
  }[]
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [dateRange, setDateRange] = useState<string>("this_month")

  useEffect(() => {
    fetchReportData()
  }, [selectedProperty, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch all required data in parallel
      const [
        propertiesRes,
        roomsRes,
        tenantsRes,
        paymentsRes,
        complaintsRes
      ] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("rooms").select("id, property_id, status, total_beds"),
        supabase.from("tenants").select("id, property_id, status, monthly_rent, check_in_date, check_out_date, created_at"),
        supabase.from("payments").select("id, property_id, amount, payment_method, payment_date, created_at"),
        supabase.from("complaints").select("id, property_id, status, created_at, resolved_at"),
      ])

      const propertiesData = propertiesRes.data || []
      const roomsData = roomsRes.data || []
      const tenantsData = tenantsRes.data || []
      const paymentsData = paymentsRes.data || []
      const complaintsData = complaintsRes.data || []

      setProperties(propertiesData)

      // Filter by property if selected
      const filterByProperty = (items: any[]) => {
        if (selectedProperty === "all") return items
        return items.filter((item) => item.property_id === selectedProperty)
      }

      const filteredRooms = filterByProperty(roomsData)
      const filteredTenants = filterByProperty(tenantsData)
      const filteredPayments = filterByProperty(paymentsData)
      const filteredComplaints = filterByProperty(complaintsData)

      // Date calculations
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      // Occupancy calculations
      const totalRooms = filteredRooms.length
      const occupiedRooms = filteredRooms.filter((r) => r.status === "occupied").length
      const availableRooms = filteredRooms.filter((r) => r.status === "available").length
      const maintenanceRooms = filteredRooms.filter((r) => r.status === "maintenance").length
      const totalBeds = filteredRooms.reduce((sum, r) => sum + (r.total_beds || 1), 0)
      const activeTenants = filteredTenants.filter((t) => t.status === "active").length
      const occupancyRate = totalBeds > 0 ? (activeTenants / totalBeds) * 100 : 0

      // Tenant calculations
      const totalTenants = filteredTenants.length
      const tenantsOnNotice = filteredTenants.filter((t) => t.status === "notice_period").length
      const newTenantsThisMonth = filteredTenants.filter((t) => {
        const createdAt = new Date(t.created_at)
        return createdAt >= thisMonthStart
      }).length
      const exitsThisMonth = filteredTenants.filter((t) => {
        if (!t.check_out_date) return false
        const checkOut = new Date(t.check_out_date)
        return checkOut >= thisMonthStart && checkOut <= now
      }).length

      // Revenue calculations
      const thisMonthPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= thisMonthStart && paymentDate <= now
      })
      const lastMonthPayments = filteredPayments.filter((p) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd
      })

      const totalCollectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const totalCollectedLastMonth = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const revenueGrowth = totalCollectedLastMonth > 0
        ? ((totalCollectedThisMonth - totalCollectedLastMonth) / totalCollectedLastMonth) * 100
        : 0

      const activeTenantsWithRent = filteredTenants.filter((t) => t.status === "active" && t.monthly_rent)
      const averageRent = activeTenantsWithRent.length > 0
        ? activeTenantsWithRent.reduce((sum, t) => sum + Number(t.monthly_rent), 0) / activeTenantsWithRent.length
        : 0

      // Dues calculations (simplified - would need charges table for accurate calculation)
      const expectedMonthlyRevenue = activeTenantsWithRent.reduce((sum, t) => sum + Number(t.monthly_rent), 0)
      const totalPendingDues = Math.max(0, expectedMonthlyRevenue - totalCollectedThisMonth)
      const tenantsWithDues = Math.floor(activeTenants * (totalPendingDues / expectedMonthlyRevenue || 0))

      // Complaints calculations
      const openComplaints = filteredComplaints.filter((c) =>
        c.status === "open" || c.status === "acknowledged" || c.status === "in_progress"
      ).length
      const resolvedThisMonth = filteredComplaints.filter((c) => {
        if (!c.resolved_at) return false
        const resolvedAt = new Date(c.resolved_at)
        return resolvedAt >= thisMonthStart
      }).length

      // Average resolution time
      const resolvedComplaints = filteredComplaints.filter((c) => c.resolved_at)
      const avgResolutionDays = resolvedComplaints.length > 0
        ? resolvedComplaints.reduce((sum, c) => {
            const created = new Date(c.created_at)
            const resolved = new Date(c.resolved_at)
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / resolvedComplaints.length
        : 0

      // Property-wise stats
      const propertyStats = propertiesData.map((property) => {
        const propRooms = roomsData.filter((r) => r.property_id === property.id)
        const propPayments = paymentsData.filter((p) => {
          const paymentDate = new Date(p.payment_date)
          return p.property_id === property.id && paymentDate >= thisMonthStart
        })
        const propTenants = tenantsData.filter((t) => t.property_id === property.id && t.status === "active")

        return {
          id: property.id,
          name: property.name,
          totalRooms: propRooms.length,
          occupiedRooms: propRooms.filter((r) => r.status === "occupied").length,
          revenue: propPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          pendingDues: propTenants.reduce((sum, t) => sum + Number(t.monthly_rent || 0), 0) -
            propPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        }
      })

      // Monthly revenue trend (last 6 months)
      const monthlyRevenue = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthPayments = filteredPayments.filter((p) => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate >= monthStart && paymentDate <= monthEnd
        })
        monthlyRevenue.push({
          month: monthNames[monthStart.getMonth()],
          amount: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        })
      }

      // Payment method breakdown
      const methodCounts: Record<string, { count: number; amount: number }> = {}
      thisMonthPayments.forEach((p) => {
        const method = p.payment_method || "other"
        if (!methodCounts[method]) {
          methodCounts[method] = { count: 0, amount: 0 }
        }
        methodCounts[method].count++
        methodCounts[method].amount += Number(p.amount)
      })
      const paymentMethods = Object.entries(methodCounts).map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
      }))

      setReportData({
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        totalBeds,
        occupiedBeds: activeTenants,
        occupancyRate,
        totalTenants,
        activeTenants,
        tenantsOnNotice,
        newTenantsThisMonth,
        exitsThisMonth,
        totalCollectedThisMonth,
        totalCollectedLastMonth,
        revenueGrowth,
        averageRent,
        totalPendingDues: Math.max(0, totalPendingDues),
        tenantsWithDues: Math.max(0, tenantsWithDues),
        overdueAmount: 0,
        openComplaints,
        resolvedThisMonth,
        avgResolutionDays,
        propertyStats,
        monthlyRevenue,
        paymentMethods,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (type: string) => {
    if (!reportData) return

    let csvContent = ""
    let filename = ""

    switch (type) {
      case "summary":
        filename = "pg-manager-summary-report.csv"
        csvContent = [
          ["Metric", "Value"],
          ["Total Rooms", reportData.totalRooms],
          ["Occupied Rooms", reportData.occupiedRooms],
          ["Available Rooms", reportData.availableRooms],
          ["Occupancy Rate", `${reportData.occupancyRate.toFixed(1)}%`],
          ["Active Tenants", reportData.activeTenants],
          ["New Tenants (This Month)", reportData.newTenantsThisMonth],
          ["Revenue (This Month)", `₹${reportData.totalCollectedThisMonth.toLocaleString("en-IN")}`],
          ["Revenue Growth", `${reportData.revenueGrowth.toFixed(1)}%`],
          ["Pending Dues", `₹${reportData.totalPendingDues.toLocaleString("en-IN")}`],
          ["Open Complaints", reportData.openComplaints],
        ].map((row) => row.join(",")).join("\n")
        break

      case "properties":
        filename = "pg-manager-property-report.csv"
        csvContent = [
          ["Property", "Total Rooms", "Occupied", "Occupancy %", "Revenue", "Pending Dues"],
          ...reportData.propertyStats.map((p) => [
            p.name,
            p.totalRooms,
            p.occupiedRooms,
            p.totalRooms > 0 ? `${((p.occupiedRooms / p.totalRooms) * 100).toFixed(1)}%` : "0%",
            `₹${p.revenue.toLocaleString("en-IN")}`,
            `₹${Math.max(0, p.pendingDues).toLocaleString("en-IN")}`,
          ]),
        ].map((row) => row.join(",")).join("\n")
        break

      case "revenue":
        filename = "pg-manager-revenue-report.csv"
        csvContent = [
          ["Month", "Revenue"],
          ...reportData.monthlyRevenue.map((m) => [
            m.month,
            `₹${m.amount.toLocaleString("en-IN")}`,
          ]),
        ].map((row) => row.join(",")).join("\n")
        break

      default:
        return
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  const maxRevenue = Math.max(...reportData.monthlyRevenue.map((m) => m.amount), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analytics and insights for your PG business</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => exportToCSV("summary")}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold">{reportData.occupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {reportData.occupiedBeds}/{reportData.totalBeds} beds
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.occupancyRate >= 80 ? "bg-green-100" : reportData.occupancyRate >= 50 ? "bg-yellow-100" : "bg-red-100"}`}>
                <Home className={`h-5 w-5 ${reportData.occupancyRate >= 80 ? "text-green-600" : reportData.occupancyRate >= 50 ? "text-yellow-600" : "text-red-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue (This Month)</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalCollectedThisMonth)}</p>
                <div className={`flex items-center text-xs ${reportData.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {reportData.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(reportData.revenueGrowth).toFixed(1)}% vs last month
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Tenants */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold">{reportData.activeTenants}</p>
                <p className="text-xs text-muted-foreground">
                  +{reportData.newTenantsThisMonth} this month
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Dues */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Dues</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalPendingDues)}</p>
                <p className="text-xs text-muted-foreground">
                  ~{reportData.tenantsWithDues} tenants
                </p>
              </div>
              <div className={`p-3 rounded-full ${reportData.totalPendingDues > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <AlertCircle className={`h-5 w-5 ${reportData.totalPendingDues > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportToCSV("revenue")}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.monthlyRevenue.map((month, index) => (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-10">{month.month}</span>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(month.amount / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">
                    {formatCurrency(month.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>This month&apos;s breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.paymentMethods.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                No payments this month
              </div>
            ) : (
              <div className="space-y-4">
                {reportData.paymentMethods.map((method) => {
                  const total = reportData.paymentMethods.reduce((sum, m) => sum + m.amount, 0)
                  const percentage = total > 0 ? (method.amount / total) * 100 : 0
                  const methodLabels: Record<string, string> = {
                    cash: "Cash",
                    upi: "UPI",
                    bank_transfer: "Bank Transfer",
                    cheque: "Cheque",
                    card: "Card",
                    other: "Other",
                  }
                  return (
                    <div key={method.method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{methodLabels[method.method] || method.method}</span>
                        <span className="text-muted-foreground">
                          {method.count} payments • {formatCurrency(method.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property-wise Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Property Performance</CardTitle>
              <CardDescription>Comparison across all properties</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportToCSV("properties")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportData.propertyStats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No properties found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Property</th>
                    <th className="text-center py-3 px-2 font-medium">Rooms</th>
                    <th className="text-center py-3 px-2 font-medium">Occupancy</th>
                    <th className="text-right py-3 px-2 font-medium">Revenue</th>
                    <th className="text-right py-3 px-2 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.propertyStats.map((property) => {
                    const occupancyRate = property.totalRooms > 0
                      ? (property.occupiedRooms / property.totalRooms) * 100
                      : 0
                    return (
                      <tr key={property.id} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{property.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-muted-foreground">
                            {property.occupiedRooms}/{property.totalRooms}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            occupancyRate >= 80
                              ? "bg-green-100 text-green-700"
                              : occupancyRate >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {occupancyRate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-600">
                          {formatCurrency(property.revenue)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {property.pendingDues > 0 ? (
                            <span className="text-red-600">{formatCurrency(property.pendingDues)}</span>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Room Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Occupied</span>
                </div>
                <span className="font-medium">{reportData.occupiedRooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Available</span>
                </div>
                <span className="font-medium">{reportData.availableRooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Maintenance</span>
                </div>
                <span className="font-medium">{reportData.maintenanceRooms}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenant Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-medium">{reportData.activeTenants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On Notice</span>
                <span className="font-medium text-yellow-600">{reportData.tenantsOnNotice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New This Month</span>
                <span className="font-medium text-green-600">+{reportData.newTenantsThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exits This Month</span>
                <span className="font-medium text-red-600">-{reportData.exitsThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaints Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open</span>
                <span className={`font-medium ${reportData.openComplaints > 0 ? "text-red-600" : "text-green-600"}`}>
                  {reportData.openComplaints}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolved (This Month)</span>
                <span className="font-medium text-green-600">{reportData.resolvedThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Resolution Time</span>
                <span className="font-medium">
                  {reportData.avgResolutionDays > 0 ? `${reportData.avgResolutionDays.toFixed(1)} days` : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {reportData.occupancyRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Low Occupancy</p>
                  <p className="text-sm text-yellow-700">
                    Occupancy is at {reportData.occupancyRate.toFixed(1)}%. Consider marketing or adjusting pricing.
                  </p>
                </div>
              </div>
            )}
            {reportData.totalPendingDues > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <IndianRupee className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Pending Collections</p>
                  <p className="text-sm text-red-700">
                    {formatCurrency(reportData.totalPendingDues)} in dues. Send payment reminders.
                  </p>
                </div>
              </div>
            )}
            {reportData.openComplaints > 5 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">Open Complaints</p>
                  <p className="text-sm text-orange-700">
                    {reportData.openComplaints} complaints pending. Review and resolve them.
                  </p>
                </div>
              </div>
            )}
            {reportData.revenueGrowth > 10 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Revenue Growing</p>
                  <p className="text-sm text-green-700">
                    Revenue increased by {reportData.revenueGrowth.toFixed(1)}% compared to last month!
                  </p>
                </div>
              </div>
            )}
            {reportData.newTenantsThisMonth > reportData.exitsThisMonth && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Positive Tenant Flow</p>
                  <p className="text-sm text-blue-700">
                    Net gain of {reportData.newTenantsThisMonth - reportData.exitsThisMonth} tenants this month.
                  </p>
                </div>
              </div>
            )}
            {reportData.occupancyRate >= 90 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">High Occupancy</p>
                  <p className="text-sm text-green-700">
                    Excellent! {reportData.occupancyRate.toFixed(1)}% occupancy. Consider expanding.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
