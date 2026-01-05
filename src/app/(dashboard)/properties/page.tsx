/**
 * Properties List Page (Refactored)
 *
 * BEFORE: 250 lines of code
 * AFTER: ~110 lines of code (56% reduction)
 */

"use client"

import { Building2, Home, Users, MapPin } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PROPERTY_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"

// ============================================
// Types
// ============================================

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

// ============================================
// Column Definitions
// ============================================

const columns: Column<Property>[] = [
  {
    key: "name",
    header: "Property",
    width: "primary",
    sortable: true,
    render: (property) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium">{property.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {property.city}
            {property.state && `, ${property.state}`}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "room_count",
    header: "Rooms",
    width: "count",
    sortable: true,
    sortType: "number",
    render: (property) => (
      <div className="flex items-center gap-1.5">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span>{property.room_count || 0}</span>
      </div>
    ),
  },
  {
    key: "tenant_count",
    header: "Tenants",
    width: "count",
    sortable: true,
    sortType: "number",
    render: (property) => (
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{property.tenant_count || 0}</span>
      </div>
    ),
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    hideOnMobile: true,
    sortable: true,
    render: (property) => (
      <StatusDot
        status={property.is_active ? "success" : "muted"}
        label={property.is_active ? "Active" : "Inactive"}
      />
    ),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "city",
    label: "City",
    type: "select",
    placeholder: "All Cities",
  },
  {
    id: "state",
    label: "State",
    type: "select",
    placeholder: "All States",
  },
  {
    id: "is_active",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Property>[] = [
  {
    id: "total",
    label: "Properties",
    icon: Building2,
    compute: (items) => items.length,
  },
  {
    id: "active",
    label: "Active",
    icon: Building2,
    compute: (items) => items.filter((p) => p.is_active).length,
  },
  {
    id: "total_rooms",
    label: "Total Rooms",
    icon: Home,
    compute: (items) => items.reduce((sum, p) => sum + (p.room_count || 0), 0),
  },
  {
    id: "total_tenants",
    label: "Total Tenants",
    icon: Users,
    compute: (items) => items.reduce((sum, p) => sum + (p.tenant_count || 0), 0),
  },
]

// ============================================
// Page Component
// ============================================

export default function PropertiesPage() {
  return (
    <ListPageTemplate
      title="Properties"
      description="Manage your PG properties and buildings"
      icon={Building2}
      permission="properties.view"
      config={PROPERTY_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by property name, city..."
      createHref="/properties/new"
      createLabel="Add Property"
      createPermission="properties.create"
      detailHref={(property) => `/properties/${property.id}`}
      emptyTitle="No properties found"
      emptyDescription="Add your first property to get started"
    />
  )
}
