/**
 * Properties List Page (Refactored)
 *
 * BEFORE: 250 lines of code
 * AFTER: ~110 lines of code (56% reduction)
 */

"use client"

import { Building2, Home, Users, MapPin, Phone } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PROPERTY_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { formatDate } from "@/lib/format"

// ============================================
// Types
// ============================================

interface Property {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  property_type: string
  total_floors: number | null
  manager_name: string | null
  manager_phone: string | null
  website_enabled: boolean
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
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true, minLength: 2 },
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
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
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "boolean",
    render: (property) => (
      <StatusDot
        status={property.is_active ? "success" : "muted"}
        label={property.is_active ? "Active" : "Inactive"}
      />
    ),
  },
  // Hidden by default columns
  {
    key: "address",
    header: "Address",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (property) => property.address || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pincode",
    header: "Pincode",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (property) => property.pincode || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "property_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (property) => (
      <span className="capitalize">{property.property_type || "PG"}</span>
    ),
  },
  {
    key: "total_floors",
    header: "Floors",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.total_floors || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.phone || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "email",
    header: "Email",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.email || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "manager_name",
    header: "Manager",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.manager_name ? (
      <div>
        <div>{property.manager_name}</div>
        {property.manager_phone && (
          <div className="text-xs text-muted-foreground">{property.manager_phone}</div>
        )}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "website_enabled",
    header: "Website",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (property) => (
      <StatusDot
        status={property.website_enabled ? "success" : "muted"}
        label={property.website_enabled ? "Enabled" : "Disabled"}
      />
    ),
  },
  {
    key: "created_at",
    header: "Added On",
    width: "date",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: false,
    render: (property) => formatDate(property.created_at),
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
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Property Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "city",
    header: "City",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts"],
  },
  {
    key: "is_active",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Property>[] = [
  {
    id: "total",
    label: "Properties",
    icon: Building2,
    compute: (_items, total) => total,  // Use server total for accurate count
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
      tableKey="properties"
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
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      createHref="/properties/new"
      createLabel="Add Property"
      createPermission="properties.create"
      detailHref={(property) => `/properties/${property.id}`}
      emptyTitle="No properties found"
      emptyDescription="Add your first property to get started"
    />
  )
}
