"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  LogOut,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  ArrowRight
} from "lucide-react"

interface ExitClearanceRaw {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  key_returned: boolean
  created_at: string
  tenant: { id: string; name: string; phone: string }[] | null
  property: { id: string; name: string }[] | null
  room: { room_number: string }[] | null
}

interface ExitClearance {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  key_returned: boolean
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
  }
  property: {
    id: string
    name: string
  }
  room: {
    room_number: string
  }
}

interface TenantOnNoticeRaw {
  id: string
  name: string
  phone: string
  check_in_date: string
  monthly_rent: number
  status: string
  property: { name: string }[] | null
  room: { room_number: string }[] | null
}

interface TenantOnNotice {
  id: string
  name: string
  phone: string
  check_in_date: string
  monthly_rent: number
  status: string
  property: {
    name: string
  }
  room: {
    room_number: string
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  initiated: { label: "Initiated", color: "text-blue-700", bgColor: "bg-blue-100", icon: Clock },
  pending_payment: { label: "Pending Payment", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: AlertCircle },
  cleared: { label: "Cleared", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
}

export default function ExitClearancePage() {
  const [loading, setLoading] = useState(true)
  const [clearances, setClearances] = useState<ExitClearance[]>([])
  const [tenantsOnNotice, setTenantsOnNotice] = useState<TenantOnNotice[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch exit clearances
      const { data: clearanceData } = await supabase
        .from("exit_clearance")
        .select(`
          *,
          tenant:tenants(id, name, phone),
          property:properties(id, name),
          room:rooms(room_number)
        `)
        .order("created_at", { ascending: false })

      // Transform exit clearances
      const transformedClearances: ExitClearance[] = ((clearanceData as ExitClearanceRaw[]) || [])
        .filter((c) => c.tenant && c.tenant.length > 0 && c.property && c.property.length > 0 && c.room && c.room.length > 0)
        .map((c) => ({
          ...c,
          tenant: c.tenant![0],
          property: c.property![0],
          room: c.room![0],
        }))
      setClearances(transformedClearances)

      // Fetch tenants on notice period (without exit clearance)
      const { data: noticeTenants } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          check_in_date,
          monthly_rent,
          status,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("status", "notice_period")
        .order("name")

      // Transform and filter out tenants who already have exit clearance
      const clearanceTenantIds = transformedClearances.map((c) => c.tenant.id)
      const transformedNoticeTenants: TenantOnNotice[] = ((noticeTenants as TenantOnNoticeRaw[]) || [])
        .filter((t) => t.property && t.property.length > 0 && t.room && t.room.length > 0)
        .map((t) => ({
          ...t,
          property: t.property![0],
          room: t.room![0],
        }))
        .filter((t) => !clearanceTenantIds.includes(t.id))

      setTenantsOnNotice(transformedNoticeTenants)
      setLoading(false)
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount)
    return `₹${absAmount.toLocaleString("en-IN")}`
  }

  const filteredClearances = clearances.filter((clearance) => {
    const matchesSearch =
      clearance.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clearance.property.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || clearance.settlement_status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const initiatedCount = clearances.filter((c) => c.settlement_status === "initiated").length
  const pendingCount = clearances.filter((c) => c.settlement_status === "pending_payment").length
  const clearedCount = clearances.filter((c) => c.settlement_status === "cleared").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Exit Clearance</h1>
          <p className="text-muted-foreground">Manage tenant checkouts and settlements</p>
        </div>
        <Link href="/dashboard/exit-clearance/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Initiate Checkout
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{initiatedCount}</p>
                <p className="text-xs text-muted-foreground">Initiated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clearedCount}</p>
                <p className="text-xs text-muted-foreground">Cleared</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantsOnNotice.length}</p>
                <p className="text-xs text-muted-foreground">On Notice</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants on Notice */}
      {tenantsOnNotice.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Tenants on Notice Period
            </h3>
            <div className="space-y-2">
              {tenantsOnNotice.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.property.name} • Room {tenant.room.room_number}
                      </p>
                    </div>
                  </div>
                  <Link href={`/dashboard/exit-clearance/new?tenant=${tenant.id}`}>
                    <Button size="sm">
                      Start Clearance
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="initiated">Initiated</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Clearances List */}
      {filteredClearances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LogOut className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No exit clearances</h3>
            <p className="text-muted-foreground text-center mb-4">
              {clearances.length === 0
                ? "No checkout processes have been initiated"
                : "No clearances match your search criteria"}
            </p>
            {clearances.length === 0 && (
              <Link href="/dashboard/exit-clearance/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Initiate First Checkout
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClearances.map((clearance) => {
            const StatusIcon = statusConfig[clearance.settlement_status]?.icon || Clock
            const isRefund = clearance.final_amount < 0

            return (
              <Link key={clearance.id} href={`/dashboard/exit-clearance/${clearance.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Tenant Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{clearance.tenant.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {clearance.property.name}
                            <Home className="h-3 w-3 ml-1" />
                            Room {clearance.room.room_number}
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Exit Date</p>
                          <p className="font-medium">{formatDate(clearance.expected_exit_date)}</p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {isRefund ? "Refund" : "Due"}
                        </p>
                        <p className={`text-lg font-bold ${isRefund ? "text-green-600" : "text-red-600"}`}>
                          {isRefund ? "-" : "+"}{formatCurrency(clearance.final_amount)}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig[clearance.settlement_status]?.bgColor} ${statusConfig[clearance.settlement_status]?.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[clearance.settlement_status]?.label}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {clearance.room_inspection_done && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Inspected
                            </span>
                          )}
                          {clearance.key_returned && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Key
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
