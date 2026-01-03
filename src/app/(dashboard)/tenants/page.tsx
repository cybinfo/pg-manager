"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, GroupConfig } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Plus,
  UserCheck,
  UserMinus,
  Clock,
  Layers,
  ChevronDown
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
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
  profile_photo: string | null
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

// Group by options - supports multi-select for nested grouping
const groupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "status", label: "Status" },
  { value: "room.room_number", label: "Room" },
]

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

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
      toast.error("Failed to load tenants")
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
      sortable: true,
      render: (tenant) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={tenant.name}
            src={tenant.profile_photo || tenant.photo_url}
            size="sm"
            className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
          />
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
      sortable: true,
      sortKey: "property.name",
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
      sortable: true,
      sortType: "number",
      render: (tenant) => (
        <span className="font-medium tabular-nums">{formatCurrency(tenant.monthly_rent)}</span>
      ),
    },
    {
      key: "check_in_date",
      header: "Since",
      width: "date",
      hideOnMobile: true,
      sortable: true,
      sortType: "date",
      render: (tenant) => formatDate(tenant.check_in_date),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      sortable: true,
      render: (tenant) => {
        const info = getStatusInfo(tenant.status)
        return <StatusDot status={info.status} label={info.label} />
      },
    },
  ]

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="tenants.view">
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Manage all your tenants across properties"
        icon={Users}
        breadcrumbs={[{ label: "Tenants" }]}
        actions={
          <Link href="/tenants/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </Link>
        }
      />

      {tenants.length > 0 && <MetricsBar items={metricsItems} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedGroups.length === 0
                ? "Group by..."
                : selectedGroups.length === 1
                  ? groupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGroupDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Group by (select order)
                  </p>
                </div>
                {groupByOptions.map((opt) => {
                  const isSelected = selectedGroups.includes(opt.value)
                  const orderIndex = selectedGroups.indexOf(opt.value)

                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, opt.value])
                          } else {
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  )
                })}
                {selectedGroups.length > 0 && (
                  <div className="border-t mt-1 pt-1 px-3 py-2">
                    <button
                      onClick={() => {
                        setSelectedGroups([])
                        setGroupDropdownOpen(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear grouping
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTenants}
        keyField="id"
        href={(tenant) => `/tenants/${tenant.id}`}
        searchable
        searchPlaceholder="Search by name, phone, property..."
        searchFields={["name", "phone"]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: groupByOptions.find(o => o.value === key)?.label
        })) : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tenants yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first tenant to start managing your PG
            </p>
            <Link href="/tenants/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </Link>
          </div>
        }
      />
    </div>
    </PermissionGuard>
  )
}
