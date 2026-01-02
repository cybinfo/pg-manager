"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import {
  UserPlus,
  Plus,
  Loader2,
  Clock,
  Users,
  Moon,
  Building2,
  Phone,
  LogOut,
  Calendar
} from "lucide-react"
import { toast } from "sonner"

interface Visitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  relation: string | null
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  overnight_charge: number | null
  created_at: string
  tenant: {
    id: string
    name: string
  }
  property: {
    id: string
    name: string
  }
}

interface Property {
  id: string
  name: string
}

export default function VisitorsPage() {
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchVisitors()
  }, [])

  const fetchVisitors = async () => {
    const supabase = createClient()

    // Fetch properties for filter
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    setProperties(propertiesData || [])

    const { data, error } = await supabase
      .from("visitors")
      .select(`
        *,
        tenant:tenants(id, name),
        property:properties(id, name)
      `)
      .order("check_in_time", { ascending: false })

    if (error) {
      console.error("Error fetching visitors:", error)
      toast.error("Failed to load visitors")
    } else {
      setVisitors(data || [])
    }
    setLoading(false)
  }

  const handleCheckOut = async (e: React.MouseEvent, visitorId: string) => {
    e.stopPropagation()
    const supabase = createClient()

    const { error } = await supabase
      .from("visitors")
      .update({ check_out_time: new Date().toISOString() })
      .eq("id", visitorId)

    if (error) {
      toast.error("Failed to check out visitor")
    } else {
      toast.success("Visitor checked out")
      fetchVisitors()
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ago`
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`
    }
    return `${diffMins}m ago`
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
        { value: "checked_in", label: "Currently Here" },
        { value: "checked_out", label: "Checked Out" },
        { value: "overnight", label: "Overnight" },
      ],
    },
    {
      id: "date",
      label: "Date",
      type: "date-range",
    },
  ]

  const filteredVisitors = visitors.filter((visitor) => {
    const isCheckedIn = !visitor.check_out_time

    if (filters.property && filters.property !== "all" && visitor.property?.id !== filters.property) {
      return false
    }
    if (filters.status && filters.status !== "all") {
      if (filters.status === "checked_in" && !isCheckedIn) return false
      if (filters.status === "checked_out" && isCheckedIn) return false
      if (filters.status === "overnight" && !visitor.is_overnight) return false
    }
    if (filters.date_from) {
      const visitDate = new Date(visitor.check_in_time)
      if (visitDate < new Date(filters.date_from)) return false
    }
    if (filters.date_to) {
      const visitDate = new Date(visitor.check_in_time)
      if (visitDate > new Date(filters.date_to)) return false
    }
    return true
  })

  // Stats
  const currentlyCheckedIn = visitors.filter((v) => !v.check_out_time).length
  const todayVisitors = visitors.filter((v) => {
    const today = new Date().toDateString()
    return new Date(v.check_in_time).toDateString() === today
  }).length
  const overnightVisitors = visitors.filter((v) => v.is_overnight && !v.check_out_time).length
  const totalThisMonth = visitors.filter((v) => {
    const now = new Date()
    const visitDate = new Date(v.check_in_time)
    return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear()
  }).length

  const metricsItems: MetricItem[] = [
    { label: "Currently Here", value: currentlyCheckedIn, icon: Users, highlight: currentlyCheckedIn > 0 },
    { label: "Today", value: todayVisitors, icon: Calendar },
    { label: "Overnight", value: overnightVisitors, icon: Moon },
    { label: "This Month", value: totalThisMonth, icon: UserPlus },
  ]

  const columns: Column<Visitor>[] = [
    {
      key: "visitor_name",
      header: "Visitor",
      width: "primary",
      render: (row) => {
        const isCheckedIn = !row.check_out_time
        return (
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isCheckedIn ? "bg-green-100" : "bg-gray-100"}`}>
              <Users className={`h-5 w-5 ${isCheckedIn ? "text-green-600" : "text-gray-600"}`} />
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {row.visitor_name}
                {row.is_overnight && (
                  <TableBadge variant="warning">Overnight</TableBadge>
                )}
              </div>
              {row.visitor_phone && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {row.visitor_phone}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: "tenant",
      header: "Visiting",
      width: "secondary",
      render: (row) => (
        <div>
          <div className="text-sm font-medium">{row.tenant?.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {row.property?.name}
          </div>
        </div>
      ),
    },
    {
      key: "check_in_time",
      header: "Check-in",
      width: "dateTime",
      render: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDateTime(row.check_in_time)}
          </div>
          {!row.check_out_time && (
            <div className="text-green-600 font-medium text-xs">
              {getTimeAgo(row.check_in_time)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (row) => {
        const isCheckedIn = !row.check_out_time
        return (
          <StatusDot
            status={isCheckedIn ? "success" : "muted"}
            label={isCheckedIn ? "Checked In" : "Checked Out"}
          />
        )
      },
    },
    {
      key: "actions",
      header: "",
      width: "actions",
      render: (row) => {
        const isCheckedIn = !row.check_out_time
        if (!isCheckedIn) return null
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleCheckOut(e, row.id)}
          >
            <LogOut className="mr-1 h-3 w-3" />
            Check Out
          </Button>
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
    <FeatureGuard feature="visitors">
      <PermissionGuard permission="visitors.view">
        <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description="Manage visitor check-ins and check-outs"
        icon={UserPlus}
        breadcrumbs={[{ label: "Visitors" }]}
        actions={
          <Link href="/dashboard/visitors/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Check In Visitor
            </Button>
          </Link>
        }
      />

      <MetricsBar items={metricsItems} />

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredVisitors}
        keyField="id"
        href={(row) => `/dashboard/visitors/${row.id}`}
        searchable
        searchPlaceholder="Search by visitor name, tenant, or phone..."
        searchFields={["visitor_name", "visitor_phone"] as (keyof Visitor)[]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No visitors found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {visitors.length === 0
                ? "No visitor records yet"
                : "No visitors match your search criteria"}
            </p>
            {visitors.length === 0 && (
              <Link href="/dashboard/visitors/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Check In First Visitor
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
