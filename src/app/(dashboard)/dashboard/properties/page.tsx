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
  Building2,
  Plus,
  Loader2,
  Home,
  Users,
  MapPin
} from "lucide-react"

interface Property {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  is_active: boolean
  created_at: string
  room_count?: number
  tenant_count?: number
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    const supabase = createClient()

    const { data: propertiesData, error } = await supabase
      .from("properties")
      .select(`
        *,
        rooms(id),
        tenants(id)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching properties:", error)
      setLoading(false)
      return
    }

    const transformedData = propertiesData?.map((property) => ({
      ...property,
      room_count: property.rooms?.length || 0,
      tenant_count: property.tenants?.length || 0,
    })) || []

    setProperties(transformedData)
    setLoading(false)
  }

  // Stats
  const totalRooms = properties.reduce((sum, p) => sum + (p.room_count || 0), 0)
  const totalTenants = properties.reduce((sum, p) => sum + (p.tenant_count || 0), 0)
  const activeProperties = properties.filter(p => p.is_active).length

  const metricsItems: MetricItem[] = [
    { label: "Properties", value: properties.length, icon: Building2 },
    { label: "Active", value: activeProperties, icon: Building2 },
    { label: "Total Rooms", value: totalRooms, icon: Home },
    { label: "Total Tenants", value: totalTenants, icon: Users },
  ]

  // Get unique cities and states for filters
  const uniqueCities = [...new Set(properties.map(p => p.city).filter(Boolean))].sort()
  const uniqueStates = [...new Set(properties.map(p => p.state).filter(Boolean))].sort()

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "city",
      label: "City",
      type: "select",
      placeholder: "All Cities",
      options: uniqueCities.map(c => ({ value: c, label: c })),
    },
    {
      id: "state",
      label: "State",
      type: "select",
      placeholder: "All States",
      options: uniqueStates.map(s => ({ value: s as string, label: s as string })),
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ]

  // Apply filters
  const filteredProperties = properties.filter((property) => {
    if (filters.city && filters.city !== "all" && property.city !== filters.city) {
      return false
    }
    if (filters.state && filters.state !== "all" && property.state !== filters.state) {
      return false
    }
    if (filters.status && filters.status !== "all") {
      const isActive = filters.status === "active"
      if (property.is_active !== isActive) return false
    }
    return true
  })

  const columns: Column<Property>[] = [
    {
      key: "name",
      header: "Property",
      width: "primary",
      render: (property) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium">{property.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {property.city}{property.state && `, ${property.state}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "room_count",
      header: "Rooms",
      width: "count",
      render: (property) => (
        <div className="flex items-center gap-1.5">
          <Home className="h-4 w-4 text-muted-foreground" />
          <span>{property.room_count}</span>
        </div>
      ),
    },
    {
      key: "tenant_count",
      header: "Tenants",
      width: "count",
      render: (property) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{property.tenant_count}</span>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      width: "status",
      hideOnMobile: true,
      render: (property) => (
        <StatusDot
          status={property.is_active ? "success" : "muted"}
          label={property.is_active ? "Active" : "Inactive"}
        />
      ),
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
        title="Properties"
        description="Manage your PG properties and buildings"
        icon={Building2}
        actions={
          <Link href="/dashboard/properties/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        }
      />

      {properties.length > 0 && <MetricsBar items={metricsItems} />}

      {/* Filters */}
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredProperties}
        keyField="id"
        href={(property) => `/dashboard/properties/${property.id}`}
        searchable
        searchPlaceholder="Search by property name, city..."
        searchFields={["name", "city"]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {properties.length === 0
                ? "Add your first property to get started"
                : "No properties match your filters"}
            </p>
            {properties.length === 0 && (
              <Link href="/dashboard/properties/new">
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </Link>
            )}
          </div>
        }
      />
    </div>
  )
}
