"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import {
  Users,
  Plus,
  Loader2,
  UserCheck,
  UserMinus,
  Clock
} from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  property: {
    id: string
    name: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
}

interface Property {
  id: string
  name: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    // Fetch properties for filter
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    setProperties(propertiesData || [])

    // Fetch tenants
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        property:properties(id, name),
        room:rooms(id, room_number)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tenants:", error)
      setLoading(false)
      return
    }

    const transformedData = ((data as RawTenant[]) || []).map((tenant) => ({
      ...tenant,
      property: tenant.property && tenant.property.length > 0 ? tenant.property[0] : null,
      room: tenant.room && tenant.room.length > 0 ? tenant.room[0] : null,
    }))
    setTenants(transformedData)
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusInfo = (status: string): { status: "success" | "warning" | "muted"; label: string } => {
    switch (status) {
      case "active":
        return { status: "success", label: "Active" }
      case "notice_period":
        return { status: "warning", label: "Notice" }
      case "checked_out":
        return { status: "muted", label: "Moved Out" }
      default:
        return { status: "muted", label: status }
    }
  }

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
        { value: "active", label: "Active" },
        { value: "notice_period", label: "Notice Period" },
        { value: "checked_out", label: "Moved Out" },
      ],
    },
    {
      id: "date",
      label: "Check-in Date",
      type: "date-range",
    },
  ]

  // Apply filters
  const filteredTenants = tenants.filter((tenant) => {
    if (filters.property && filters.property !== "all" && tenant.property?.id !== filters.property) {
      return false
    }
    if (filters.status && filters.status !== "all" && tenant.status !== filters.status) {
      return false
    }
    if (filters.date_from) {
      const checkIn = new Date(tenant.check_in_date)
      if (checkIn < new Date(filters.date_from)) return false
    }
    if (filters.date_to) {
      const checkIn = new Date(tenant.check_in_date)
      if (checkIn > new Date(filters.date_to)) return false
    }
    return true
  })

  // Stats (based on all tenants, not filtered)
  const activeTenants = tenants.filter(t => t.status === "active").length
  const noticePeriod = tenants.filter(t => t.status === "notice_period").length
  const movedOut = tenants.filter(t => t.status === "checked_out").length
  const totalRent = tenants.filter(t => t.status === "active").reduce((sum, t) => sum + t.monthly_rent, 0)

  const metricsItems: MetricItem[] = [
    { label: "Total", value: tenants.length, icon: Users },
    { label: "Active", value: activeTenants, icon: UserCheck },
    { label: "Notice Period", value: noticePeriod, icon: Clock, highlight: noticePeriod > 0 },
    { label: "Moved Out", value: movedOut, icon: UserMinus },
    { label: "Monthly Rent", value: formatCurrency(totalRent) },
  ]

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      header: "Tenant",
      width: "primary",
      render: (tenant) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{tenant.name}</div>
            <div className="text-xs text-muted-foreground">{tenant.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "property",
      header: "Property / Room",
      width: "secondary",
      render: (tenant) => (
        <div className="text-sm min-w-0">
          <div className="truncate">{tenant.property?.name || "—"}</div>
          <div className="text-muted-foreground text-xs">Room {tenant.room?.room_number || "—"}</div>
        </div>
      ),
    },
    {
      key: "monthly_rent",
      header: "Rent",
      width: "amount",
      render: (tenant) => (
        <span className="font-medium tabular-nums">{formatCurrency(tenant.monthly_rent)}</span>
      ),
    },
    {
      key: "check_in_date",
      header: "Since",
      width: "date",
      hideOnMobile: true,
      render: (tenant) => formatDate(tenant.check_in_date),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (tenant) => {
        const info = getStatusInfo(tenant.status)
        return <StatusDot status={info.status} label={info.label} />
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
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Manage all your tenants across properties"
        icon={Users}
        actions={
          <Link href="/dashboard/tenants/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </Link>
        }
      />

      {tenants.length > 0 && <MetricsBar items={metricsItems} />}

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredTenants}
        keyField="id"
        href={(tenant) => `/dashboard/tenants/${tenant.id}`}
        searchable
        searchPlaceholder="Search by name, phone, property..."
        searchFields={["name", "phone"]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tenants yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first tenant to start managing your PG
            </p>
            <Link href="/dashboard/tenants/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
