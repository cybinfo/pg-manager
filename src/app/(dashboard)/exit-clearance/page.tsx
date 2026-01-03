"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import {
  LogOut,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  ArrowRight
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"

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
  property: { id: string; name: string }[] | null
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
    id: string
    name: string
  }
  room: {
    room_number: string
  }
}

interface Property {
  id: string
  name: string
}

export default function ExitClearancePage() {
  const [loading, setLoading] = useState(true)
  const [clearances, setClearances] = useState<ExitClearance[]>([])
  const [tenantsOnNotice, setTenantsOnNotice] = useState<TenantOnNotice[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  // Filter state
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch properties for filter
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")

      setProperties(propertiesData || [])

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
          property:properties(id, name),
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

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "initiated", label: "Initiated" },
        { value: "pending_payment", label: "Pending Payment" },
        { value: "cleared", label: "Cleared" },
      ],
    },
    {
      id: "date",
      label: "Exit Date",
      type: "date-range",
    },
  ]

  // Apply filters
  const filteredClearances = clearances.filter((clearance) => {
    // Property filter
    if (filters.property && filters.property !== "all" && clearance.property.id !== filters.property) {
      return false
    }

    // Status filter
    if (filters.status && filters.status !== "all" && clearance.settlement_status !== filters.status) {
      return false
    }

    // Date range filter
    if (filters.date_from) {
      const exitDate = new Date(clearance.expected_exit_date)
      const fromDate = new Date(filters.date_from)
      if (exitDate < fromDate) return false
    }
    if (filters.date_to) {
      const exitDate = new Date(clearance.expected_exit_date)
      const toDate = new Date(filters.date_to)
      if (exitDate > toDate) return false
    }

    return true
  })

  // Stats
  const initiatedCount = clearances.filter((c) => c.settlement_status === "initiated").length
  const pendingCount = clearances.filter((c) => c.settlement_status === "pending_payment").length
  const clearedCount = clearances.filter((c) => c.settlement_status === "cleared").length

  const metricsItems: MetricItem[] = [
    { label: "Total", value: clearances.length, icon: LogOut },
    { label: "Initiated", value: initiatedCount, icon: Clock },
    { label: "Pending Payment", value: pendingCount, icon: AlertCircle, highlight: pendingCount > 0 },
    { label: "Cleared", value: clearedCount, icon: CheckCircle },
    { label: "On Notice", value: tenantsOnNotice.length, icon: User, highlight: tenantsOnNotice.length > 0 },
  ]

  // Table columns
  const columns: Column<ExitClearance>[] = [
    {
      key: "tenant",
      header: "Tenant",
      width: "primary",
      render: (clearance) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {clearance.tenant.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{clearance.tenant.name}</div>
            <div className="text-xs text-muted-foreground">{clearance.tenant.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property / Room",
      width: "secondary",
      render: (clearance) => (
        <div className="text-sm min-w-0">
          <div className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">{clearance.property.name}</span>
          </div>
          <div className="text-xs text-muted-foreground">Room {clearance.room.room_number}</div>
        </div>
      ),
    },
    {
      key: "expected_exit_date",
      header: "Exit Date",
      width: "tertiary",
      render: (clearance) => (
        <span className="text-sm">{formatDate(clearance.expected_exit_date)}</span>
      ),
    },
    {
      key: "final_amount",
      header: "Amount",
      width: "amount",
      render: (clearance) => {
        const isRefund = clearance.final_amount < 0
        return (
          <div className="text-right">
            <span className={`font-medium ${isRefund ? "text-green-600" : "text-red-600"}`}>
              {isRefund ? "-" : "+"}{formatCurrency(Math.abs(clearance.final_amount))}
            </span>
            <div className="text-xs text-muted-foreground">
              {isRefund ? "Refund" : "Due"}
            </div>
          </div>
        )
      },
    },
    {
      key: "settlement_status",
      header: "Status",
      width: "status",
      render: (clearance) => {
        const statusMap: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string }> = {
          initiated: { variant: "muted", label: "Initiated" },
          pending_payment: { variant: "warning", label: "Pending" },
          cleared: { variant: "success", label: "Cleared" },
        }
        const status = statusMap[clearance.settlement_status] || { variant: "muted", label: clearance.settlement_status }
        return (
          <div className="space-y-1">
            <TableBadge variant={status.variant}>{status.label}</TableBadge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {clearance.room_inspection_done && (
                <span title="Room Inspected">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </span>
              )}
              {clearance.key_returned && (
                <span title="Key Returned">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </span>
              )}
            </div>
          </div>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <FeatureGuard feature="exitClearance">
      <PermissionGuard permission="exit_clearance.initiate">
        <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Exit Clearance"
        description="Manage tenant checkouts and settlements"
        icon={LogOut}
        breadcrumbs={[{ label: "Exit Clearance" }]}
        actions={
          <Link href="/exit-clearance/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Initiate Checkout
            </Button>
          </Link>
        }
      />

      {/* Metrics */}
      <MetricsBar items={metricsItems} />

      {/* Tenants on Notice Alert */}
      {tenantsOnNotice.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              Tenants on Notice Period ({tenantsOnNotice.length})
            </h3>
            <div className="space-y-2">
              {tenantsOnNotice.slice(0, 3).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100"
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
                  <Link href={`/exit-clearance/new?tenant=${tenant.id}`}>
                    <Button size="sm" variant="outline">
                      Start Clearance
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
              {tenantsOnNotice.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{tenantsOnNotice.length - 3} more tenants on notice
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredClearances}
        keyField="id"
        searchable
        searchFields={["tenant", "property"] as any}
        searchPlaceholder="Search by tenant or property..."
        href={(clearance) => `/exit-clearance/${clearance.id}`}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <LogOut className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No exit clearances</h3>
            <p className="text-muted-foreground text-center mb-4">
              {clearances.length === 0
                ? "No checkout processes have been initiated"
                : "No clearances match your filters"}
            </p>
            {clearances.length === 0 && (
              <Link href="/exit-clearance/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Initiate First Checkout
                </Button>
              </Link>
            )}
          </div>
        }
      />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
